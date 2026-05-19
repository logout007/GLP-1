import { Page } from "@playwright/test";

export async function fillScreen1(page: Page, age: number) {
  await page.getByTestId("number-input-screen-1").fill(String(age));
  await page.getByTestId("next-btn").click();
}
export async function fillScreen2(page: Page, weight: number) {
  await page.getByTestId("number-input-screen-2").fill(String(weight));
  await page.getByTestId("next-btn").click();
}
export async function fillScreen3(page: Page, height: number) {
  await page.getByTestId("number-input-screen-3").fill(String(height));
  await page.getByTestId("next-btn").click();
}
export async function waitForBMI(page: Page) {
  await page.getByTestId("bmi-result").waitFor({ state: "visible" });
  await page.waitForTimeout(2500);
}
export async function fillScreen5Pregnant(page: Page, value: "Yes" | "No") {
  await page.getByTestId(`radio-option-${value.toLowerCase()}`).click();
  await page.getByTestId("next-btn").click();
}
export async function skipCheckbox(page: Page) {
  await page.getByTestId("next-btn").click();
}
export async function fillRadio(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await page.getByTestId("next-btn").click();
}
export async function fillCheckbox(page: Page, testIds: string[]) {
  for (const id of testIds) {
    await page.getByTestId(id).click();
  }
  await page.getByTestId("next-btn").click();
}
