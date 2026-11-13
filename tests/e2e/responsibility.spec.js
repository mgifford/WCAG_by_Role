import { test, expect } from '@playwright/test';

async function openExplorer(page) {
  await page.goto('/dist/');
  await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
}

test.describe('conformance target and missing-source distinctions', () => {
  test('the target is cumulative while exact level remains independent', async ({ page }) => {
    await openExplorer(page);
    await expect(page.locator('#target')).toBeVisible();
    await expect(page.locator('#level')).toBeVisible();
    await expect(page.locator('#target')).toHaveValue('');
    await expect(page.locator('#level')).toHaveValue('');
    await expect(page.locator('#level-help')).toContainText('Level AA includes A and AA');
    await expect(page.locator('#level-help')).toContainText('Neither control establishes WCAG conformance');

    await page.selectOption('#role', 'Front-End Development');
    await page.selectOption('#target', 'A');
    await expect(page.locator('#result-count')).toContainText('3 of 10');
    expect((await page.locator('.criterion-heading').allTextContents()).every(text => !text.includes('Level AA'))).toBe(true);

    await page.selectOption('#target', 'AA');
    await expect(page.locator('#result-count')).toContainText('6 of 10');
    const targetHeadings = await page.locator('.criterion-heading').allTextContents();
    expect(targetHeadings.some(text => text.includes('Level A'))).toBe(true);
    expect(targetHeadings.some(text => text.includes('Level AA'))).toBe(true);

    await page.selectOption('#level', 'A');
    await expect(page.locator('#result-count')).toContainText('3 of 10');
    await page.selectOption('#target', 'A');
    await page.selectOption('#level', 'AA');
    await expect(page.locator('#result-count')).toContainText('0 of 10');
  });

  test('role filters do not change the meaning of the target', async ({ page }) => {
    await openExplorer(page);
    await page.selectOption('#role', 'Visual Design');
    await page.selectOption('#target', 'A');
    await expect(page.locator('#result-count')).toContainText('0 of 10');
    await page.selectOption('#target', 'AA');
    await expect(page.locator('#result-count')).toContainText('4 of 10');
    await page.selectOption('#target', 'AAA');
    await expect(page.locator('#result-count')).toContainText('4 of 10');
  });

  test('target and exact level round-trip through the URL and reset', async ({ page }) => {
    await page.goto('/dist/?role=Front-End%20Development&target=AA&level=A');
    await expect(page.locator('#target')).toHaveValue('AA');
    await expect(page.locator('#level')).toHaveValue('A');
    await expect(page.locator('#result-count')).toContainText('3 of 10');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.locator('#target')).toHaveValue('');
    await expect(page.locator('#level')).toHaveValue('');
    await expect(page.locator('#result-count')).toContainText('10 of 10');
    expect(new URL(page.url()).search).toBe('');
  });

  test('a missing criterion-level summary is distinct from no role assignment and no task', async ({ page }) => {
    await openExplorer(page);
    await page.selectOption('#role', 'Visual Design');
    await page.check('#show-all');

    await page.fill('#query', '1.4.11');
    const missing = page.locator('article.criterion', { hasText: '1.4.11 Non-text Contrast' });
    await expect(missing.locator('.summary-note')).toContainText('No criterion-level responsibility summary is recorded');
    await expect(missing.locator('.summary-note')).toContainText('not evidence that this role has no responsibility');
    await expect(missing.locator('.summary-note')).toContainText('Check the ARRM criterion mappings');
    await expect(missing.locator('.no-tasks')).toContainText('No ARRM task owned or supported by Visual Design');

    await page.fill('#query', '4.1.2');
    const recordedNotAssigned = page.locator('article.criterion', { hasText: '4.1.2 Name, Role, Value' });
    await expect(recordedNotAssigned.locator('.summary-note')).toContainText('it does not assign this role');
    await expect(recordedNotAssigned.locator('.summary-note')).toContainText('not a task-level exemption');
    await expect(recordedNotAssigned.locator('.no-tasks')).toContainText('No ARRM task owned or supported by Visual Design');

    await page.fill('#query', '2.4.7');
    const assigned = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await expect(assigned.locator('.summary-note')).toContainText('Primary, Secondary');
    await expect(assigned.locator('.summary-note')).toContainText('not task ownership');
    await expect(assigned.locator('.task-list')).toContainText('INP-017');
    await expect(assigned.locator('.task-list')).toContainText('INP-018');
  });
});
