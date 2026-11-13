'use strict';

import { element, link } from './dom.js';
import { roleCardList } from './role-cards.js';
import { appendCriterionResources, appendGeneralResources } from './resources.js';
import { ROLE_ICONS, categoryIcon, createCriterionIcon, createIcon } from './visuals.js';
import {
  CATEGORY_BY_PREFIX,
  CATEGORY_ORDER,
  CATEGORY_SOURCE_URL,
  ROLE_GUIDES,
  ROLE_ORDER,
} from './role-config.js';

const LEVELS = ['primary', 'secondary', 'contributor'];
const LEVEL_LABELS = {primary: 'Primary', secondary: 'Secondary', contributor: 'Contributor'};
const $ = (id) => document.getElementById(id);
const SOURCES = {
  wcag: 'https://www.w3.org/TR/WCAG22/',
  understanding: 'https://www.w3.org/WAI/WCAG22/Understanding/',
  tasks: CATEGORY_SOURCE_URL,
  roles: 'https://www.w3.org/WAI/planning/arrm/roles/',
  mappings: 'https://www.w3.org/WAI/planning/arrm/wcag-sc/',
  quickref: 'https://www.w3.org/WAI/WCAG22/quickref/',
};

function setStatus(text, srOnly = false) {
  const status = $('role-status');
  if (!status) return;
  status.textContent = text;
  status.className = srOnly ? 'sr-only' : 'meta';
  status.hidden = false;
}

