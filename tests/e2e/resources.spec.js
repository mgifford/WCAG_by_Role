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

test.describe('external resource links', () => {
  test('criterion cards link to both plain-language explanations with external labels', async ({ page }) => {
    await page.goto('/dist/?query=2.4.7');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    const card = page.locator('article.criterion', { hasText: '2.4.7 Focus Visible' });
    await expect(card).toContainText('Plain-language explanations');
    const simple = card.getByRole('link', { name: 'Simple WCAG (external)' });
    const aaardvark = card.getByRole('link', { name: 'AAArdvark plain English (external)' });
    await expect(simple).toHaveAttribute('href', 'https://simplewcag.org/criteria/2-4-7-focus-visible/');
    await expect(aaardvark).toHaveAttribute('href', 'https://aaardvarkaccessibility.com/wcag-plain-english/2-4-7-focus-visible/');
    await expect(simple).toHaveAttribute('rel', 'external');
    await expect(aaardvark).toHaveAttribute('rel', 'external');
    expect(await simple.getAttribute('target')).toBeNull();
    expect(await aaardvark.getAttribute('target')).toBeNull();
    await expect(card.locator('.external-note')).toContainText('not W3C-endorsed');
    await expect(card.locator('.external-note')).toContainText('commercial vendor');
  });

  test('every demo criterion has both resource links in the expected URL pattern', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#data-status')).toContainText('SAMPLE DATA');
    const cards = page.locator('article.criterion');
    await expect(cards).toHaveCount(10);
    const hrefs = await cards.locator('.criterion-resources a').evaluateAll((links) => links.map((link) => link.href));
    expect(hrefs).toHaveLength(20);
    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\/(simplewcag\.org\/criteria|aaardvarkaccessibility\.com\/wcag-plain-english)\/\d+-\d+-\d+-[a-z0-9-]+\/$/);
    }
    const external = await page.locator('a[data-external="true"]').evaluateAll((links) => links.map((link) => ({rel: link.rel, target: link.target})));
    expect(external.length).toBeGreaterThanOrEqual(20);
    expect(external.every((link) => link.rel === 'external')).toBe(true);
    expect(external.every((link) => link.target === '')).toBe(true);
  });

  test('role guide criteria list repeats the plain-language links', async ({ page }) => {
    await page.goto('/dist/role.html?role=visual-design#sc-2-4-7');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    const criterion = page.locator('#sc-2-4-7');
    await expect(criterion.getByRole('link', { name: 'Simple WCAG (external)' })).toHaveAttribute(
      'href', 'https://simplewcag.org/criteria/2-4-7-focus-visible/');
    await expect(criterion.getByRole('link', { name: 'AAArdvark plain English (external)' })).toHaveAttribute(
      'href', 'https://aaardvarkaccessibility.com/wcag-plain-english/2-4-7-focus-visible/');
  });

  test('general resources distinguish W3C, commercial, testing and standards sources', async ({ page }) => {
    await page.goto('/dist/');
    const details = page.locator('#general-resources details');
    await details.locator('summary').click();
    await expect(details).toContainText('W3C links are authoritative');
    await expect(details).toContainText('not used to assign ARRM responsibility');
    await expect(details.getByRole('link', { name: 'Simple WCAG (external)' })).toBeVisible();
    await expect(details.getByRole('link', { name: /AAArdvark WCAG in Plain English \(external, commercial\)/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /axe-core rule descriptions \(external\)/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /CivicActions accessibility-data-reference/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /Purple Hats \/ Oobee project/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /Section 508 Functional Performance Criteria/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /EN 301 549/ })).toBeVisible();
    await expect(details.getByRole('link', { name: /Accessibility impact knowledge layer/ })).toBeVisible();
    await expect(details).toContainText('proposed and unreviewed');
    await expect(details).toContainText('AGPL-3.0');
    await expect(details).toContainText('last checked 2026-11-13');
  });

  test('resource disclosures and links pass axe-core in light and dark schemes', async ({ page }) => {
    await page.goto('/dist/');
    await page.locator('#general-resources details summary').click();
    expect(await axeViolations(page)).toEqual([]);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await axeViolations(page)).toEqual([]);

    await page.goto('/dist/role.html?role=visual-design');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await page.locator('#sources details summary').click();
    expect(await axeViolations(page)).toEqual([]);
  });
});
