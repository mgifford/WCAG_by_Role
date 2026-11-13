'use strict';

import { appendParagraph, element, link } from './dom.js';
import { roleCardList } from './role-cards.js';
import { appendCriterionResources, appendGeneralResources } from './resources.js';
import { OWNERSHIP_LEVELS, matchesCriterionLevel, roleLevels } from './filtering.js';
import { appendFunctionalNeeds, createCriterionIcon } from './visuals.js';

const $ = (id) => document.getElementById(id);
const filters = $('filters');
const resultRoot = $('results');
const state = {role: '', ownership: '', target: '', level: '', view: 'criteria', query: '', showAll: false};
const stateKeys = ['role', 'ownership', 'target', 'level', 'view', 'query'];
const levels = OWNERSHIP_LEVELS;
const targets = ['A', 'AA', 'AAA'];
const ARRM_MAPPINGS = 'https://www.w3.org/WAI/planning/arrm/wcag-sc/';
const display = {'primary': 'Primary', 'secondary': 'Secondary', 'contributor': 'Contributor'};
let dataset = null;

function rolesForTask(task, role) {
  return roleLevels(task, role, state.ownership);
}
function taskMatches(task) {
  return rolesForTask(task, state.role).length > 0;
}
function criterionMatchesSearch(sc, tasks, q) {
  if (!q) return {found: true, tasks};
  const meta = [sc.number, sc.name, sc.guideline, sc.principle, sc.summary].join(' ').toLowerCase();
  if (meta.includes(q)) return {found: true, tasks};
  const matches = tasks.filter(task => [task.id, task.text, task.stage, ...Object.values(task.ownership).flat()]
    .join(' ').toLowerCase().includes(q));
  return {found: matches.length > 0, tasks: matches};
}
function tasksFor(sc) {
  const candidates = dataset.tasks.filter(t => t.criterion === sc.number && taskMatches(t));
  return criterionMatchesSearch(sc, candidates, state.query.trim().toLowerCase());
}
function matchesLevel(sc) {
  return matchesCriterionLevel(sc.level, {target: state.target, exact: state.level});
}
function hasRoleFilter() { return Boolean(state.role || state.ownership); }
function matchingEntries() {
  return dataset.criteria.filter(matchesLevel).map(sc => ({sc, ...tasksFor(sc)}))
    .filter(x => x.found && (!hasRoleFilter() || x.tasks.length || state.showAll));
}
function addRoleSummary(parent, sc, hasMatchingTasks) {
  if (!state.role) return;
  const flags = sc.arrmResponsibilities?.[state.role] ?? [];
  const summary = element('p', 'summary-note');
  summary.append(element('strong', '', 'ARRM criterion-level summary: '));
  if (sc.criterionSummaryStatus === 'missing') {
    summary.append(document.createTextNode('No criterion-level responsibility summary is recorded for this criterion. Task-level assignments may still exist below. This is not evidence that this role has no responsibility. '));
    summary.append(link('Check the ARRM criterion mappings', ARRM_MAPPINGS));
  } else if (!flags.length) {
    summary.append(document.createTextNode('ARRM records a criterion-level summary, but it does not assign this role. That is not a task-level exemption. Check the task assignments below and the ARRM source. '));
    summary.append(link('ARRM criterion mappings', ARRM_MAPPINGS));
  } else if (hasMatchingTasks) {
    summary.append(document.createTextNode(flags.map(f => display[f]).join(', ') + '. This is a criterion-level overview, not task ownership. Task-level assignments are listed below.'));
  } else {
    summary.append(document.createTextNode(flags.map(f => display[f]).join(', ') + '. This is a criterion-level overview, not a task assignment. No ARRM task for this role is recorded in this view.'));
  }
  parent.append(summary);
}
function addBrief(parent, sc) {
  const brief = sc.inBrief || {};
  const fields = [['goal', 'Goal'], ['whatToDo', 'What to do'], ['authorTask', 'Author task'], ['whyImportant', "Why it’s important"]];
  if (!fields.some(([key]) => brief[key])) return;
  const details = element('details', 'brief');
  details.append(element('summary', '', 'Understanding: In Brief (W3C, informative)'));
  if (!brief.goal || !brief.whyImportant || (!brief.whatToDo && !brief.authorTask)) {
    details.append(element('p', 'brief-note', 'Only part of the W3C In Brief text could be extracted. The official Understanding document remains the source.'));
  }
  const dl = element('dl', 'brief-grid');
  fields.forEach(([key, title]) => {
    if (!brief[key]) return;
    dl.append(element('dt', '', title), element('dd', '', brief[key]));
  });
  details.append(dl, link('Read the full W3C Understanding document', sc.understandingUrl,
    '', 'Read the full W3C Understanding document for Success Criterion ' + sc.number + ' ' + sc.name));
  parent.append(details);
}
function makeTask(task) {
  const item = element('li', 'task');
  const top = element('div', 'task-top');
  top.append(element('span', 'task-id', task.id));
  if (task.starter) top.append(element('span', 'starter', 'ARRM starter task'));
  item.append(top, element('p', 'task-description', task.text));
  const ownership = element('ul', 'ownership');
  for (const level of rolesForTask(task, state.role)) {
    const roles = state.role ? [state.role] : task.ownership[level];
    const li = element('li', 'ownership-' + level, display[level] + ': ' + roles.join(', '));
    ownership.append(li);
  }
  item.append(ownership);
  return item;
}
function makeCriterion({sc, tasks}) {
  const card = element('article', 'criterion');
  card.id = 'sc-' + sc.number.replaceAll('.', '-');
  const heading = element('h4', 'criterion-heading');
  const criterionIcon = createCriterionIcon(sc.number, {className: 'sc-icon-card', size: 56});
  if (criterionIcon) heading.append(criterionIcon);
  heading.append(link(sc.number + ' ' + sc.name, sc.normativeUrl));
  heading.append(element('span', 'level-pill', 'Level ' + sc.level));
  card.append(heading);
  appendParagraph(card, sc.principle + ' · ' + sc.guideline, 'subtle');
  const sources = element('p', 'source-links');
  sources.append(link('Normative criterion', sc.normativeUrl, '',
    'Normative criterion: WCAG 2.2 Success Criterion ' + sc.number + ' ' + sc.name), document.createTextNode(' · '),
    link('Understanding', sc.understandingUrl, '',
      'Understanding: W3C document for Success Criterion ' + sc.number + ' ' + sc.name));
  card.append(sources);
  appendCriterionResources(card, sc);
  addRoleSummary(card, sc, tasks.length > 0);
  addBrief(card, sc);
  if (tasks.length) {
    const title = element('h5', 'tasks-heading', 'Task-level ARRM assignments (' + tasks.length + ')');
    card.append(title);
    const list = element('ul', 'task-list');
    tasks.forEach(task => list.append(makeTask(task)));
    card.append(list);
  } else {
    const noTasks = state.role
      ? `No ARRM task owned or supported by ${state.role} is recorded in this view. This does not indicate an exception to WCAG or an absence of responsibility.`
      : 'No matching ARRM task in this view. This does not indicate an exception to WCAG or an absence of responsibility.';
    appendParagraph(card, noTasks, 'no-tasks');
  }
  return card;
}
function makeTaskRow(task) {
  const row = element('article', 'criterion');
  const h = element('h4', 'criterion-heading');
  const sc = dataset.criteria.find(c => c.number === task.criterion);
  const criterionIcon = createCriterionIcon(sc.number, {className: 'sc-icon-task', size: 40});
  if (criterionIcon) h.append(criterionIcon);
  h.append(link(task.id + ' · ' + sc.number + ' ' + sc.name, sc.normativeUrl));
  h.append(element('span', 'level-pill', 'Level ' + sc.level));
  const list = element('ul', 'task-list');
  list.append(makeTask(task));
  row.append(h, list);
  const refs = element('p', 'source-links');
  refs.append(link('Understanding', sc.understandingUrl, '',
    'Understanding: W3C document for Success Criterion ' + sc.number + ' ' + sc.name), document.createTextNode(' · '),
    link('ARRM tasks', 'https://www.w3.org/WAI/planning/arrm/tasks/', '', 'ARRM tasks: W3C task inventory'));
  row.append(refs);
  return row;
}
function render() {
  if (!dataset) return;
  const entries = matchingEntries();
  const shownTasks = entries.flatMap(x => x.tasks);
  const total = dataset.criteria.length;
  const mode = dataset.mode === 'demo' ? 'SAMPLE DATA' : 'W3C source data';
  $('data-status').textContent = mode + ' · ' + dataset.generatedAt.slice(0, 10);
  $('result-count').textContent = `${entries.length} of ${total} active WCAG 2.2 criteria · ${shownTasks.length} matching ARRM tasks`;
  resultRoot.replaceChildren();
  if (!entries.length) {
    resultRoot.append(element('p', 'empty', 'No records match. Reset filters or include criteria without matching tasks.'));
    return;
  }
  if (state.view === 'tasks') {
    if (!shownTasks.length) resultRoot.append(element('p', 'empty', 'No matching ARRM tasks. Try the success criterion view.'));
    shownTasks.forEach(t => resultRoot.append(makeTaskRow(t)));
  } else {
    entries.forEach(row => resultRoot.append(makeCriterion(row)));
  }
}
function readURL() {
  const params = new URLSearchParams(location.search);
  for (const key of stateKeys) {
    state[key] = params.get(key) || state[key];
  }
  state.showAll = params.get('all') === '1';
}
function applyToForm() {
  stateKeys.forEach(key => {$(key).value = state[key];});
  $('show-all').checked = state.showAll;
}
function readForm() {
  stateKeys.forEach(key => {state[key] = $(key).value;});
  state.showAll = $('show-all').checked;
}
function writeURL() {
  const params = new URLSearchParams();
  stateKeys.forEach(key => {
    if (state[key] && !(key === 'view' && state.view === 'criteria')) params.set(key, state[key]);
  });
  if (state.showAll) params.set('all', '1');
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
}
function renderRoleGuides() {
  const root = $('role-guides-list');
  if (!root) return;
  root.replaceChildren(roleCardList());
}