function listText(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function categoryFor(taskId) {
  const prefix = String(taskId).split('-')[0].toUpperCase();
  return CATEGORY_BY_PREFIX[prefix] || 'Other ARRM tasks';
}

function roleLevels(task, role) {
  return LEVELS.filter(level => task.ownership[level].includes(role));
}

function compareTasks(a, b) {
  return a.criterion.localeCompare(b.criterion, undefined, {numeric: true}) ||
    a.id.localeCompare(b.id, undefined, {numeric: true});
}

function roleTasks(dataset, role) {
  return dataset.tasks
    .filter(task => roleLevels(task, role).length > 0)
    .sort(compareTasks);
}

function groupTasks(tasks) {
  const groups = new Map();
  for (const task of tasks) {
    const category = categoryFor(task.id);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(task);
  }
  return CATEGORY_ORDER
    .filter(category => groups.has(category))
    .map(category => ({category, tasks: groups.get(category).sort(compareTasks)}));
}

function collaboratorsFor(tasks, role) {
  const map = new Map();
  for (const task of tasks) {
    for (const level of LEVELS) {
      for (const other of task.ownership[level]) {
        if (other === role) continue;
        if (!map.has(other)) map.set(other, {tasks: new Set(), levels: new Set()});
        const entry = map.get(other);
        entry.tasks.add(task.id);
        entry.levels.add(level);
      }
    }
  }
  return [...map.entries()]
    .map(([name, entry]) => ({
      name,
      tasks: entry.tasks.size,
      levels: LEVELS.filter(level => entry.levels.has(level)),
    }))
    .sort((a, b) => b.tasks - a.tasks || a.name.localeCompare(b.name));
}

function roleSwitcher(currentSlug) {
  const nav = $('role-switcher');
  if (!nav) return;
  nav.replaceChildren(link('Full WCAG explorer', './index.html'));
  for (const slug of ROLE_ORDER) {
    const guide = ROLE_GUIDES[slug];
    if (!guide) continue;
    const anchor = link(guide.navLabel, './role.html?role=' + encodeURIComponent(slug));
    if (slug === currentSlug) anchor.setAttribute('aria-current', 'page');
    nav.append(anchor);
  }
}

function demoNotice() {
  const notice = element('section', 'notice demo-notice');
  notice.append(element('p', '', 'Demonstration data. This role guide uses the sample dataset, not all WCAG 2.2 criteria or all ARRM tasks. The deployed site uses the full W3C source import.'));
  return notice;
}

function summarySection(dataset, role, tasks, criteria, groups) {
  const section = element('section');
  section.id = 'responsibilities';
  section.append(element('h2', '', 'Responsibilities at a glance'));
  const counts = {};
  for (const level of LEVELS) {
    counts[level] = tasks.filter(task => task.ownership[level].includes(role)).length;
  }
  const grid = element('div', 'role-summary-grid');
  for (const level of LEVELS) {
    const stat = element('div', 'role-stat role-stat-' + level);
    const value = element('strong', '', String(counts[level]));
    value.dataset.count = level;
    stat.append(value, element('span', '', LEVEL_LABELS[level] + ' tasks'));
    grid.append(stat);
  }
  const total = element('div', 'role-stat');
  const totalValue = element('strong', '', String(tasks.length));
  totalValue.dataset.count = 'tasks';
  total.append(totalValue, element('span', '', `tasks · ${criteria.length} criteria`));
  grid.append(total);
  section.append(grid);
  section.append(element('p', 'meta', 'Counts are task-level ARRM assignments in the ' + dataset.generatedAt.slice(0, 10) + ' snapshot. A task can appear under more than one responsibility level.'));

  if (groups.length) {
    const largest = [...groups].sort((a, b) => b.tasks.length - a.tasks.length).slice(0, 3);
    const focus = element('p', 'role-focus');
    focus.append(element('strong', '', 'Largest task groups in this snapshot: '));
    largest.forEach((group, index) => {
      if (index) focus.append('; ');
      focus.append(link(`${group.category} (${group.tasks.length})`, '#' + slugify('category ' + group.category)));
    });
    focus.append('.');
    section.append(focus);
  }

  const help = element('details', 'role-help');
  help.append(element('summary', '', 'How to read task groups'));
  const list = element('ul');
  list.append(element('li', '', 'The bullets show the ARRM task text and your responsibility badges. Open Related tasks and source for stable task IDs, all role assignments and links.'));
  list.append(element('li', '', 'Primary, Secondary and Contributor list every role recorded for the task; the task detail keeps the stable ARRM ID.'));
  list.append(element('li', '', 'Use the task ID from the accordion and the WCAG criterion link when recording a handoff.'));
  list.append(element('li', '', 'A missing task or criterion summary is not evidence that a role has no responsibility.'));
  help.append(list);
  section.append(help);
  return section;
}

function responsibilityBadges(task, role) {
  const levels = roleLevels(task, role);
  const wrapper = element('span', 'criterion-task-flags');
  for (const level of levels) {
    const flag = element('span', 'responsibility-flag ' + level);
    flag.append(element('span', 'sr-only', 'Your responsibility: '), LEVEL_LABELS[level]);
    wrapper.append(flag);
  }
  return wrapper;
}

function taskDetail(task, config) {
  const levels = roleLevels(task, config.role);
  const detail = element('li', 'criterion-task-detail');
  detail.id = 'task-detail-' + task.id;
  const head = element('div', 'task-detail-head');
  head.append(element('h5', 'task-id', task.id));
  head.append(element('span', 'responsibility-flag ' + levels.join(' ') + (levels.length > 1 ? ' mixed' : ''),
    'Your responsibility: ' + listText(levels.map(level => LEVEL_LABELS[level]))));
  detail.append(head);

  const assignments = element('dl', 'assignment-list');
  for (const level of LEVELS) {
    assignments.append(element('dt', '', LEVEL_LABELS[level]));
    const value = element('dd');
    const roles = task.ownership[level];
    if (!roles.length) {
      value.textContent = 'None recorded in ARRM.';
    } else {
      roles.forEach((name, index) => {
        if (index) value.append(', ');
        value.append(element('span', name === config.role ? 'current-role' : '', name));
        if (name === config.role) value.append(element('span', 'current-role-note', ' (this guide)'));
      });
    }
    assignments.append(value);
  }
  detail.append(assignments);
  return detail;
}

function criterionTaskGroup(criterion, tasks, config, category) {
  const group = element('section', 'criterion-task-group');
  group.id = 'criterion-' + slugify(category) + '-' + criterion.number.replaceAll('.', '-');
  const heading = element('h4', 'criterion-task-heading');
  const criterionIcon = createCriterionIcon(criterion.number, {className: 'sc-icon-criterion', size: 32});
  if (criterionIcon) heading.append(criterionIcon);
  heading.append(link(`${criterion.number} ${criterion.name}`, criterion.normativeUrl));
  heading.append(element('span', 'level-pill', 'Level ' + criterion.level), ' · ',
    link('Understanding', criterion.understandingUrl, '', `Understanding ${criterion.number} ${criterion.name}`));
  group.append(heading);

  const list = element('ul', 'criterion-task-list');
  for (const task of tasks) {
    const item = element('li', 'criterion-task-bullet role-task');
    item.id = 'task-' + task.id;
    item.append(element('span', 'task-description', task.text));
    item.append(responsibilityBadges(task, config.role));
    list.append(item);
  }
  group.append(list);

  const details = element('details', 'task-details criterion-task-details');
  details.append(element('summary', '', `Related tasks and source (${tasks.length})`));
  const detailList = element('ul', 'criterion-task-detail-list');
  for (const task of tasks) detailList.append(taskDetail(task, config));
  details.append(detailList);
  const source = element('p', 'criterion-task-source');
  source.append('Source: ', link('ARRM task list', SOURCES.tasks), ' · ',
    link('WCAG 2.2', criterion.normativeUrl), ' · ',
    link('Understanding', criterion.understandingUrl));
  details.append(source);
  group.append(details);
  return group;
}

function categoriesSection(config, tasks, criteriaByNumber) {
  const section = element('section');
  section.id = 'categories';
  section.append(element('h2', '', 'Task categories'));
  const categorySource = element('p', 'meta', 'Categories follow the sections on the W3C ARRM tasks page and use ARRM task ID prefixes. This is project navigation, not a WCAG taxonomy. ');
  categorySource.append(link('ARRM task list', CATEGORY_SOURCE_URL));
  section.append(categorySource);
  const groups = groupTasks(tasks);

  const nav = element('nav', 'category-nav');
  nav.setAttribute('aria-label', 'Task categories');
  const navList = element('ul');
  for (const group of groups) {
    const item = element('li');
    const anchor = link(`${group.category} (${group.tasks.length})`, '#category-' + slugify(group.category),
      '', `Skip to ${group.category}, ${group.tasks.length} tasks`);
    anchor.prepend(createIcon(categoryIcon(group.category), {className: 'category-nav-icon', size: 16}));
    item.append(anchor);
    navList.append(item);
  }
  nav.append(navList);
  section.append(nav);

  for (const group of groups) {
    const category = element('section', 'category-section');
    category.id = 'category-' + slugify(group.category);
    const heading = element('h3');
    heading.append(createIcon(categoryIcon(group.category), {className: 'category-icon', size: 24}),
      document.createTextNode(group.category + ' '), element('span', 'count-pill', String(group.tasks.length)));
    category.append(heading);
    const categorySource = element('p', 'meta', 'ARRM category. Source: ');
    categorySource.append(link('W3C ARRM tasks', CATEGORY_SOURCE_URL));
    category.append(categorySource);
    const byCriterion = new Map();
    for (const task of group.tasks) {
      if (!byCriterion.has(task.criterion)) byCriterion.set(task.criterion, []);
      byCriterion.get(task.criterion).push(task);
    }
    const criteriaGroups = [...byCriterion.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, {numeric: true}));
    const list = element('div', 'criterion-task-groups');
    for (const [number, criterionTasks] of criteriaGroups) {
      const criterion = criteriaByNumber.get(number);
      if (!criterion) continue;
      list.append(criterionTaskGroup(criterion, criterionTasks, config, group.category));
    }
    category.append(list);
    section.append(category);
  }
  return section;
}

