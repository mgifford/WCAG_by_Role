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

async function tabTo(page, selector) {
  for (let index = 0; index < 25; index += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((target) => document.activeElement?.matches(target), selector)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}`);
}

test.describe('automated accessibility evidence', () => {
  test('no axe-core WCAG A/AA violations in light or dark colour schemes', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    expect(await axeViolations(page)).toEqual([]);

    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await axeViolations(page)).toEqual([]);
  });

  test('no axe-core WCAG A/AA violations in the task view with a role filter', async ({ page }) => {
    await page.goto('/dist/?role=Visual%20Design&view=tasks');
    await expect(page.locator('#result-count')).toContainText('8 matching ARRM tasks');
    expect(await axeViolations(page)).toEqual([]);
  });

  test('keyboard alone can reach, change and retain focus on filters', async ({ page }) => {
    await page.goto('/dist/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();

    await tabTo(page, '#role');
    await expect(page.locator('#role')).toBeFocused();
    await page.keyboard.press('c');
    await expect(page.locator('#role')).toHaveValue('Content Authoring');
    await expect(page.locator('#result-count')).toContainText('2 of 10');

    await page.keyboard.press('Tab');
    await expect(page.locator('#ownership')).toBeFocused();
    await page.keyboard.press('p');
    await expect(page.locator('#ownership')).toHaveValue('primary');
    await expect(page.locator('#result-count')).toContainText('1 of 10');
    await expect(page.locator('article.criterion')).toHaveCount(1);
    await expect(page.locator('.criterion-heading')).toContainText('1.1.1 Non-text Content');
    // Filtering must not move focus away from the control that changed.
    await expect(page.locator('#ownership')).toBeFocused();
  });

  test('visible focus survives forced-colors mode and component borders remain visible', async ({ page }) => {
    await page.goto('/dist/');
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

    await tabTo(page, '#role');
    await expect(page.locator('#role')).toBeFocused();
    const focusStyle = await page.locator('#role').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        borderStyle: style.borderStyle,
      };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);
    expect(focusStyle.borderStyle).not.toBe('none');

    const componentStyles = await page.locator('.criterion').first().evaluate((element) => {
      const style = getComputedStyle(element);
      const badge = element.querySelector('.level-pill');
      const badgeStyle = badge ? getComputedStyle(badge) : null;
      return {
        borderStyle: style.borderStyle,
        borderWidth: Number.parseFloat(style.borderWidth),
        badgeBorderStyle: badgeStyle?.borderStyle,
      };
    });
    expect(componentStyles.borderStyle).not.toBe('none');
    expect(componentStyles.borderWidth).toBeGreaterThanOrEqual(1);
    expect(componentStyles.badgeBorderStyle).not.toBe('none');
  });

  test('reflow at 320 CSS pixels does not create horizontal page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/dist/');
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });

  test('reduced-motion preference is respected and does not disable the interface', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dist/');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(scrollBehavior).toBe('auto');
    await page.selectOption('#role', 'Visual Design');
    await expect(page.locator('#result-count')).toContainText('4 of 10');
  });

  test('result count is exposed as a polite live region and populated after load', async ({ page }) => {
    await page.goto('/dist/');
    const live = page.locator('#result-count');
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).not.toBeEmpty();
    await page.selectOption('#level', 'AAA');
    await expect(live).toContainText('0 of 10');
  });
});
