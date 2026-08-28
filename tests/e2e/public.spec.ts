import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CATEGORIES } from "../../src/lib/domain";
import { canonicalizeUrl } from "../../src/server/canonical";
import { createDemoArticles, DEMO_IMAGE_SLUG, DEMO_LEAD_SLUG, DEMO_NASA_URL } from "../../fixtures/articles";

const screenshotDirectory = resolve("output/playwright");
const forbiddenPunctuation = /[\u00b7\u2022\u2219\u2014\u2013]/u;
const browserErrors = new WeakMap<Page, string[]>();
const demoArticles = createDemoArticles();

test.beforeAll(async () => { await mkdir(screenshotDirectory, { recursive: true }); });

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), "Browser console and uncaught errors").toEqual([]);
});

async function assertPublicText(page: Page) {
  const content = await page.locator("body").innerText();
  const labels = await page.locator("[aria-label], [alt], [title], option, meta[content]").evaluateAll((elements) =>
    elements.flatMap((element) => [
      element.getAttribute("aria-label"), element.getAttribute("alt"),
      element.getAttribute("title"), element.getAttribute("content"),
      element.tagName === "OPTION" ? element.textContent : "",
    ]).filter(Boolean).join("\n"),
  );
  expect(`${await page.title()}\n${content}\n${labels}`).not.toMatch(forbiddenPunctuation);
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
}

async function assertNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.html).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function waitForVisuals(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect.poll(async () => page.locator("main img").evaluateAll((elements) =>
    elements.every((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0),
  )).toBe(true);
}

async function articleIds(page: Page) {
  return page.locator("main article[data-article-id]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-article-id") ?? ""),
  );
}

test("all Finnish public routes render cleanly without forbidden punctuation", async ({ page }) => {
  test.setTimeout(120_000);
  const routes = [
    "/", "/uusimmat", "/suomi", "/maailmalta",
    ...CATEGORIES.map((category) => `/aihe/${category.slug}`),
    "/haku", "/lahteet", "/miten-tama-toimii", "/tietoa", "/tietosuoja",
    `/uutinen/${DEMO_LEAD_SLUG}`, `/uutinen/${DEMO_IMAGE_SLUG}`,
  ];
  for (const route of routes) {
    await test.step(route, async () => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
      await assertPublicText(page);
    });
  }
});

test("front page uses unique stories and a complete text-only lead", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Esittelytila\./).first()).toBeVisible();
  const ids = await articleIds(page);
  expect(ids.length).toBeGreaterThan(10);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids[0]).toBe(DEMO_LEAD_SLUG);
  const lead = page.locator(`main article[data-article-id="${DEMO_LEAD_SLUG}"]`);
  await expect(lead.getByRole("link", { name: "Vesi palasi ennallistetulle kosteikolle", exact: true })).toBeVisible();
  await expect(lead.locator("img")).toHaveCount(0);
  await expect(page.locator(`main article[data-article-id="${DEMO_IMAGE_SLUG}"] img`)).toBeVisible();
});

test("the front page keeps its stories and removes the frame when its only image cannot decode", async ({ page }) => {
  await page.goto("/");
  const originalArticles = await articleIds(page);
  let invalidImageResponses = 0;
  const imagePath = "/demo/roman-avaruusteleskooppi.jpg";
  await page.route((url) => url.pathname === imagePath
    || (url.pathname === "/_next/image" && url.searchParams.get("url") === imagePath), async (route) => {
    invalidImageResponses += 1;
    await route.fulfill({ status: 200, contentType: "image/jpeg", body: Buffer.alloc(0) });
  });
  await page.reload();
  await expect.poll(() => invalidImageResponses).toBeGreaterThan(0);
  await expect(page.locator("main img, main figure")).toHaveCount(0);
  expect(await articleIds(page)).toEqual(originalArticles);

  const story = page.locator(`main article[data-article-id="${DEMO_IMAGE_SLUG}"]`);
  await expect(story.getByRole("heading")).toBeVisible();
  await expect(story.locator(":scope > :first-child")).toContainText("Tiede ja teknologia");
  const topGap = await story.getByRole("link", { name: "Tiede ja teknologia", exact: true }).evaluate((label) => {
    const article = label.closest("article");
    if (!article) throw new Error("Story container is missing");
    return label.getBoundingClientRect().top - article.getBoundingClientRect().top;
  });
  expect(topGap, "A removed image must not reserve blank space above the story").toBeLessThanOrEqual(1);
  await waitForVisuals(page);
  await assertNoOverflow(page);
  await assertPublicText(page);
  await page.screenshot({ path: resolve(screenshotDirectory, "home-without-images-1440.png"), fullPage: true });
});

