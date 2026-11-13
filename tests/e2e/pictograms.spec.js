import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

test.describe('WCAG success-criterion pictograms', () => {
  test('every explorer criterion card uses the matching sprite symbol', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    await expect(page.locator('article.criterion')).toHaveCount(10);
    const icons = page.locator('article.criterion .criterion-heading .sc-icon');
    await expect(icons).toHaveCount(10);
    const details = await icons.evaluateAll((nodes) => nodes.map((node) => ({
      number: node.dataset.criterion,
      href: node.querySelector('use')?.getAttribute('href'),
      hidden: node.getAttribute('aria-hidden'),
      focusable: node.getAttribute('focusable'),
    })));
    for (const icon of details) {
      expect(icon.href).toBe(`./wcag22-icons.svg#sc-${icon.number.replaceAll('.', '-')}`);
      expect(icon.hidden).toBe('true');
      expect(icon.focusable).toBe('false');
    }
    const focus = icons.filter({ has: page.locator('svg') }).locator('..');
    await expect(page.locator('[data-criterion="2.4.7"]')).toHaveCount(1);
    await expect(page.locator('[data-criterion="2.4.7"] use')).toHaveAttribute('href', './wcag22-icons.svg#sc-2-4-7');
    await expect(page.locator('svg.sc-icon[data-criterion="4.1.1"]')).toHaveCount(0);
  });

  test('role-guide criteria lists use the same SC symbols', async ({ page }) => {
    await page.goto('/dist/role.html?role=visual-design');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await expect(page.locator('.criteria-list .sc-icon')).toHaveCount(4);
    await expect(page.locator('#sc-2-4-7 .sc-icon use')).toHaveAttribute('href', './wcag22-icons.svg#sc-2-4-7');

    await page.goto('/dist/role.html?role=front-end-development');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'front-end-development');
    await expect(page.locator('.criteria-list .sc-icon')).toHaveCount(6);
  });

  test('task view also carries the criterion symbol', async ({ page }) => {
    await page.goto('/dist/?view=tasks');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    await expect(page.locator('article.criterion .criterion-heading .sc-icon')).toHaveCount(12);
    await expect(page.locator('article.criterion .criterion-heading .sc-icon').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('sprite renders visibly without an image element', async ({ page }) => {
    await page.goto('/dist/');
    const sprite = await page.request.get('/dist/wcag22-icons.svg');
    expect(sprite.status()).toBe(200);
    expect(sprite.headers()['content-type']).toContain('svg');
    const icon = page.locator('[data-criterion="2.4.7"]');
    await expect(icon).toBeVisible();
    const box = await icon.boundingBox();
    expect(box.width).toBeGreaterThan(40);
    expect(box.height).toBeGreaterThan(40);
    expect(await page.locator('img').count()).toBe(0);
  });

  test('pictogram tiles stay visible in dark and forced-colours modes', async ({ page }) => {
    await page.goto('/dist/');
    const icon = page.locator('[data-criterion="2.4.7"]');
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await icon.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {background: style.backgroundColor, width: box.width, height: box.height};
    });
    expect(dark.background).toBe('rgb(255, 255, 255)');
    expect(dark.width).toBeGreaterThan(40);
    expect(dark.height).toBeGreaterThan(40);

    await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    const forced = await icon.evaluate((node) => {
      const style = getComputedStyle(node);
      return {borderStyle: style.borderStyle, forcedColorAdjust: style.forcedColorAdjust};
    });
    expect(forced.borderStyle).toBe('solid');
    expect(forced.forcedColorAdjust).toBe('none');
  });

  test('pictograms reflow at 320 CSS pixels and pass axe-core', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/dist/');
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
    expect(await axeViolations(page)).toEqual([]);
  });
});
