import puppeteer, { type Page } from 'puppeteer-core';

// A4 dimensions in CSS pixels at 96 DPI
const A4_WIDTH_PX = 794;   // 210mm
const A4_HEIGHT_PX = 1123;  // 297mm
// @page margin: 12mm top + 12mm bottom = ~91px
const PAGE_MARGIN_PX = 91;
const A4_USABLE_HEIGHT = A4_HEIGHT_PX - PAGE_MARGIN_PX;
const MAX_ITERATIONS = 20;

interface PdfOptions {
  fitOnePage?: boolean;
}

async function getBrowser() {
  // Docker / self-hosted: use system Chromium via CHROME_PATH
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    });
  }

  // Vercel serverless: use @sparticuz/chromium bundled binary
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium');
    return puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  // Dev: use local Chrome/Chromium
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  for (const path of candidates) {
    try {
      const { accessSync } = await import('fs');
      accessSync(path);
      return puppeteer.launch({ executablePath: path, headless: true });
    } catch {
      continue;
    }
  }

  throw new Error('No Chrome/Chromium found. Install Google Chrome or set CHROME_PATH.');
}

// ─── Shrink state for iterative fitting ───────────────────────

interface ShrinkState {
  sectionSpacingDelta: number;   // cumulative px reduction from base
  lineSpacingDelta: number;      // cumulative reduction from base
  marginDelta: number;           // cumulative px reduction from base
  scalePct: number;              // 100 = no scaling, min 80
}

function buildShrinkCSS(state: ShrinkState): string {
  const sel = '.resume-export';
  const rules: string[] = [];

  // Disable break-inside: avoid so content flows continuously
  // (otherwise Puppeteer pushes whole sections to next page)
  rules.push(`
    ${sel} [data-section],
    ${sel} .item,
    ${sel} [data-section] > div > div,
    ${sel} .rounded-lg,
    ${sel} .border-l-2,
    ${sel} ul, ${sel} ol {
      break-inside: auto !important;
    }
    ${sel} h2, ${sel} h3 {
      break-after: auto !important;
    }
  `);

  // Stage 1: section spacing
  if (state.sectionSpacingDelta > 0) {
    rules.push(`
      ${sel} [data-section] {
        margin-bottom: calc(var(--base-section-spacing) - ${state.sectionSpacingDelta}px) !important;
        padding-bottom: calc(var(--base-section-spacing) - ${state.sectionSpacingDelta}px) !important;
      }
    `);
  }

  // Stage 2: line spacing
  if (state.lineSpacingDelta > 0) {
    const delta = state.lineSpacingDelta.toFixed(2);
    rules.push(`
      ${sel} > div { line-height: calc(var(--base-line-spacing) - ${delta}) !important; }
      ${sel} p, ${sel} li, ${sel} span:not(.shrink-0), ${sel} td, ${sel} a {
        line-height: calc(var(--base-line-spacing) - ${delta}) !important;
      }
    `);
  }

  // Stage 3: page margin reduction (only if template uses padding)
  if (state.marginDelta > 0) {
    rules.push(`
      ${sel} > div {
        padding-top: calc(var(--base-margin-top) - ${state.marginDelta}px) !important;
        padding-bottom: calc(var(--base-margin-bottom) - ${state.marginDelta}px) !important;
        padding-left: calc(var(--base-margin-left) - ${state.marginDelta}px) !important;
        padding-right: calc(var(--base-margin-right) - ${state.marginDelta}px) !important;
      }
    `);
  }

  // Stage 4: font size scaling
  if (state.scalePct < 100) {
    const factor = (state.scalePct / 100).toFixed(3);
    rules.push(`
      ${sel} p, ${sel} li, ${sel} span:not(.shrink-0), ${sel} td, ${sel} a {
        font-size: calc(var(--base-body-size) * ${factor}) !important;
      }
      ${sel} h1 { font-size: calc(var(--base-h1-size) * ${factor}) !important; }
      ${sel} h2 { font-size: calc(var(--base-h2-size) * ${factor}) !important; }
      ${sel} h3 { font-size: calc(var(--base-h3-size) * ${factor}) !important; }
    `);
  }

  return rules.join('\n');
}

async function measureHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('.resume-export');
    if (!el) return 0;
    return el.scrollHeight;
  });
}

async function fitContentToOnePage(page: Page): Promise<void> {
  // Set viewport to match A4 width for accurate measurement
  await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });

  // Detect if this is a full-dark template (@page margin: 0)
  const isFullDark = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSPageRule && rule.style.margin === '0px') {
            return true;
          }
        }
      } catch { /* cross-origin */ }
    }
    return false;
  });

  const usableHeight = isFullDark ? A4_HEIGHT_PX : A4_USABLE_HEIGHT;

  const height = await measureHeight(page);
  if (height <= usableHeight) return; // already fits

  const state: ShrinkState = {
    sectionSpacingDelta: 0,
    lineSpacingDelta: 0,
    marginDelta: 0,
    scalePct: 100,
  };

  // Read base values from CSS custom properties
  const baseValues = await page.evaluate(() => {
    const el = document.querySelector('.resume-export > div') as HTMLElement | null;
    if (!el) return { sectionSpacing: 16, lineSpacing: 1.5, marginTop: 20, needsPadding: true };
    const cs = getComputedStyle(el);
    return {
      sectionSpacing: parseFloat(cs.getPropertyValue('--base-section-spacing')) || 16,
      lineSpacing: parseFloat(cs.getPropertyValue('--base-line-spacing')) || 1.5,
      marginTop: parseFloat(cs.getPropertyValue('--base-margin-top')) || 20,
      needsPadding: cs.getPropertyValue('--needs-padding')?.trim() === '1',
    };
  });

  // Stage limits
  const maxSectionDelta = Math.max(0, baseValues.sectionSpacing - 4);
  const maxLineDelta = Math.max(0, baseValues.lineSpacing - 1.15);
  const maxMarginDelta = baseValues.needsPadding ? Math.max(0, baseValues.marginTop - 8) : 0;
  const minScale = 80;

  let stage = 1;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Advance one step in the current stage
    if (stage === 1) {
      state.sectionSpacingDelta = Math.min(state.sectionSpacingDelta + 4, maxSectionDelta);
      if (state.sectionSpacingDelta >= maxSectionDelta) stage = 2;
    } else if (stage === 2) {
      state.lineSpacingDelta = Math.min(
        +(state.lineSpacingDelta + 0.1).toFixed(2),
        +maxLineDelta.toFixed(2),
      );
      if (state.lineSpacingDelta >= +maxLineDelta.toFixed(2)) stage = 3;
    } else if (stage === 3) {
      state.marginDelta = Math.min(state.marginDelta + 4, maxMarginDelta);
      if (state.marginDelta >= maxMarginDelta) stage = 4;
    } else if (stage === 4) {
      state.scalePct = Math.max(state.scalePct - 5, minScale);
      if (state.scalePct <= minScale) stage = 5; // exhausted
    }

    const css = buildShrinkCSS(state);
    await page.evaluate((cssText) => {
      let styleEl = document.getElementById('__fit-one-page');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = '__fit-one-page';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = cssText;
    }, css);

    // Wait for reflow
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

    const newHeight = await measureHeight(page);
    if (newHeight <= usableHeight) return; // fits now

    if (stage === 5) break; // exhausted all strategies
  }
}

export async function generatePdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    if (options.fitOnePage) {
      await fitContentToOnePage(page);
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