test("regions and all primary categories contain only matching stories", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [route, region] of [["/suomi", "Suomi"], ["/maailmalta", "Maailmalta"]]) {
    await page.goto(route);
    const ids = await articleIds(page);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(demoArticles.find((article) => article.id === id)?.region).toBe(region);
  }
  for (const category of CATEGORIES) {
    await page.goto(`/aihe/${category.slug}`);
    const ids = await articleIds(page);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(demoArticles.find((article) => article.id === id)?.primaryCategory).toBe(category.slug);
  }
  await page.goto("/aihe/elaimet");
  await expect(page.getByRole("link", { name: "Kissanpennut löysivät kodin yhdessä", exact: true })).toBeVisible();
});

test("search filters persist in the URL and can be cleared", async ({ page }) => {
  await page.goto("/haku");
  await page.getByLabel("Hakusana", { exact: true }).fill("kosteikko");
  await page.getByRole("combobox", { name: "Alue", exact: true }).selectOption("Suomi");
  await page.getByRole("combobox", { name: "Aihe", exact: true }).selectOption("luonto");
  await page.getByRole("combobox", { name: "Lähde", exact: true }).selectOption("demo-suomi");
  await page.getByRole("combobox", { name: "Ajankohta", exact: true }).selectOption("all");
  await page.getByRole("combobox", { name: "Järjestys", exact: true }).selectOption("oldest");
  await page.getByRole("button", { name: "Hae", exact: true }).click();
  await expect(page).toHaveURL(/q=kosteikko/);
  const url = new URL(page.url());
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    q: "kosteikko", region: "Suomi", category: "luonto", source: "demo-suomi", period: "all", sort: "oldest",
  });
  expect(await articleIds(page)).toEqual([DEMO_LEAD_SLUG]);
  await page.reload();
  await expect(page.getByLabel("Hakusana", { exact: true })).toHaveValue("kosteikko");
  await expect(page.getByRole("combobox", { name: "Lähde", exact: true })).toHaveValue("demo-suomi");
  await page.getByRole("link", { name: "Tyhjennä rajaukset", exact: true }).click();
  await expect(page).toHaveURL(/\/haku$/);
  await expect(page.getByLabel("Hakusana", { exact: true })).toHaveValue("");
  expect((await articleIds(page)).length).toBeGreaterThan(1);
  await assertPublicText(page);
  await page.getByRole("combobox", { name: "Ulkoasu", exact: true }).selectOption("light");
  await waitForVisuals(page);
  await page.screenshot({ path: resolve(screenshotDirectory, "search-light-1440.png"), fullPage: true });
});

test("search finds internal keywords and sources, dates filter, and oldest sorting works", async ({ page }) => {
  await page.goto("/haku?q=mikrosiru&period=all");
  expect(await articleIds(page)).toEqual(["demo-koira-kotiin"]);
  await page.goto("/haku?q=NASA&period=all");
  expect(await articleIds(page)).toEqual([DEMO_IMAGE_SLUG]);
  await page.goto("/haku?period=7");
  const recent = await articleIds(page);
  expect(recent).not.toContain("demo-koira-kotiin");
  expect(recent).not.toContain("demo-rannikon-kosteikko");
  expect(recent).toContain(DEMO_LEAD_SLUG);
  await page.goto("/haku?period=all&sort=oldest");
  const times = await page.locator("main article[data-article-id] time[datetime]").evaluateAll((elements) =>
    elements.map((element) => Date.parse(element.getAttribute("datetime") ?? "")),
  );
  expect(times.length).toBeGreaterThan(1);
  expect(times).toEqual([...times].sort((left, right) => left - right));
});

