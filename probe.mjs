// Anonymous TikTok search through the site's own search box, headless vs headed.
// Prints counts only -- no captions, no cookies, nothing worth leaking in a log.
import { chromium } from "playwright";

const keyword = process.argv[2] || "gta 6";

async function trial(headless) {
  const browser = await chromium.launch({ headless });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" })).newPage();
  let search = { status: 0, bytes: 0, items: 0 };
  page.on("response", async (r) => {
    if (!r.url().includes("/api/search/general/full/")) return;
    try {
      const t = await r.text();
      let items = 0;
      try { items = (JSON.parse(t).data || []).length; } catch {}
      search = { status: r.status(), bytes: t.length, items };
    } catch {}
  });
  try {
    await page.goto("https://www.tiktok.com/explore", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(7000);
    await page.locator("[data-e2e=nav-search]").first().click();
    await page.waitForTimeout(1500);
    const box = page.locator("input[type=search]:visible").first();
    await box.click();
    await box.type(keyword, { delay: 90 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(10000);
    const onPage = await page.evaluate(() => ({
      captcha: !!document.querySelector('[class*="captcha" i], [id*="captcha" i]'),
      cards: document.querySelectorAll('a[href*="/video/"]').length,
    }));
    return { mode: headless ? "headless" : "headed", ...search, ...onPage };
  } catch (err) {
    return { mode: headless ? "headless" : "headed", ...search, error: String(err.message || err).slice(0, 160) };
  } finally {
    await browser.close();
  }
}

const results = [];
for (const headless of [true, false]) results.push(await trial(headless));
const ip = await fetch("https://api.ipify.org").then((r) => r.text()).catch(() => "?");
console.log(JSON.stringify({ keyword, egress: ip.replace(/\.\d+$/, ".x"), results }, null, 2));
