import { test, expect } from '@playwright/test';

const criteriaCards = (page) => page.locator('article.criterion');

test.describe('filter behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    await expect(page.locator('#demo-warning')).toBeVisible();
  });

  test('loads the demo data from a nested path and marks it as a sample', async ({ page }) => {
    expect(new URL(page.url()).pathname).toBe('/dist/');
    await expect(page.locator('#result-count')).toContainText('10 of 10 active WCAG 2.2 criteria');
    await expect(page.locator('#result-count')).toContainText('12 matching ARRM tasks');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
  });

  test('role, responsibility and level filters combine without merging ownership levels', async ({ page }) => {
    await page.selectOption('#role', 'Visual Design');
    await expect(criteriaCards(page)).toHaveCount(4);
    await expect(page.locator('#result-count')).toContainText('4 of 10');

    await page.selectOption('#ownership', 'primary');
    await expect(criteriaCards(page)).toHaveCount(3);
    await expect(page.locator('.ownership-contributor')).toHaveCount(0);

    await page.selectOption('#level', 'A');
    await expect(page.locator('.empty')).toContainText('No records match');
    await expect(page.locator('#result-count')).toContainText('0 of 10');
  });

  test('task view keeps the same criterion split across different task owners', async ({ page }) => {
    await page.selectOption('#role', 'Visual Design');
    await page.selectOption('#view', 'tasks');
    await expect(criteriaCards(page)).toHaveCount(8);

    const inp017 = page.locator('article.criterion', { hasText: 'INP-017' });
    const inp018 = page.locator('article.criterion', { hasText: 'INP-018' });
    await expect(inp017.locator('.ownership-primary')).toContainText('Primary: Visual Design');
    await expect(inp017.locator('.ownership-secondary')).toHaveCount(0);
    await expect(inp018.locator('.ownership-primary')).toHaveCount(0);
    await expect(inp018.locator('.ownership-secondary')).toContainText('Secondary: Visual Design');
  });

  test('search narrows both criterion metadata and task text', async ({ page }) => {
    await page.fill('#query', 'labels or instructions');
    await expect(criteriaCards(page)).toHaveCount(1);
    await expect(page.locator('.criterion-heading')).toContainText('3.3.2 Labels or Instructions');

    await page.fill('#query', 'target size');
    await expect(criteriaCards(page)).toHaveCount(1);
    await expect(page.locator('.criterion-heading')).toContainText('2.5.8 Target Size (Minimum)');

    await page.fill('#query', 'outline property');
    await expect(criteriaCards(page)).toHaveCount(1);
    await expect(page.locator('.criterion-heading')).toContainText('2.4.7 Focus Visible');
  });

  test('include criteria with no matching task restores the full WCAG context', async ({ page }) => {
    await page.selectOption('#role', 'Visual Design');
    await expect(criteriaCards(page)).toHaveCount(4);
    await page.check('#show-all');
    await expect(criteriaCards(page)).toHaveCount(10);
    await expect(page.locator('#result-count')).toContainText('10 of 10');
    await expect(page.locator('.no-tasks').first()).toContainText('does not indicate an exception to WCAG');
  });

  test('URL parameters round-trip and keep the nested path', async ({ page }) => {
    await page.goto('/dist/?role=Visual%20Design&ownership=primary&level=AA&view=tasks&query=visible&all=1');
    await expect(page.locator('#role')).toHaveValue('Visual Design');
    await expect(page.locator('#ownership')).toHaveValue('primary');
    await expect(page.locator('#level')).toHaveValue('AA');
    await expect(page.locator('#view')).toHaveValue('tasks');
    await expect(page.locator('#query')).toHaveValue('visible');
    await expect(page.locator('#show-all')).toBeChecked();
    expect(new URL(page.url()).pathname).toBe('/dist/');
    await expect(page.locator('#result-count')).toContainText('1 of 10');
  });

  test('shows the W3C Author task label without renaming it', async ({ page }) => {
    await page.fill('#query', '1.4.12');
    const card = page.locator('article.criterion', { hasText: '1.4.12 Text Spacing' });
    const brief = card.locator('details.brief');
    await brief.locator('summary').click();
    await expect(brief).toContainText('Author task');
    await expect(brief).toContainText('Ensure content adapts to user-defined text settings.');
    await expect(brief).not.toContainText('What to do');
    await expect(brief.locator('a')).toHaveAttribute(
      'href', 'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html');
  });

  test('removed WCAG 4.1.1 Parsing is not presented as a live requirement', async ({ page }) => {
    await expect(page.locator('article.criterion', { hasText: '4.1.1 Parsing' })).toHaveCount(0);
    await expect(page.locator('a[href*="#parsing"]')).toHaveCount(0);
    await page.fill('#query', '4.1.1');
    await expect(page.locator('.empty')).toBeVisible();
  });

  test('reset returns every control and the URL to the default state', async ({ page }) => {
    await page.selectOption('#role', 'Visual Design');
    await page.selectOption('#ownership', 'secondary');
    await page.selectOption('#level', 'AA');
    await page.selectOption('#view', 'tasks');
    await page.fill('#query', 'focus');
    await page.check('#show-all');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.locator('#role')).toHaveValue('');
    await expect(page.locator('#ownership')).toHaveValue('');
    await expect(page.locator('#level')).toHaveValue('');
    await expect(page.locator('#view')).toHaveValue('criteria');
    await expect(page.locator('#query')).toHaveValue('');
    await expect(page.locator('#show-all')).not.toBeChecked();
    await expect(criteriaCards(page)).toHaveCount(10);
    expect(new URL(page.url()).search).toBe('');
  });
});
