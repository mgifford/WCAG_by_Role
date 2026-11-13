import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('credits page exposes W3C, ARRM and RoboHash attribution', async ({ page }) => {
  await page.goto('/dist/credits.html');
  await expect(page).toHaveTitle('Credits and licences | WCAG by Role');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Credits and licences');
  await expect(page.getByRole('heading', { name: 'Persona illustrations' })).toBeVisible();
  await expect(page.getByText('Zikri Kader')).toBeVisible();
  await expect(page.getByText('CC BY 4.0')).toBeVisible();
  await expect(page.locator('a[href*=".png?set=set1"]')).toHaveCount(5);
  await expect(page.getByText('unvalidated-draft')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
