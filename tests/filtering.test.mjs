import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_RANK, matchesCriterionLevel, matchesExact, matchesTarget, roleLevels } from '../web/filtering.js';

const tasks = [
  {id: 'T-A-P', criterion: '1.1.1', ownership: {primary: ['Visual Design'], secondary: ['Front-End Development'], contributor: []}},
  {id: 'T-A-S', criterion: '1.1.1', ownership: {primary: ['Content Authoring'], secondary: ['Visual Design'], contributor: ['Front-End Development']}},
  {id: 'T-AA', criterion: '1.4.3', ownership: {primary: ['Visual Design'], secondary: [], contributor: ['Content Authoring']}},
  {id: 'T-AAA', criterion: '2.1.3', ownership: {primary: ['Front-End Development'], secondary: [], contributor: ['Visual Design']}},
];
const levels = {'1.1.1': 'A', '1.4.3': 'AA', '2.1.3': 'AAA'};
const roles = ['', 'Visual Design', 'Front-End Development', 'Content Authoring'];
const ownerships = ['', 'primary', 'secondary', 'contributor'];
const targets = ['', 'A', 'AA', 'AAA'];
const exacts = ['', 'A', 'AA', 'AAA'];

test('roleLevels separates primary, secondary and contributor assignments', () => {
  assert.deepEqual(roleLevels(tasks[0], 'Visual Design'), ['primary']);
  assert.deepEqual(roleLevels(tasks[0], 'Front-End Development'), ['secondary']);
  assert.deepEqual(roleLevels(tasks[0], 'Visual Design', 'secondary'), []);
  assert.deepEqual(roleLevels(tasks[1], 'Visual Design'), ['secondary']);
  assert.deepEqual(roleLevels(tasks[1], 'Front-End Development'), ['contributor']);
  assert.deepEqual(roleLevels(tasks[3], '', 'contributor'), ['contributor']);
  assert.deepEqual(roleLevels(tasks[3], ''), ['primary', 'contributor']);
});

test('target is cumulative and exact level is independent', () => {
  assert.equal(matchesTarget('A', ''), true);
  assert.equal(matchesTarget('AA', 'A'), false);
  assert.equal(matchesTarget('A', 'AA'), true);
  assert.equal(matchesTarget('AA', 'AA'), true);
  assert.equal(matchesTarget('AAA', 'AA'), false);
  assert.equal(matchesTarget('AAA', 'AAA'), true);
  assert.equal(matchesExact('AA', ''), true);
  assert.equal(matchesExact('AA', 'A'), false);
  assert.equal(matchesExact('A', 'A'), true);
  assert.equal(matchesCriterionLevel('A', {target: 'AA', exact: 'A'}), true);
  assert.equal(matchesCriterionLevel('AA', {target: 'A', exact: 'AA'}), false);
  assert.equal(LEVEL_RANK.A < LEVEL_RANK.AA && LEVEL_RANK.AA < LEVEL_RANK.AAA, true);
});

test('every role, ownership, target and exact-level combination preserves the filter invariants', () => {
  for (const role of roles) {
    for (const ownership of ownerships) {
      const roleMatched = tasks.filter(task => roleLevels(task, role, ownership).length > 0);
      for (const target of targets) {
        for (const exact of exacts) {
          const result = roleMatched.filter(task => matchesCriterionLevel(levels[task.criterion], {target, exact}));
          for (const task of result) {
            const level = levels[task.criterion];
            if (role) assert.ok(roleLevels(task, role, ownership).length > 0, `${task.id} lost its role assignment`);
            if (ownership) assert.ok(roleLevels(task, '', ownership).length > 0, `${task.id} lost its ownership level`);
            if (target) assert.ok(LEVEL_RANK[level] <= LEVEL_RANK[target], `${task.id} exceeded target ${target}`);
            if (exact) assert.equal(level, exact, `${task.id} failed exact level ${exact}`);
          }
          if (!target && !exact) assert.deepEqual(result, roleMatched, `${role}/${ownership} changed with no level filter`);
        }
      }
    }
  }
});

test('target A cannot include AA or AAA criteria', () => {
  const result = tasks.filter(task => matchesCriterionLevel(levels[task.criterion], {target: 'A'}));
  assert.deepEqual(result.map(task => task.id), ['T-A-P', 'T-A-S']);
});

test('target AA includes A and AA but not AAA', () => {
  const result = tasks.filter(task => matchesCriterionLevel(levels[task.criterion], {target: 'AA'}));
  assert.deepEqual(result.map(task => task.id), ['T-A-P', 'T-A-S', 'T-AA']);
});
