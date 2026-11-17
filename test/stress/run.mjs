/**
 * Seclusa Word Puzzle UI stress — Playwright.
 * Serves the app, walks every mode 20+ times, toggles theme, checks console.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const reportDir = join(root, "..", "..", ".tmp", "wordplay-stress", "report");
mkdirSync(reportDir, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]);
      if (url === "/") url = "/index.html";
      const file = join(root, url.replace(/^\//, ""));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      try {
        const data = readFileSync(file);
        res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  const t0 = Date.now();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const modes = ["Puzzle", "Scrabble", "Blanks"];

  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    failedRequests.push(req.url() + " " + (req.failure()?.errorText || ""));
  });

  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".poster");

  let iterations = 0;
  for (let i = 0; i < 21; i++) {
    const name = modes[i % modes.length];
    await page.getByRole("button", { name: new RegExp("^" + name + "\\b") }).click();
    if (name === "Puzzle") {
      await page.locator("#pz-play").click({ timeout: 5000 });
      await page.waitForTimeout(80);
      await page.locator("#btn-back").click();
      await page.waitForTimeout(40);
      await page.locator("#btn-back").click();
    } else {
      await page.locator("#btn-mode-play").click({ timeout: 5000 });
      await page.waitForTimeout(100);
      await page.locator("#btn-back").click();
      await page.waitForTimeout(40);
      await page.locator("#btn-back").click();
    }
    await page.waitForSelector(".poster");
    iterations++;
  }

  await page.locator("#btn-theme").click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await page.getByRole("menuitemradio", { name: "System" }).click();

  // Offline-ish: reload after SW attempt
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".poster");

  const footer = await page.locator(".made-with").textContent();
  await browser.close();
  server.close();

  const report = {
    kind: "playwright-stress",
    version: "0.2.0",
    durationMs: Date.now() - t0,
    iterations,
    crashes: 0,
    consoleErrors: consoleErrors.slice(0, 40),
    pageErrors: pageErrors.slice(0, 40),
    failedRequests: failedRequests.slice(0, 40),
    footer: (footer || "").trim(),
    severity: consoleErrors.length || pageErrors.length ? "medium" : "none",
  };

  writeFileSync(join(reportDir, "playwright-stress.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(reportDir, "playwright-stress.md"),
    `# Seclusa Word Puzzle Playwright stress\n\n` +
      `- Duration: ${report.durationMs} ms\n` +
      `- Iterations: ${iterations}\n` +
      `- Console errors: ${consoleErrors.length}\n` +
      `- Page errors: ${pageErrors.length}\n` +
      `- Failed requests: ${failedRequests.length}\n` +
      `- Footer: ${report.footer}\n` +
      `- Severity: ${report.severity}\n`
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.severity !== "none") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