test("an empty search explains the result and lets the reader reset it", async ({ page }) => {
  await page.goto("/haku?q=olemattomanuutisentunniste987654321&period=all");
  expect(await articleIds(page)).toEqual([]);
  await expect(page.getByText(/ei löytynyt|Ei tuloksia|Hakua vastaavia/i).first()).toBeVisible();
  await expect(page.locator("form").getByRole("link", { name: "Tyhjennä rajaukset", exact: true })).toBeVisible();
  await assertPublicText(page);
});

test("approved image is exact, credited, and links to the original story", async ({ page }) => {
  await page.goto(`/uutinen/${DEMO_IMAGE_SLUG}`);
  const story = page.getByRole("main");
  const image = story.getByRole("img", { name: /Roman-avaruusteleskooppi hyötykuormasuojuksen sisällä/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("width", "1200");
  await expect(image).toHaveAttribute("height", "800");
  await waitForVisuals(page);
  await expect(story.getByText("NASA/Sydney Rohde (Rocz)", { exact: false })).toBeVisible();
  const original = story.getByRole("link", { name: "Lue alkuperäinen uutinen", exact: true });
  expect(canonicalizeUrl(await original.getAttribute("href") ?? "")).toBe(canonicalizeUrl(DEMO_NASA_URL));
  if (await original.getAttribute("target") === "_blank") {
    await expect(original).toHaveAttribute("rel", /noopener/);
  }
  await assertPublicText(page);
  await page.screenshot({ path: resolve(screenshotDirectory, "article-image-light-1440.png"), fullPage: true });
});

test("a story without rights-approved imagery renders without a placeholder", async ({ page }) => {
  await page.goto(`/uutinen/${DEMO_LEAD_SLUG}`);
  await expect(page.getByRole("heading", { name: "Vesi palasi ennallistetulle kosteikolle", exact: true })).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Lue alkuperäinen uutinen", exact: true }))
    .toHaveAttribute("href", `https://example.org/kehitysaineisto/${DEMO_LEAD_SLUG}`);
  await expect(page.getByRole("main").getByText(/kuvitteellinen/i).first()).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
  await assertPublicText(page);
  await page.screenshot({ path: resolve(screenshotDirectory, "article-no-image-light-1440.png"), fullPage: true });
});

test("the theme follows the system and keeps an explicit preference after reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const theme = page.getByRole("combobox", { name: "Ulkoasu", exact: true });
  await expect(theme).toHaveValue("system");
  const systemDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await theme.selectOption("light");
  const explicitLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(explicitLight).not.toBe(systemDark);
  await page.reload();
  await expect(theme).toHaveValue("light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(explicitLight);
  await theme.selectOption("system");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(systemDark);
  await theme.selectOption("dark");
  await page.reload();
  await expect(theme).toHaveValue("dark");
  await assertPublicText(page);
});

test("the first theme choice is not lost while client hydration finishes", async ({ page }) => {
  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>((resolveScripts) => { releaseScripts = resolveScripts; });
  const scriptPattern = "**/_next/static/**/*.js";
  await page.route(scriptPattern, async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const theme = page.getByRole("combobox", { name: "Ulkoasu", exact: true });
    await expect(theme).toBeVisible();
    const disabledUntilReady = await theme.isDisabled();
    if (!disabledUntilReady) await theme.selectOption("dark");
    releaseScripts();
    await page.waitForLoadState("load");
    await expect(theme).toBeEnabled();
    if (disabledUntilReady) await theme.selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(theme).toHaveValue("dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(theme).toHaveValue("dark");
  } finally {
    releaseScripts();
    await page.unroute(scriptPattern);
  }
});

test("mobile navigation and the keyboard skip link are usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Siirry sisältöön", exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sisalto")).toBeFocused();
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Valikko", exact: true });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await assertNoOverflow(page);
  await page.screenshot({ path: resolve(screenshotDirectory, "navigation-mobile-390.png") });
  await page.locator("#main-navigation").getByRole("link", { name: "Maailmalta", exact: true }).click();
  await expect(page).toHaveURL(/\/maailmalta$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await assertNoOverflow(page);
  await assertPublicText(page);
});

test("representative pages pass automated WCAG accessibility checks in both themes", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await waitForVisuals(page);
  for (const theme of ["light", "dark"]) {
    await page.getByRole("combobox", { name: "Ulkoasu", exact: true }).selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const route of ["/", "/haku", `/uutinen/${DEMO_IMAGE_SLUG}`]) {
      await test.step(`${route} ${theme}`, async () => {
        if (new URL(page.url()).pathname !== route) await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("combobox", { name: "Ulkoasu", exact: true })).toHaveValue(theme);
        await waitForVisuals(page);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const violations = result.violations.map(({ id, impact, nodes }) => ({
          id, impact, targets: nodes.map((node) => node.target),
        }));
        expect(violations).toEqual([]);
      });
    }
  }
});

