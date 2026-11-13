import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('static discovery indexes and a role page are accessible', async ({ page }) => {
  await page.goto('/dist/roles/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Accessibility guidance by professional role');
  await expect(page.getByRole('link', { name: 'Content authors' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);

  await page.goto('/dist/roles/content-authoring/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('WCAG guidance for Content authors');
  await expect(page.getByRole('heading', { name: 'Task categories' })).toBeVisible();
  await expect(page.getByText('Images and Graphs')).toBeVisible();
  await expect(page.locator('.criterion-task-group, .criterion-group').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);

  await page.goto('/dist/data/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Download and cite WCAG by Role data');
  await expect(page.locator('a[href$="role-profiles/visual-design.yaml"]')).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
});
