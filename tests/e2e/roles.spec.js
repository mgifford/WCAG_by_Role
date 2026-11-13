import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function openRole(page, slug) {
  await page.goto(`/dist/role.html?role=${slug}`);
  await expect(page.locator('#role-root')).toHaveAttribute('data-role', slug);
}

async function tabTo(page, selector) {
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((target) => document.activeElement?.matches(target), selector)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}`);
}

async function axeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

test.describe('role guides', () => {
  test('visual design guide shows task-level responsibilities and all collaborators', async ({ page }) => {
    await openRole(page, 'visual-design');
    await expect(page).toHaveTitle('WCAG for Visual Designers | WCAG by Role');
    await expect(page.locator('#page-title')).toHaveText('WCAG for Visual Designers');
    await expect(page.locator('#role-switcher a[aria-current="page"]')).toContainText('Visual design');
    await expect(page.locator('#role-switcher a')).toHaveText([
      'Full WCAG explorer', 'Business analysis', 'Content authoring', 'UX design', 'Visual design', 'Front-end development',
    ]);
    await expect(page.locator('[data-count="primary"]')).toHaveText('4');
    await expect(page.locator('[data-count="secondary"]')).toHaveText('3');
    await expect(page.locator('[data-count="contributor"]')).toHaveText('1');
    await expect(page.locator('[data-count="tasks"]')).toHaveText('8');
    await expect(page.locator('.role-task')).toHaveCount(8);

    const primaryTask = page.locator('#task-INP-017');
    await expect(primaryTask.locator('.responsibility-flag')).toContainText('Your responsibility: Primary');
    const focusGroup = page.locator('.criterion-task-group').filter({has: primaryTask});
    await focusGroup.locator('summary').click();
    const primaryDetail = page.locator('#task-detail-INP-017');
    await expect(primaryDetail.getByRole('heading', { name: 'INP-017' })).toBeVisible();
    await expect(primaryDetail.locator('.assignment-list dd').nth(0)).toContainText('Visual Design');
    await expect(primaryDetail.locator('.assignment-list dd').nth(0)).toContainText('(this guide)');
    await expect(primaryDetail.locator('.assignment-list dd').nth(1)).toContainText('User Experience (UX) Design');

    const secondaryDetail = page.locator('#task-detail-INP-018');
    await expect(secondaryDetail.locator('.responsibility-flag')).toContainText('Your responsibility: Secondary');
    await expect(secondaryDetail.locator('.assignment-list dd').nth(0)).toContainText('Front-End Development');
    await expect(secondaryDetail.locator('.assignment-list dd').nth(1)).toContainText('Visual Design');
    await expect(secondaryDetail.locator('.assignment-list dd').nth(1)).toContainText('(this guide)');

    await expect(page.locator('.category-nav')).toContainText('CSS and Presentation (4)');
    await expect(page.locator('.category-nav')).toContainText('Input Modalities (3)');
    await expect(page.locator('.category-nav')).not.toContainText('Semantic Structure');
    await expect(page.locator('#collaboration')).toContainText('Front-End Development');
    await expect(page.locator('#collaboration')).toContainText('User Experience (UX) Design');
    await expect(page.locator('#collaboration')).toContainText('Project guidance, not a W3C requirement');
  });

  test('front-end guide uses development categories rather than reusing the visual design list', async ({ page }) => {
    await openRole(page, 'front-end-development');
    await expect(page).toHaveTitle('WCAG for Front-End Developers | WCAG by Role');
    await expect(page.locator('[data-count="primary"]')).toHaveText('5');
    await expect(page.locator('[data-count="secondary"]')).toHaveText('1');
    await expect(page.locator('[data-count="contributor"]')).toHaveText('1');
    await expect(page.locator('[data-count="tasks"]')).toHaveText('7');
    await expect(page.locator('.role-task')).toHaveCount(7);
    await expect(page.locator('.category-nav')).toContainText('Semantic Structure (1)');
    await expect(page.locator('.category-nav')).toContainText('Images and Graphs (1)');

    const cssTask = page.locator('#task-CSS-022');
    await expect(cssTask.locator('.responsibility-flag')).toContainText('Your responsibility: Primary');
    const cssGroup = page.locator('.criterion-task-group').filter({has: cssTask});
    await cssGroup.locator('summary').click();
    const cssDetail = page.locator('#task-detail-CSS-022');
    await expect(cssDetail.locator('.assignment-list dd').nth(0)).toContainText('Front-End Development');
    await expect(cssDetail.locator('.assignment-list dd').nth(1)).toContainText('Visual Design');
  });

  test('remaining ARRM role guides render their own task and category data', async ({ page }) => {
    await openRole(page, 'business-analysis');
    await expect(page).toHaveTitle('WCAG for Business Analysts | WCAG by Role');
    await expect(page.locator('[data-count="primary"]')).toHaveText('1');
    await expect(page.locator('[data-count="secondary"]')).toHaveText('0');
    await expect(page.locator('[data-count="contributor"]')).toHaveText('0');
    await expect(page.locator('[data-count="tasks"]')).toHaveText('1');
    await expect(page.locator('.category-nav')).toContainText('Images and Graphs (1)');

    await openRole(page, 'content-authoring');
    await expect(page).toHaveTitle('WCAG for Content Authors | WCAG by Role');
    await expect(page.locator('[data-count="primary"]')).toHaveText('1');
    await expect(page.locator('[data-count="secondary"]')).toHaveText('2');
    await expect(page.locator('[data-count="contributor"]')).toHaveText('0');
    await expect(page.locator('[data-count="tasks"]')).toHaveText('3');
    await expect(page.locator('.category-nav')).toContainText('Images and Graphs (2)');
    await expect(page.locator('.category-nav')).toContainText('Other ARRM tasks (1)');

    await openRole(page, 'user-experience-design');
    await expect(page).toHaveTitle('WCAG for UX Designers | WCAG by Role');
    await expect(page.locator('[data-count="primary"]')).toHaveText('2');
    await expect(page.locator('[data-count="secondary"]')).toHaveText('4');
    await expect(page.locator('[data-count="contributor"]')).toHaveText('1');
    await expect(page.locator('[data-count="tasks"]')).toHaveText('7');
    await expect(page.locator('.category-nav')).toContainText('Images and Graphs (2)');
    await expect(page.locator('.category-nav')).toContainText('Input Modalities (2)');
    await expect(page.locator('.category-nav')).toContainText('Semantic Structure (1)');
  });

  test('criterion groups use task text bullets and keep IDs and sources in the accordion', async ({ page }) => {
    await openRole(page, 'visual-design');
    const task = page.locator('#task-INP-017');
    await expect(task).toContainText('Every element that receives keyboard focus is designed to display a visible focus indicator.');
    const group = page.locator('.criterion-task-group').filter({has: task});
    await expect(group.locator('.criterion-task-heading a[href="https://www.w3.org/TR/WCAG22/#focus-visible"]')).toHaveCount(1);
    await expect(group.locator('.criterion-task-heading a[href="https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html"]')).toHaveCount(1);
    await expect(group.locator('.criterion-task-bullet .task-id')).toHaveCount(0);
    await expect(group.locator('summary')).toHaveText('Related tasks and source (2)');
    await expect(group.locator('.task-details')).not.toHaveAttribute('open', '');
    await group.locator('summary').click();
    await expect(group.locator('.task-id')).toHaveText(['INP-017', 'INP-018']);
    await expect(group.locator('.criterion-task-source')).toContainText('ARRM task list');
    await expect(group.locator('.criterion-task-source')).toContainText('WCAG 2.2');
  });

  test('each role criterion group links to its specific plain-language explanations', async ({ page }) => {
    await openRole(page, 'content-authoring');
    const group = page.locator('.criterion-task-group').first();
    const resources = group.locator('.criterion-resources a');
    await expect(resources).toHaveCount(4);
    await expect(group.locator('.criterion-resources')).toContainText('Plain-language explanations:');
    await expect(group.locator('.criterion-resources')).toContainText('not W3C-endorsed');
    const links = await resources.evaluateAll((nodes) => nodes.map((node) => ({
      label: node.textContent, href: node.href, rel: node.rel, target: node.target,
    })));
    expect(links.map((entry) => entry.href)).toEqual([
      'https://simplewcag.org/criteria/1-1-1-non-text-content/',
      'https://aaardvarkaccessibility.com/wcag-plain-english/1-1-1-non-text-content/',
      'https://thewcag.com/criteria/1.1.1',
      'https://www.digitala11y.com/understanding-sc-1-1-1-non-text-content/',
    ]);
    for (const entry of links) {
      expect(entry.label).toContain('(external)');
      expect(entry.rel).toBe('external');
      expect(entry.target).toBe('');
    }
  });

  test('a criterion with tasks in two categories is grouped under each category', async ({ page }) => {
    await openRole(page, 'visual-design');
    const inputGroup = page.locator('#category-input-modalities .criterion-task-group').filter({hasText: '2.4.7 Focus Visible'});
    const cssGroup = page.locator('#category-css-and-presentation .criterion-task-group').filter({hasText: '2.4.7 Focus Visible'});
    await expect(inputGroup).toHaveCount(1);
    await expect(cssGroup).toHaveCount(1);
    await expect(inputGroup.locator('.criterion-task-bullet')).toHaveCount(2);
    await expect(cssGroup.locator('.criterion-task-bullet')).toHaveCount(1);
    await expect(inputGroup).toContainText('INP-017');
    await expect(cssGroup).toContainText('CSS-022');
  });

  test('content authoring groups task text under its success criterion', async ({ page }) => {
    await openRole(page, 'content-authoring');
    const group = page.locator('.criterion-task-group').filter({hasText: '1.1.1 Non-text Content'});
    await expect(group.locator('.criterion-task-bullet')).toHaveCount(2);
    await expect(group).toContainText('Informative alternate text is provided for images');
    await expect(group).toContainText('Purely decorative images are provided with null alt attribute values');
    await expect(group.locator('.criterion-task-details')).not.toHaveAttribute('open', '');
    await expect(group.locator('.task-id')).toHaveCount(2);
  });

  test('criteria list links each criterion back to its task anchors', async ({ page }) => {
    await openRole(page, 'visual-design');
    const criterion = page.locator('#sc-2-4-7');
    await expect(criterion).toContainText('2.4.7 Focus Visible');
    await expect(criterion.locator('a[href="https://www.w3.org/TR/WCAG22/#focus-visible"]')).toHaveCount(1);
    await expect(criterion.locator('a[href="https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html"]')).toHaveCount(1);
    await expect(criterion.locator('a[href="#task-INP-017"]')).toHaveCount(1);
    await expect(criterion.locator('a[href="#task-INP-018"]')).toHaveCount(1);
    await expect(criterion).toContainText('Tasks:');
  });

  test('category, task and criterion anchors are stable deep links', async ({ page }) => {
    await page.goto('/dist/role.html?role=visual-design#task-INP-017');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await expect(page.locator('#task-INP-017')).toBeVisible();
    await expect(page.locator('#task-INP-017')).toHaveClass(/is-target/);
    await expect(page.locator('#task-INP-017')).toBeFocused();

    await page.goto('/dist/role.html?role=visual-design#sc-2-4-7');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await expect(page.locator('#sc-2-4-7')).toHaveClass(/is-target/);
    await expect(page.locator('#sc-2-4-7')).toBeFocused();

    await page.goto('/dist/role.html?role=visual-design');
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await page.getByRole('link', { name: /CSS and Presentation \(4\)/ }).click();
    await expect(page).toHaveURL(/#category-css-and-presentation$/);
    await expect(page.locator('#category-css-and-presentation')).toBeVisible();
    await expect(page.locator('#category-css-and-presentation h3')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/role\.html\?role=visual-design$/);
    await expect(page.locator('#category-css-and-presentation')).not.toHaveClass(/is-target/);
  });

  test('unknown role shows a chooser instead of silently defaulting', async ({ page }) => {
    await page.goto('/dist/role.html?role=unknown-role');
    await expect(page.locator('#page-title')).toHaveText('Choose a role guide');
    await expect(page.locator('.role-path-list .role-path')).toHaveCount(5);
    await expect(page.locator('#role-root')).not.toHaveAttribute('data-role', /.+/);
  });

  test('the generic explorer links to both role guides and keeps its filters', async ({ page }) => {
    await page.goto('/dist/');
    await expect(page.locator('#role-guides-list .role-path')).toHaveCount(5);
    await page.getByRole('link', { name: /WCAG for Visual Designers/ }).click();
    await expect(page).toHaveURL(/\/dist\/role\.html\?role=visual-design$/);
    await expect(page.locator('#role-root')).toHaveAttribute('data-role', 'visual-design');
    await page.getByRole('link', { name: 'Full WCAG explorer' }).click();
    await expect(page.locator('#filters')).toBeVisible();
    await expect(page.locator('#role-guides')).toBeVisible();
  });

  test('role pages have no axe-core WCAG A/AA violations in light or dark schemes', async ({ page }) => {
    for (const slug of ['business-analysis', 'content-authoring', 'user-experience-design', 'visual-design', 'front-end-development']) {
      await openRole(page, slug);
      expect(await axeViolations(page), `${slug} light`).toEqual([]);
      await page.emulateMedia({ colorScheme: 'dark' });
      expect(await axeViolations(page), `${slug} dark`).toEqual([]);
      await page.emulateMedia({ colorScheme: 'light' });
    }
  });

  test('role page reflows at 320 CSS pixels without horizontal page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openRole(page, 'visual-design');
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });

  test('role page keeps a visible focus indicator in forced-colors mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openRole(page, 'visual-design');
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    await tabTo(page, '.category-nav a');
    const categoryLink = page.locator('.category-nav a').first();
    const style = await categoryLink.evaluate((node) => {
      const computed = getComputedStyle(node);
      return { outlineStyle: computed.outlineStyle, outlineWidth: Number.parseFloat(computed.outlineWidth) };
    });
    expect(style.outlineStyle).not.toBe('none');
    expect(style.outlineWidth).toBeGreaterThan(0);
    const task = page.locator('#task-INP-017');
    const border = await task.evaluate((node) => getComputedStyle(node).borderStyle);
    expect(border).not.toBe('none');
  });

  test('skip link moves focus to the main landmark', async ({ page }) => {
    await openRole(page, 'visual-design');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('keyboard navigation reaches the skip link, role switcher and category links', async ({ page }) => {
    await openRole(page, 'visual-design');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    for (let index = 0; index < 20; index += 1) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.getAttribute('aria-current') === 'page')) break;
    }
    await expect(page.locator('#role-switcher a[aria-current="page"]')).toBeFocused();
  });
});