test("text remains readable at 200 percent size", async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/haku", `/uutinen/${DEMO_IMAGE_SLUG}`]) {
      await page.goto(route);
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await waitForVisuals(page);
      await assertNoOverflow(page);
    }
  }
});

test("article typography fits all supported widths in both themes", async ({ page }) => {
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const theme of ["light", "dark"]) {
      for (const slug of [DEMO_LEAD_SLUG, DEMO_IMAGE_SLUG, "demo-lukemisen-opastus"]) {
        await page.goto(`/uutinen/${slug}`);
        await page.getByRole("combobox", { name: "Ulkoasu", exact: true }).selectOption(theme);
        await waitForVisuals(page);
        await assertNoOverflow(page);
        const summary = page.locator('main p[class*="summary"]');
        await expect(summary).toHaveCSS("font-family", /News[ _]Cycle/);
        const size = await summary.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
        expect(size).toBeGreaterThanOrEqual(18);
        if (slug === DEMO_IMAGE_SLUG) {
          await page.screenshot({ path: resolve(screenshotDirectory, `article-${theme}-${width}.png`), fullPage: true });
        }
      }
    }
  }
});

test("supporting text uses News Cycle while headlines remain serif", async ({ page }) => {
  await page.goto("/");
  await waitForVisuals(page);
  await expect(page.locator("body")).toHaveCSS("font-family", /News[ _]Cycle/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Parempia Uutisia, etusivu" }))
    .toHaveCSS("font-family", /Newsreader/);
  for (const summary of await page.locator("main article > p").all()) {
    await expect(summary).toHaveCSS("font-family", /News[ _]Cycle/);
  }
  for (const heading of await page.locator("main article h2, main article h3").all()) {
    await expect(heading).toHaveCSS("font-family", /Newsreader/);
  }
  const weights = await page.evaluate(() => [...document.fonts]
    .filter((font) => /News[ _]Cycle/.test(font.family) && !font.family.includes("Fallback") && font.status === "loaded")
    .map((font) => font.weight));
  expect(new Set(weights)).toEqual(new Set(["400", "700"]));
  await page.goto(`/uutinen/${DEMO_LEAD_SLUG}`);
  await expect(page.locator("main article h1")).toHaveCSS("font-family", /Newsreader/);
  await expect(page.locator('main p[class*="summary"]')).toHaveCSS("font-family", /News[ _]Cycle/);
});

test("desktop, tablet, and mobile layouts fit the viewport in light and dark themes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await waitForVisuals(page);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const theme of ["light", "dark"]) {
      await page.getByRole("combobox", { name: "Ulkoasu", exact: true }).selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("combobox", { name: "Ulkoasu", exact: true })).toHaveValue(theme);
      await waitForVisuals(page);
      const kickerTargets = await page.locator('main article[data-article-id] a[href^="/aihe/"]').evaluateAll((links) =>
        links.map((link) => {
          const bounds = link.getBoundingClientRect();
          return { label: link.textContent, width: bounds.width, height: bounds.height };
        }),
      );
      expect(kickerTargets).toHaveLength(await page.locator("main article[data-article-id]").count());
      for (const target of kickerTargets) {
        expect(target.width, `${target.label} target width at ${width}px`).toBeGreaterThanOrEqual(44);
        expect(target.height, `${target.label} target height at ${width}px`).toBeGreaterThanOrEqual(44);
      }
      if (width === 1024) {
        const compactHeadings = page.getByRole("region", { name: "Pääuutiset", exact: true })
          .locator(":scope > div").last().getByRole("heading", { level: 2 });
        await expect(compactHeadings).toHaveCount(3);
        const tops = await compactHeadings.evaluateAll((headings) => headings.map((heading) => heading.getBoundingClientRect().top));
        expect(Math.max(...tops) - Math.min(...tops), "Compact lead headlines must align on tablet").toBeLessThanOrEqual(1);
      }
      await assertNoOverflow(page);
      await assertPublicText(page);
      await page.screenshot({ path: resolve(screenshotDirectory, `home-${theme}-${width}.png`), fullPage: true });
      if (width === 390) {
        await page.screenshot({ path: resolve(screenshotDirectory, `home-${theme}-390-viewport.png`) });
      }
    }
  }
});

