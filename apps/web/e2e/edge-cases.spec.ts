import { test, expect } from "@playwright/test";
import * as h from "./helpers";

test("edge: Hypertensive Crisis + Normal BP both checked → Clinical Review", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-screening-btn").click();
  await h.fillScreen1(page, 35);
  await h.fillScreen2(page, 90);
  await h.fillScreen3(page, 170);
  await h.waitForBMI(page);
  await h.fillScreen5Pregnant(page, "No");
  await h.skipCheckbox(page);
  await h.fillRadio(page, "radio-option-no");
  await h.fillCheckbox(page, [
    "checkbox-option-normal-----120-80-",
    "checkbox-option-hypertensive-crisis---180---120-",
  ]);
  await h.skipCheckbox(page);
  await h.fillRadio(page, "radio-option-no");
  await h.fillRadio(page, "radio-option-never");
  await h.fillRadio(page, "radio-option-moderate--3-4x-week-");
  await h.skipCheckbox(page);
  await page.waitForURL("/form/result");
  await expect(page.getByTestId("result-requires-clinical-review")).toBeVisible();
});
