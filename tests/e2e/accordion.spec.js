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

test.describe('task-level assignment accordions', () => {
  test('task lists are collapsed by default with a count', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    await expect(page.locator('#result-count')).toContainText('13 matching ARRM tasks');
    await expect(page.locator('details.tasks-disclosure')).toHaveCount(7);
    await expect(page.locator('details.tasks-disclosure:not([open])')).toHaveCount(7);
    const focus = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await expect(focus.locator('details.tasks-disclosure > summary')).toHaveText('Task-level ARRM assignments (3)');
    await expect(focus.locator('.task-list')).toBeHidden();
  });

  test('summary opens with mouse and keyboard and exposes the task cards', async ({ page }) => {
    await page.goto('/dist/');
    const focus = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await focus.locator('summary.tasks-heading').click();
    await expect(focus.locator('details.tasks-disclosure')).toHaveAttribute('open', '');
    await expect(focus.locator('.task-list')).toBeVisible();
    await expect(focus).toContainText('INP-017');
    await expect(focus).toContainText('INP-018');

    await focus.locator('summary.tasks-heading').press('Enter');
    await expect(focus.locator('details.tasks-disclosure')).not.toHaveAttribute('open', '');
    await focus.locator('summary.tasks-heading').focus();
    await page.keyboard.press('Enter');
    await expect(focus.locator('details.tasks-disclosure')).toHaveAttribute('open', '');
  });

  test('a task-text search opens the matching assignment disclosure', async ({ page }) => {
    await page.goto('/dist/?query=outline%20property');
    const focus = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await expect(focus.locator('details.tasks-disclosure')).toHaveAttribute('open', '');
    await expect(focus.locator('.task-list')).toBeVisible();
    await expect(focus).toContainText('CSS-022');
  });

  test('open and closed accordions pass axe-core', async ({ page }) => {
    await page.goto('/dist/');
    expect(await axeViolations(page)).toEqual([]);
    const focus = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await focus.locator('summary.tasks-heading').click();
    expect(await axeViolations(page)).toEqual([]);
  });
});