test("fixture content is not indexable and no English publication exists", async ({ request }) => {
  const home = await request.get("/");
  expect(await home.text()).toMatch(/name="robots" content="[^"]*noindex/);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain("/uutinen/demo-");
  const english = await request.get("/en");
  expect(english.status()).toBe(404);
});

test("administration protects actions and supports demo ingestion, source controls, removal and logout", async ({ page, request }) => {
  const anonymous = await request.post("/api/hallinta/action", {
    form: { action: "withdraw", id: "nonexistent-e2e-article" },
    headers: { origin: "http://127.0.0.1:3100" },
  });
  expect(anonymous.status()).toBe(403);
  const response = await page.goto("/hallinta");
  expect(await response?.text()).not.toContain("playwright-local-test-secret-only");
  await page.getByLabel("Hallinnan avain", { exact: true }).fill("playwright-local-test-secret-only");
  await page.getByRole("button", { name: "Kirjaudu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hallinta", exact: true })).toBeVisible();
  await expect(page.getByText("Vesi palasi ennallistetulle kosteikolle", { exact: true })).toBeVisible();
  await expect(page.locator("dl > div").filter({ has: page.getByText("Julkaistu", { exact: true }) }).locator("dd")).toHaveText("24");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole("combobox", { name: "Ulkoasu", exact: true }).selectOption("light");
  await page.screenshot({ path: resolve(screenshotDirectory, "admin-light-1440.png") });
  await page.getByRole("button", { name: "Suorita esimerkkiajo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Oikeita lähteitä tai AI-palvelua ei kutsuttu." })).toBeVisible();

  const nasa = page.getByRole("heading", { name: "NASA", exact: true }).locator("../..");
  const originallyEnabled = await nasa.getByRole("button", { name: "Poista käytöstä", exact: true }).count() === 1;
  const initialAction = originallyEnabled ? "Poista käytöstä" : "Ota käyttöön";
  const restoreAction = originallyEnabled ? "Ota käyttöön" : "Poista käytöstä";
  await nasa.getByRole("button", { name: initialAction, exact: true }).click();
  await expect(nasa.getByRole("button", { name: restoreAction, exact: true })).toBeVisible();
  await nasa.getByRole("button", { name: restoreAction, exact: true }).click();
  await expect(nasa.getByRole("button", { name: initialAction, exact: true })).toBeVisible();

  const removable = page.getByRole("heading", { name: "Kadonnut koira löytyi tunnistusmerkinnän avulla", exact: true }).locator("../..");
  page.once("dialog", async (dialog) => { await dialog.accept(); });
  await removable.getByRole("button", { name: "Poista julkaisusta", exact: true }).click();
  await expect(removable.getByRole("button", { name: "Poista julkaisusta", exact: true })).toHaveCount(0);
  expect((await page.request.get("/uutinen/demo-koira-kotiin")).status()).toBe(404);
  await page.getByRole("button", { name: "Kirjaudu ulos", exact: true }).click();
  await expect(page.getByLabel("Hallinnan avain", { exact: true })).toBeVisible();
});
