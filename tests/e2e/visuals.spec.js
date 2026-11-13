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

test.describe('visual language', () => {
  test('role cards and functional-needs groups have decorative icons and visible text', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    await expect(page.locator('#role-guides-list .role-path')).toHaveCount(5);
    await expect(page.locator('#role-guides-list .role-path svg')).toHaveCount(5);
    await expect(page.locator('.need-card')).toHaveCount(8);
    await expect(page.locator('.need-card svg')).toHaveCount(8);
    await expect(page.locator('.need-card h3')).toHaveText([
      'Vision', 'Colour perception', 'Hearing', 'Cognition and learning',
      'Motor and manipulation', 'Speech', 'Photosensitivity', 'Privacy',
    ]);
    await expect(page.locator('#needs')).toContainText('not a diagnosis');
    await expect(page.locator('#needs')).toContainText('not used to assign ARRM ownership');
    await expect(page.locator('#needs a[href*="access-board.gov"]')).toBeVisible();
    await expect(page.locator('#needs a[href*="etsi.org"]')).toBeVisible();
  });

  test('all inline icons are decorative and no external images are used', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('svg.icon').first()).toBeVisible();
    const icons = await page.locator('svg.icon').evaluateAll((nodes) => nodes.map((node) => ({
      hidden: node.getAttribute('aria-hidden'),
      focusable: node.getAttribute('focusable'),
      role: node.getAttribute('role'),
    })));
    expect(icons.length).toBeGreaterThanOrEqual(10);
    expect(icons.every((icon) => icon.hidden === 'true')).toBe(true);
    expect(icons.every((icon) => icon.focusable === 'false')).toBe(true);
    expect(icons.every((icon) => icon.role === null)).toBe(true);
    expect(await page.locator('img').count()).toBe(0);
    const backgroundImages = await page.evaluate(() =>
      [...document.querySelectorAll('*')].map((node) => getComputedStyle(node).backgroundImage).filter((value) => value !== 'none'));
    expect(backgroundImages).toEqual([]);
  });

  test('role guides show category and role icons without replacing headings', async ({ page }) => {
    await page.goto('/dist/role.html?role=visual-design');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await expect(page.locator('#page-title svg')).toHaveCount(1);
    await expect(page.locator('#page-title')).toContainText('WCAG for Visual Designers');
    await expect(page.locator('.category-nav svg')).toHaveCount(3);
    await expect(page.locator('.category-section h3 svg')).toHaveCount(3);
    await expect(page.locator('.category-nav')).toContainText('Input Modalities');
    await expect(page.locator('.category-nav')).toContainText('CSS and Presentation');
    await expect(page.locator('.category-nav')).toContainText('Dynamic Interactions');

    await page.goto('/dist/role.html?role=front-end-development');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'front-end-development');
    await expect(page.locator('.category-nav svg')).toHaveCount(6);
    await expect(page.locator('.category-nav')).toContainText('Semantic Structure');
    await expect(page.locator('.category-nav')).toContainText('Other ARRM tasks');
  });

  test('icons remain visible in dark and forced-colours modes', async ({ page }) => {
    await page.goto('/dist/');
    await page.emulateMedia({ colorScheme: 'dark' });
    const darkStroke = await page.locator('.need-card svg').first().evaluate((node) => getComputedStyle(node).stroke);
    expect(darkStroke).not.toBe('none');
    expect(darkStroke).not.toBe('rgba(0, 0, 0, 0)');

    await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    const forcedStroke = await page.locator('.need-card svg').first().evaluate((node) => getComputedStyle(node).stroke);
    expect(forcedStroke).not.toBe('none');
    expect(forcedStroke).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('.need-card').first()).toHaveCSS('border-style', 'solid');
  });

  test('functional-needs cards reflow at 320 CSS pixels', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/dist/');
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
    await expect(page.locator('.need-card').first()).toBeVisible();
  });

  test('visual sections pass axe-core in light and dark schemes', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('.need-card').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await axeViolations(page)).toEqual([]);

    await page.goto('/dist/role.html?role=front-end-development');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'front-end-development');
    expect(await axeViolations(page)).toEqual([]);
  });
});
