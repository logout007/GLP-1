import { test, expect } from "@playwright/test";
import * as h from "./helpers";

test("mid-flow refresh: lands back on Screen 7 with prior answers intact", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-screening-btn").click();
  await page.waitForURL("/form");

  await h.fillScreen1(page, 35);
  await h.fillScreen2(page, 90);
  await h.fillScreen3(page, 170);
  await h.waitForBMI(page);
  await h.fillScreen5Pregnant(page, "No");
  await h.skipCheckbox(page);

  await expect(page.getByTestId("progress-bar")).toBeVisible();
  await page.reload();
  await page.waitForURL("/form");

  const progressBar = page.getByTestId("progress-bar");
  await expect(progressBar).toBeVisible();
  await expect(progressBar).toHaveAttribute("aria-valuenow", "7");

  await h.fillRadio(page, "radio-option-no");
});
