import { Test, TestingModule } from "@nestjs/testing";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSessionService = {
  startSession: vi.fn(),
  getSession: vi.fn(),
  saveAnswer: vi.fn(),
};

describe("SessionController", () => {
  let controller: SessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    }).compile();
    controller = module.get<SessionController>(SessionController);
  });

  it("startSession delegates to service", async () => {
    const expected = { sessionId: "abc", currentScreen: 1 };
    mockSessionService.startSession.mockResolvedValue(expected);
    const result = await controller.startSession();
    expect(result).toEqual(expected);
    expect(mockSessionService.startSession).toHaveBeenCalledOnce();
  });

  it("getSession delegates to service with id", async () => {
    const expected = { sessionId: "abc", currentScreen: 3 };
    mockSessionService.getSession.mockResolvedValue(expected);
    const result = await controller.getSession("abc");
    expect(result).toEqual(expected);
    expect(mockSessionService.getSession).toHaveBeenCalledWith("abc");
  });

  it("saveAnswer delegates to service", async () => {
    const dto = { sessionId: "abc", screenId: 1, value: 35 };
    const expected = { done: false, nextScreen: 2 };
    mockSessionService.saveAnswer.mockResolvedValue(expected);
    const result = await controller.saveAnswer(dto as any);
    expect(result).toEqual(expected);
    expect(mockSessionService.saveAnswer).toHaveBeenCalledWith("abc", 1, 35);
  });
});
