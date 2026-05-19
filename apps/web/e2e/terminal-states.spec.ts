import { test, expect } from "@playwright/test";
import * as h from "./helpers";

test("terminal: Underage → Ineligible", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-screening-btn").click();
  await h.fillScreen1(page, 16);
  await page.waitForURL("/form/result");
  await expect(page.getByTestId("result-ineligible")).toBeVisible();
  await expect(page.getByTestId("result-reason")).toContainText("Underage");
});

test("terminal: Pregnant → Ineligible", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-screening-btn").click();
  await h.fillScreen1(page, 30);
  await h.fillScreen2(page, 90);
  await h.fillScreen3(page, 165);
  await h.waitForBMI(page);
  await h.fillScreen5Pregnant(page, "Yes");
  await page.waitForURL("/form/result");
  await expect(page.getByTestId("result-ineligible")).toBeVisible();
  await expect(page.getByTestId("result-reason")).toContainText("Pregnancy");
});

test("terminal: Already on GLP-1 → Clinical Review", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-screening-btn").click();
  await h.fillScreen1(page, 40);
  await h.fillScreen2(page, 95);
  await h.fillScreen3(page, 170);
  await h.waitForBMI(page);
  await h.fillScreen5Pregnant(page, "No");
  await h.skipCheckbox(page);
  await h.fillRadio(page, "radio-option-no");
  await h.fillCheckbox(page, ["checkbox-option-normal-----120-80-"]);
  await h.fillCheckbox(page, ["checkbox-option-glp-1-receptor-agonist"]);
  await page.waitForURL("/form/result");
  await expect(page.getByTestId("result-requires-clinical-review")).toBeVisible();
});