function criteriaSection(tasks, criteria) {
  const section = element('section');
  section.id = 'criteria';
  section.append(element('h2', '', 'Related WCAG criteria'));
  section.append(element('p', '', 'These are the WCAG 2.2 success criteria referenced by the tasks above. They are requirements; the tasks are advisory ARRM responsibilities.'));

  const details = element('details', 'criteria-disclosure');
  details.open = true;
  details.append(element('summary', '', `All ${criteria.length} related criteria`));
  const list = element('ul', 'criteria-list');
  for (const criterion of criteria) {
    const item = element('li');
    item.id = 'sc-' + criterion.number.replaceAll('.', '-');
    const criterionIcon = createCriterionIcon(criterion.number, {className: 'sc-icon-criterion', size: 32});
    if (criterionIcon) item.append(criterionIcon);
    item.append(element('span', 'level-pill', 'Level ' + criterion.level), ' ',
      link(`${criterion.number} ${criterion.name}`, criterion.normativeUrl), ' · ',
      link('Understanding', criterion.understandingUrl, '', `Understanding ${criterion.number} ${criterion.name}`));
    const taskIds = tasks.filter(task => task.criterion === criterion.number).map(task => task.id);
    if (taskIds.length) {
      const taskLinks = element('span', 'criteria-task-links');
      taskLinks.append(' · Tasks: ');
      taskIds.forEach((taskId, index) => {
        if (index) taskLinks.append(', ');
        taskLinks.append(link(taskId, '#task-' + taskId));
      });
      item.append(taskLinks);
    }
    appendCriterionResources(item, criterion, {compact: true});
    if (criterion.criterionSummaryStatus === 'missing') {
      const gap = element('span', 'summary-gap', 'ARRM criterion-level summary missing; task-level assignments are still shown. ');
      gap.append(link('ARRM criterion mappings', 'https://www.w3.org/WAI/planning/arrm/wcag-sc/'));
      item.append(gap);
    }
    list.append(item);
  }
  details.append(list);
  section.append(details);
  return section;
}

