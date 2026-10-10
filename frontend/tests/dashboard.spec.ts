import { test, expect } from "@playwright/test";

test("dashboard renders holographic core and provider settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("SYSTEM ONLINE", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Good to have you back, Operator." }),
  ).toBeVisible();
  await expect(page.locator(".core-canvas canvas")).toBeVisible();
  await page.screenshot({ path: "/tmp/jarvis-dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Groq Key/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Model", exact: true }),
  ).toHaveValue("llama-3.3-70b-versatile");
  await page.reload();
  await expect(
    page.getByText("llama-3.3-70b-versatile", { exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("tasks and memories persist and can be removed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SYSTEM ONLINE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  const title = `Browser task ${Date.now()}`;
  await page.getByRole("textbox", { name: "New task" }).fill(title);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Complete ${title}` }).click();
  await expect(
    page.getByRole("button", { name: `Reopen ${title}` }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Tasks/ }).click();
  await expect(
    page.getByRole("button", { name: `Reopen ${title}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  const note = `Browser memory ${Date.now()}`;
  await page.getByRole("textbox", { name: "New memory" }).fill(note);
  await page.getByRole("button", { name: "Add memory" }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete memory" }).last().click();
  await expect(page.getByText(note, { exact: true })).toHaveCount(0);
});

test("real websocket preserves user message and shows missing-key error", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SYSTEM ONLINE", { exact: true })).toBeVisible();
  const prompt = `Browser chat ${Date.now()}`;
  await page.getByRole("textbox", { name: "Message JARVIS" }).fill(prompt);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "API key is missing",
    { timeout: 15000 },
  );
  await expect(page.locator(".message.user")).toContainText(prompt);
  await page.reload();
  await page
    .locator(".history-row")
    .filter({ hasText: prompt })
    .getByRole("button", { name: prompt, exact: true })
    .click();
  await expect(page.locator(".message.user")).toContainText(prompt);
  await page.getByRole("button", { name: `Delete ${prompt}` }).click();
  await expect(
    page.locator(".history-row").filter({ hasText: prompt }),
  ).toHaveCount(0);
});

test("assistant response renders with mocked provider transport", async ({
  page,
}) => {
  await page.routeWebSocket("**/ws/chat/**", (ws) => {
    ws.onMessage((raw) => {
      const data = JSON.parse(String(raw));
      if ("token" in data) ws.send(JSON.stringify({ type: "ready" }));
      else {
        ws.send(
          JSON.stringify({
            type: "message",
            message: { id: "u1", role: "user", content: data.content },
          }),
        );
        ws.send(JSON.stringify({ type: "thinking" }));
        ws.send(
          JSON.stringify({
            type: "message",
            message: {
              id: "a1",
              role: "assistant",
              content: "At your service, Operator.",
            },
          }),
        );
        ws.send(JSON.stringify({ type: "done" }));
      }
    });
  });
  await page.goto("/");
  await expect(page.getByText("SYSTEM ONLINE", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message JARVIS" })
    .fill("Mocked browser response check");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "At your service, Operator.",
  );
  await expect(page.locator(".thinking")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Delete Mocked browser response check" })
    .click();
});

test("mobile navigation is usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Intelligence configuration" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/jarvis-mobile.png", fullPage: true });
});

test("voice dictation requires review and speech output reads replies", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { spoken: string[] };
    state.spoken = [];
    Object.defineProperty(window, "SpeechRecognition", {
      value: class {
        onresult: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          this.onresult?.({
            results: [[{ transcript: "Voice review check" }]],
          });
          this.onend?.();
        }
        stop() {
          this.onend?.();
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        speak(utterance: SpeechSynthesisUtterance) {
          state.spoken.push(utterance.text);
        },
      },
    });
  });
  await page.routeWebSocket("**/ws/chat/**", (ws) => {
    ws.onMessage((raw) => {
      const data = JSON.parse(String(raw));
      if ("token" in data) ws.send(JSON.stringify({ type: "ready" }));
      else {
        ws.send(
          JSON.stringify({
            type: "message",
            message: { id: "vu1", role: "user", content: data.content },
          }),
        );
        ws.send(
          JSON.stringify({
            type: "message",
            message: {
              id: "va1",
              role: "assistant",
              content: "Voice reply check",
            },
          }),
        );
        ws.send(JSON.stringify({ type: "done" }));
      }
    });
  });
  await page.goto("/");
  await expect(page.getByText("SYSTEM ONLINE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enable speech output" }).click();
  await page
    .getByRole("button", { name: "Voice command", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message JARVIS" }),
  ).toHaveValue("Voice review check");
  await expect(page.locator(".message.user")).toHaveCount(0);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "Voice reply check",
  );
  expect(
    await page.evaluate(
      () => (window as typeof window & { spoken: string[] }).spoken,
    ),
  ).toEqual(["Voice reply check"]);
  await page.getByRole("button", { name: "Delete Voice review check" }).click();
});
