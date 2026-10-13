import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const waitSaved = (page: Page) => expect(page.getByRole("status").filter({ hasText: /Saved · v\d/ }).first()).toBeVisible({ timeout: 10_000 });

test("visitor builds a brand from the landing page through to an exported kit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your idea");
  await page.getByRole("link", { name: "Build Your Brand" }).first().click();
  await expect(page).toHaveURL(/\/projects\/new$/);

  // No account: the visitor starts typing immediately.
  await page.getByLabel("Describe your business idea").fill("A refill-only stationery brand for design students, sold on campus and online.");
  await page.getByRole("button", { name: /Add a little more detail/ }).click();
  await page.getByLabel("Working name").fill("Nib");
  await page.getByRole("button", { name: /Start the brief/ }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/discover$/);
  const projectUrl = page.url().replace(/\/discover$/, "");

  // Approval is blocked until the brief is complete.
  await expect(page.getByRole("button", { name: /Approve/ })).toBeDisabled();
  await page.getByLabel("Industry").fill("Stationery");
  await page.getByRole("button", { name: /The people/ }).click();
  await page.getByLabel("Audience").fill("Design students in Pune who go through a lot of pens.");
  await page.getByLabel("Customer problem").fill("Supplies are disposable and generic.");
  await page.getByRole("button", { name: /The character/ }).click();
  await page.getByRole("button", { name: "+ Bold" }).click();
  await waitSaved(page);
  await page.getByRole("button", { name: /Approve v/ }).click();
  await expect(page.getByText(/Approved v\d/).first()).toBeVisible();

  // Write a positioning by hand and approve it.
  await page.getByRole("navigation", { name: "Workflow stages" }).getByRole("link", { name: "Position" }).click();
  await page.getByRole("button", { name: "Write my own" }).click();
  await page.locator("#f-statement").fill("For design students who hate waste, Nib is the refill-first stationery brand.");
  await waitSaved(page);
  await page.getByRole("button", { name: /Approve v/ }).click();
  await expect(page.getByText(/Approved v\d/).first()).toBeVisible();

  // Changing the approved brief flags positioning instead of rewriting it.
  await page.goto(`${projectUrl}/discover`);
  await page.getByRole("button", { name: /The idea/ }).click();
  await page.getByLabel("Industry").fill("Stationery & paper goods");
  await waitSaved(page);
  await page.goto(`${projectUrl}/position`);
  await expect(page.getByText(/Needs review: Brand brief changed/)).toBeVisible();
  await expect(page.locator("#f-statement")).toHaveValue(/refill-first stationery brand/);
  await page.getByRole("button", { name: "Still valid" }).click();
  await expect(page.getByText(/Needs review/)).toHaveCount(0);

  // Export a real file and check its content.
  await page.goto(`${projectUrl}/brand-kit`);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Strategy document" }).click()]);
  const text = readFileSync((await download.path())!, "utf8");
  expect(text).toContain("# Nib — Brand strategy");
  expect(text).toContain("refill-first stationery brand");
  await expect(page.getByText(/verified/)).toBeVisible();

  // Data persists across a reload.
  await page.goto(`${projectUrl}/discover`);
  await page.reload();
  await expect(page.getByLabel("Live brand brief")).toContainText("Stationery & paper goods");

  // Claiming the guest workspace keeps the project.
  await page.goto("/auth?mode=register");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: /Create account/ }).last().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: /Nib/ }).first()).toBeVisible();
});

test("demo opens without an account and the studio redraws from tokens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore a Demo" }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("KORA");

  await page.getByRole("navigation", { name: "Workflow stages" }).getByRole("link", { name: "Visualize" }).click();
  const canvasSvg = page.locator("figure").first().locator("svg").first();
  await expect(canvasSvg).toBeVisible();
  await page.getByLabel("accent hex value").fill("#FF0055");
  await expect(canvasSvg.locator('path[fill="#FF0055"]')).toHaveCount(1);
  await waitSaved(page);
  await page.reload();
  await expect(page.getByLabel("accent hex value")).toHaveValue("#FF0055");
});

test("protected routes redirect and unknown projects 404", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\?next=%2Fdashboard/);
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await page.goto("/projects/does-not-exist");
  await expect(page.getByText("Nothing cast here.")).toBeVisible();
});