function collaborationSection(tasks, config) {
  const section = element('section');
  section.id = 'collaboration';
  section.append(element('h2', '', 'Collaboration and handoff'));
  section.append(element('p', '', 'The roles below share at least one ARRM task with this role. The list is derived from ARRM assignments; it is not a prescribed sequence or a complete handoff model.'));
  const collaborators = collaboratorsFor(tasks, config.role);
  if (!collaborators.length) {
    section.append(element('p', '', 'No collaborating roles are recorded for these tasks in this snapshot.'));
  } else {
    const list = element('ul', 'collaborators');
    for (const entry of collaborators) {
      const item = element('li');
      item.append(element('strong', '', entry.name), ` — ${entry.tasks} shared ${entry.tasks === 1 ? 'task' : 'tasks'} (${listText(entry.levels.map(level => LEVEL_LABELS[level]))})`);
      list.append(item);
    }
    section.append(list);
  }

  section.append(element('h3', '', 'Handoff guidance'));
  section.append(element('p', 'project-note', 'Project guidance, not a W3C requirement. It does not assign ownership or prescribe order.'));
  const guidance = element('ul', 'role-guidance');
  for (const item of config.handoff) guidance.append(element('li', '', item));
  section.append(guidance);
  return section;
}

function sourcesSection(dataset, config) {
  const section = element('section');
  section.id = 'sources';
  section.append(element('h2', '', 'Sources and limitations'));
  section.append(element('p', 'meta', `ARRM snapshot: ${dataset.generatedAt.slice(0, 10)} · ${dataset.mode === 'demo' ? 'sample data' : 'W3C source data'}`));
  const sources = element('p', 'source-links');
  sources.append(
    link('WCAG 2.2 Recommendation', SOURCES.wcag), ' · ',
    link('Understanding WCAG 2.2', SOURCES.understanding), ' · ',
    link('ARRM tasks', SOURCES.tasks), ' · ',
    link('ARRM roles', SOURCES.roles), ' · ',
    link('ARRM criterion mappings', SOURCES.mappings), ' · ',
    link('WAI Quick Reference', SOURCES.quickref),
  );
  section.append(sources);
  const needs = element('p', 'source-links');
  needs.append('Who accessibility affects: ', link('functional-needs overview', './index.html#needs'));
  section.append(needs);
  appendGeneralResources(section);

  section.append(element('h3', '', 'What this guide does not establish'));
  const limits = element('ul');
  limits.append(element('li', '', 'A role filter does not narrow WCAG conformance obligations. The success criteria remain the requirements.'));
  limits.append(element('li', '', 'ARRM task assignments are advisory and incomplete. A missing task is not an exemption.'));
  limits.append(element('li', '', 'Primary ownership is task-level and not exclusive. Other roles may share the same criterion through different tasks.'));
  limits.append(element('li', '', 'A missing criterion-level ARRM summary does not remove task-level assignments. The import audit records missing summaries; this guide does not infer them.'));
  limits.append(element('li', '', 'The handoff guidance is project commentary, not a W3C workflow or a new responsibility model.'));
  limits.append(element('li', '', 'Completing these tasks is not proof of conformance. Manual testing with disabled people and assistive technology is still required.'));
  section.append(limits);

  section.append(element('h3', '', 'Continue'));
  const more = element('p', 'source-links');
  more.append(link('Open this role in the full explorer', './index.html?' + config.explorerQuery), ' · ',
    link('Browse every criterion', './index.html'), ' · ',
    link('Download the normalized data', './data/role-data.json'), ' · ',
    link('Download the import audit', './data/import-audit.json'));
  section.append(more);

  const otherRoles = ROLE_ORDER.filter(slug => slug !== config.slug);
  if (otherRoles.length) {
    const other = element('p', 'source-links');
    other.append('Other role guides: ');
    otherRoles.forEach((slug, index) => {
      if (index) other.append(' · ');
      const guide = ROLE_GUIDES[slug];
      other.append(link(guide.title, './role.html?role=' + encodeURIComponent(slug)));
    });
    section.append(other);
  }
  return section;
}

function applyHash() {
  document.querySelectorAll('.is-target').forEach(node => node.classList.remove('is-target'));
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const disclosure = target.closest('details');
  if (disclosure) disclosure.open = true;
  target.classList.add('is-target');
  const heading = target.querySelector('h2, h3');
  const focusTarget = target.id === 'main' ? target : (heading || target);
  if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
  target.scrollIntoView({block: 'start'});
  focusTarget.focus({preventScroll: true});
}

