import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { evaluateEligibility, computeBMI } from "../evaluator/evaluator";
import type { FormAnswers } from "../evaluator/evaluator.types";
import formSchema from "../form-schema/form-schema.json";

// TODO: Add rate limiting middleware (e.g., @nestjs/throttler) to prevent abuse.
// Recommended: ThrottlerModule.forRoot({ ttl: 60, limit: 30 }) for 30 requests/minute per IP.
// Apply @Throttle() decorator on session endpoints to prevent brute-force or DoS attacks.

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitize user input to prevent XSS and injection attacks.
   * Strips HTML tags and trims whitespace from string values.
   */
  private sanitizeValue(value: unknown): unknown {
    if (typeof value === "string") {
      // Strip HTML tags and trim whitespace to prevent XSS
      return value.replace(/<[^>]*>/g, "").trim();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeValue(v));
    }
    return value;
  }

  async startSession() {
    const session = await this.prisma.session.create({
      data: { currentScreen: 1 },
    });
    const firstScreen = formSchema.screens.find((s) => s.id === 1)!;
    return {
      sessionId: session.id,
      currentScreen: 1,
      screen: firstScreen,
    };
  }

  async getSession(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { answers: true },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);

    const currentScreenDef = formSchema.screens.find((s) => s.id === session.currentScreen);
    return {
      sessionId: session.id,
      currentScreen: session.currentScreen,
      isComplete: session.isComplete,
      result: session.result,
      resultReason: session.resultReason,
      answers: session.answers,
      screen: currentScreenDef ?? null,
    };
  }

  async saveAnswer(sessionId: string, screenId: number, value: unknown) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.isComplete) throw new BadRequestException("Session is already complete");

    // Sanitize user input before processing
    const sanitizedValue = this.sanitizeValue(value);

    // Validate the answer against the schema
    this.validateAnswer(screenId, sanitizedValue);

    // Upsert the answer for this screen
    await this.prisma.answer.upsert({
      where: { sessionId_screenId: { sessionId, screenId } },
      create: { sessionId, screenId, value: sanitizedValue as any },
      update: { value: sanitizedValue as any },
    });

    // Reload all answers
    const allAnswers = await this.prisma.answer.findMany({ where: { sessionId } });
    const answerMap = Object.fromEntries(allAnswers.map((a) => [a.screenId, a.value]));

    // Determine next screen based on branching
    const nextResult = this.resolveNextScreen(screenId, sanitizedValue, answerMap);

    if (nextResult.type === "end") {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          isComplete: true,
          result: nextResult.result,
          resultReason: nextResult.reason,
          currentScreen: screenId,
        },
      });
      return {
        done: true,
        result: nextResult.result,
        reason: nextResult.reason,
      };
    }

    // If next screen is 15, run evaluation
    if (nextResult.screen === 15) {
      const formAnswers = this.buildFormAnswers(answerMap, sanitizedValue, screenId);
      const evaluation = evaluateEligibility(formAnswers);
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          isComplete: true,
          result: evaluation.result,
          resultReason: evaluation.reason,
          currentScreen: 15,
        },
      });
      return {
        done: true,
        result: evaluation.result,
        reason: evaluation.reason,
      };
    }

    // Advance to next screen
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { currentScreen: nextResult.screen },
    });

    const nextScreenDef = formSchema.screens.find((s) => s.id === nextResult.screen);
    return {
      done: false,
      nextScreen: nextResult.screen,
      screen: nextScreenDef,
    };
  }

  private validateAnswer(screenId: number, value: unknown): void {
    const screenDef = formSchema.screens.find((s) => s.id === screenId);
    if (!screenDef) {
      throw new BadRequestException(`Unknown screen: ${screenId}`);
    }

    switch (screenDef.inputType) {
      case "number": {
        if (typeof value !== "number" || isNaN(value)) {
          throw new BadRequestException(
            `Screen "${screenDef.title}" requires a numeric value.`
          );
        }
        if (value < 0) {
          throw new BadRequestException(
            `Screen "${screenDef.title}": value cannot be negative.`
          );
        }
        // Age must be an integer
        if (screenDef.title === "Age" && !Number.isInteger(value)) {
          throw new BadRequestException(
            `Screen "${screenDef.title}": value must be a whole number.`
          );
        }
        const validation = (screenDef as any).validation;
        if (validation) {
          if (validation.min !== undefined && value < validation.min) {
            throw new BadRequestException(
              `Screen "${screenDef.title}": value must be at least ${validation.min}.`
            );
          }
          if (validation.max !== undefined && value > validation.max) {
            throw new BadRequestException(
              `Screen "${screenDef.title}": value must be at most ${validation.max}.`
            );
          }
        }
        break;
      }

      case "radio": {
        if (typeof value !== "string") {
          throw new BadRequestException(
            `Screen "${screenDef.title}" requires a string value.`
          );
        }
        const radioOptions = (screenDef as any).options as string[];
        if (!radioOptions.includes(value)) {
          throw new BadRequestException(
            `Screen "${screenDef.title}": "${value}" is not a valid option. Valid options: ${radioOptions.join(", ")}.`
          );
        }
        break;
      }

      case "checkbox": {
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Screen "${screenDef.title}" requires an array of selected options.`
          );
        }
        const checkboxOptions = (screenDef as any).options as string[];
        const invalidValues = (value as string[]).filter(
          (v) => !checkboxOptions.includes(v)
        );
        if (invalidValues.length > 0) {
          throw new BadRequestException(
            `Screen "${screenDef.title}": invalid option(s): ${invalidValues.join(", ")}. Valid options: ${checkboxOptions.join(", ")}.`
          );
        }
        const allowEmpty = (screenDef as any).allowEmpty ?? false;
        const minSelect = (screenDef as any).minSelect ?? 1;
        if (!allowEmpty && (value as string[]).length < minSelect) {
          throw new BadRequestException(
            `Screen "${screenDef.title}": at least ${minSelect} option(s) must be selected.`
          );
        }
        break;
      }

      case "computed":
      case "evaluation":
        // These screens don't accept user input directly
        break;

      default:
        break;
    }
  }

  private resolveNextScreen(
    screenId: number,
    value: unknown,
    answerMap: Record<number, unknown>
  ): { type: "next"; screen: number } | { type: "end"; result: string; reason: string } {
    switch (screenId) {
      case 1: {
        const age = value as number;
        if (age < 18) return { type: "end", result: "Ineligible", reason: "Underage" };
        if (age > 75) return { type: "end", result: "Requires Clinical Review", reason: "Age Over 75" };
        return { type: "next", screen: 2 };
      }
      case 2:
        return { type: "next", screen: 3 };
      case 3: {
        const weight = answerMap[2] as number;
        const height = value as number;
        const bmi = computeBMI(weight, height);
        if (bmi < 25) return { type: "end", result: "Ineligible", reason: "BMI Too Low" };
        if (bmi >= 40) return { type: "end", result: "Requires Clinical Review", reason: "High BMI" };
        return { type: "next", screen: 4 };
      }
      case 4:
        return { type: "next", screen: 5 };
      case 5: {
        const pregnant = value as string;
        if (pregnant === "Yes") return { type: "end", result: "Ineligible", reason: "Pregnancy Contraindication" };
        return { type: "next", screen: 6 };
      }
      case 6:
        return { type: "next", screen: 7 };
      case 7: {
        const hasDiabetes = value as string;
        return { type: "next", screen: hasDiabetes === "Yes" ? 8 : 9 };
      }
      case 8: {
        const hba1c = value as number;
        if (hba1c > 9.0) return { type: "end", result: "Ineligible", reason: "Uncontrolled Diabetes" };
        return { type: "next", screen: 9 };
      }
      case 9:
        return { type: "next", screen: 10 };
      case 10: {
        const meds = value as string[];
        if (meds.includes("GLP-1 receptor agonist")) {
          return { type: "end", result: "Requires Clinical Review", reason: "Already On GLP-1 Therapy" };
        }
        return { type: "next", screen: 11 };
      }
      case 11:
        return { type: "next", screen: 12 };
      case 12:
        return { type: "next", screen: 13 };
      case 13:
        return { type: "next", screen: 14 };
      case 14:
        return { type: "next", screen: 15 };
      default:
        throw new BadRequestException(`Unknown screen: ${screenId}`);
    }
  }

  private buildFormAnswers(
    answerMap: Record<number, unknown>,
    latestValue: unknown,
    latestScreenId: number
  ): FormAnswers {
    const map = { ...answerMap, [latestScreenId]: latestValue };
    const weight = map[2] as number;
    const height = map[3] as number;
    return {
      age: map[1] as number,
      weight,
      height,
      bmi: computeBMI(weight, height),
      pregnant: map[5] as "Yes" | "No",
      comorbidConditions: (map[6] as string[]) ?? [],
      hasDiabetes: map[7] as "Yes" | "No",
      hba1c: map[8] as number | undefined,
      bloodPressure: (map[9] as string[]) ?? [],
      medications: (map[10] as string[]) ?? [],
      smokingStatus: map[11] as "Yes" | "No",
      alcoholFrequency: map[12] as FormAnswers["alcoholFrequency"],
      activityLevel: map[13] as FormAnswers["activityLevel"],
      dietaryHabits: (map[14] as string[]) ?? [],
    };
  }
}
