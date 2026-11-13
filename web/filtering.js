'use strict';

export const OWNERSHIP_LEVELS = ['primary', 'secondary', 'contributor'];
export const LEVEL_RANK = {A: 1, AA: 2, AAA: 3};

export function roleLevels(task, role, ownership = '') {
  return OWNERSHIP_LEVELS.filter(level => (!ownership || level === ownership) &&
    (role ? task.ownership[level].includes(role) : task.ownership[level].length > 0));
}

export function matchesTarget(level, target = '') {
  return !target || (LEVEL_RANK[level] ?? 0) <= LEVEL_RANK[target];
}

export function matchesExact(level, exact = '') {
  return !exact || level === exact;
}

export function matchesCriterionLevel(level, {target = '', exact = ''} = {}) {
  return matchesTarget(level, target) && matchesExact(level, exact);
}