function renderRolePage(dataset, slug, config) {
  const root = $('role-root');
  root.replaceChildren();
  root.dataset.role = slug;
  const criteriaByNumber = new Map(dataset.criteria.map(criterion => [criterion.number, criterion]));
  const tasks = roleTasks(dataset, config.role);
  const criteria = [...new Set(tasks.map(task => task.criterion))]
    .map(number => criteriaByNumber.get(number))
    .filter(Boolean)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, {numeric: true}));

  if (dataset.mode === 'demo') root.append(demoNotice());
  if (!tasks.length) {
    const empty = element('section', 'notice');
    empty.append(element('h2', '', 'No ARRM tasks recorded for this role'));
    empty.append(element('p', '', 'This guide found no task-level ARRM assignment for ' + config.role + ' in this dataset. That does not mean the role has no accessibility responsibilities. Check the import audit and the W3C ARRM source.'));
    const emptyLinks = element('p', 'source-links');
    emptyLinks.append(link('Open the full explorer', './index.html'), ' · ', link('W3C ARRM tasks', SOURCES.tasks));
    empty.append(emptyLinks);
    root.append(empty);
    return;
  }

  const pageNav = element('nav', 'role-page-nav');
  pageNav.setAttribute('aria-label', 'On this page');
  [['responsibilities', 'Responsibilities'], ['categories', 'Task categories'], ['criteria', 'WCAG criteria'], ['collaboration', 'Collaboration'], ['sources', 'Sources']].forEach(([id, label], index) => {
    if (index) pageNav.append(' · ');
    pageNav.append(link(label, '#' + id));
  });
  root.append(pageNav);

  const groups = groupTasks(tasks);
  root.append(
    summarySection(dataset, config.role, tasks, criteria, groups),
    categoriesSection(config, tasks, criteriaByNumber),
    criteriaSection(tasks, criteria),
    collaborationSection(tasks, config),
    sourcesSection(dataset, config),
  );
  applyHash();
}

function renderChooser() {
  const root = $('role-root');
  root.replaceChildren();
  $('page-title').textContent = 'Choose a role guide';
  $('page-intro').textContent = 'Role guides organize the ARRM tasks and WCAG criteria most relevant to a professional role. The full WCAG explorer remains available for every criterion.';
  document.title = 'Role guides | WCAG by Role';
  const section = element('section');
  section.id = 'responsibilities';
  section.append(element('h2', '', 'Role guides'));
  section.append(element('p', '', 'Start with the work you do. Each guide is derived from the same W3C ARRM task assignments and links back to the normative WCAG criteria.'));
  section.append(roleCardList());
  const links = element('p', 'source-links');
  links.append(link('Open the full WCAG explorer', './index.html'));
  section.append(links);
  root.append(section);
}

async function init() {
  const params = new URLSearchParams(location.search);
  const slug = params.get('role');
  const config = slug ? ROLE_GUIDES[slug] : null;
  roleSwitcher(slug);
  if (!config) {
    renderChooser();
    setStatus(slug ? 'Unknown role guide.' : 'Choose a role guide.');
    return;
  }

  document.title = config.title + ' | WCAG by Role';
  $('page-title').replaceChildren(
    createIcon(ROLE_ICONS[slug] || 'other', {className: 'role-title-icon', size: 34}),
    document.createTextNode(config.title),
  );
  $('page-intro').textContent = config.intro;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', config.cardCopy + ' Task-level responsibilities from W3C ARRM, with links to WCAG 2.2 and Understanding.');
  setStatus('Loading role guide...');

  try {
    const response = await fetch('./data/role-data.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const dataset = await response.json();
    if (!Array.isArray(dataset.criteria) || !Array.isArray(dataset.tasks) || !Array.isArray(dataset.roles)) {
      throw new Error('Invalid data structure');
    }
    renderRolePage(dataset, slug, config);
    setStatus('Role guide loaded.', true);
  } catch (error) {
    setStatus('Role guide data unavailable.');
    const root = $('role-root');
    root.replaceChildren();
    const failure = element('section', 'notice error');
    failure.append(element('h2', '', 'Could not load the role guide'));
    failure.append(element('p', '', 'The normalized data could not be loaded. Build the project with scripts/pipeline.py and serve the dist directory over HTTP, or use the official W3C links below.'));
    const links = element('p', 'source-links');
    links.append(link('Full WCAG 2.2 Recommendation', SOURCES.wcag), ' · ', link('W3C ARRM tasks', SOURCES.tasks));
    failure.append(links);
    root.append(failure);
    console.error(error);
  }
}

window.addEventListener('hashchange', applyHash);
init();