async function init() {
  renderRoleGuides();
  appendFunctionalNeeds($('functional-needs-list'));
  appendGeneralResources($('general-resources'));
  try {
    const response = await fetch('./data/role-data.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    dataset = await response.json();
    if (!Array.isArray(dataset.criteria) || !Array.isArray(dataset.tasks)) throw new Error('Invalid data structure');
    dataset.roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = role;
      $('role').append(option);
    });
    readURL();
    applyToForm();
    if (!dataset.roles.includes(state.role)) {state.role = ''; $('role').value = '';}
    if (!targets.includes(state.target)) {state.target = ''; $('target').value = '';}
    if (dataset.mode === 'demo') {
      $('demo-warning').hidden = false;
    }
    filters.addEventListener('input', () => {readForm(); writeURL(); render();});
    filters.addEventListener('change', () => {readForm(); writeURL(); render();});
    filters.addEventListener('submit', event => event.preventDefault());
    filters.addEventListener('reset', event => {
      event.preventDefault();
      Object.assign(state, {role: '', ownership: '', target: '', level: '', view: 'criteria', query: '', showAll: false});
      applyToForm(); writeURL(); render();
    });
    render();
  } catch (error) {
    $('data-status').textContent = 'Data unavailable';
    resultRoot.replaceChildren(element('p', 'error',
      'Could not load generated records. Build the project with scripts/pipeline.py and serve the dist directory over HTTP.'));
    console.error(error);
  }
}
init();
