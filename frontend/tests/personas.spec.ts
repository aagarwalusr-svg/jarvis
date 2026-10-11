import { test, expect } from "@playwright/test";

test("both childhood personas render, controls work, and exported cast is complete", async ({
  page,
}) => {
  await page.goto("/personas");
  await expect(
    page.getByRole("heading", { name: "Julian Newman", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "happy", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Julian Newman/ }),
  ).toHaveAttribute("aria-label", /Julian Newman.*happy front/);
  await page.getByLabel("Profile study").check();
  await expect(
    page.getByRole("img", { name: /Julian Newman/ }),
  ).toHaveAttribute("aria-label", /happy profile/);
  await page.getByRole("button", { name: /Jaden Newman/ }).click();
  await expect(
    page.getByRole("heading", { name: "Jaden Newman", exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export both personas" }).click();
  const file = await downloaded;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const cast = JSON.parse(Buffer.concat(chunks).toString());
  expect(cast.characters.map((c: { id: string }) => c.id)).toEqual([
    "julian",
    "jaden",
  ]);
  expect(cast.characters[0].system_prompt).toContain("fictionalized");
  await page.screenshot({
    path: "/tmp/newman-character-studio.png",
    fullPage: true,
  });
});

test("dialogue preview displays the selected persona's mocked AI response", async ({
  page,
}) => {
  await page.route("**/api/personas/jaden/preview", (route) =>
    route.fulfill({
      json: {
        character: "Jaden Newman",
        reply: "My turn! Watch this one.",
        fictional: true,
      },
    }),
  );
  await page.goto("/personas");
  await page.getByRole("button", { name: /Jaden Newman/ }).click();
  await page
    .getByRole("button", { name: "Preview character dialogue" })
    .click();
  await expect(page.getByText("AI-generated fictional dialogue")).toBeVisible();
  await expect(page.locator(".dialogue-panel blockquote")).toContainText(
    "My turn! Watch this one.",
  );
});
