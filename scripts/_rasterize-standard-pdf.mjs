/**
 * Rasterize standard-template.pdf (O-1 Standard layout) via PDF.js + local server + Puppeteer.
 */
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleDir = path.resolve(__dirname, "../docs/secondary-template-samples");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".pdf": "application/pdf",
};

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const server = http.createServer((req, res) => {
  const raw = (req.url || "/").split("?")[0];
  const rel = raw === "/" ? "/_pdfjs-raster-page.html" : raw;
  const safe = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");
  const fp = path.join(sampleDir, safe);
  if (!fp.startsWith(sampleDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(19276, "127.0.0.1", () => resolve());
});

const base = "http://127.0.0.1:19276/_pdfjs-raster-page.html";

const browser = await puppeteer.launch({
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  for (const p of [1, 2]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 2800, deviceScaleFactor: 1 });
    await page.goto(`${base}?p=${p}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.body?.dataset?.ready === "1", {
      timeout: 120000,
    });
    await wait(400);
    const canvas = await page.$("canvas");
    if (!canvas) throw new Error("no canvas");
    const out = path.join(sampleDir, `_standard-template-raster-p${p}.png`);
    await canvas.screenshot({ path: out });
    await page.close();
    console.log("wrote", out);
  }
} finally {
  await browser.close();
  server.close();
}
