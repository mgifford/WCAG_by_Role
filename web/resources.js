'use strict';

import { element, externalLink } from './dom.js';
import { DIGITALA11Y_LINKS } from './digitala11y-links.js';

export const LAST_CHECKED = '2026-11-13';

const CRITERION_RESOURCE_TEMPLATES = [
  {
    id: 'simplewcag',
    label: 'Simple WCAG',
    buildUrl: (criterion) => `https://simplewcag.org/criteria/${criterion.number.replaceAll('.', '-')}-${criterion.slug}/`,
    note: 'Independent educational explanation. Not W3C-endorsed.',
  },
  {
    id: 'aaardvark',
    label: 'AAArdvark plain English',
    buildUrl: (criterion) => `https://aaardvarkaccessibility.com/wcag-plain-english/${criterion.number.replaceAll('.', '-')}-${criterion.slug}/`,
    note: 'Independent explanation from a commercial accessibility vendor. Not W3C-endorsed.',
  },
  {
    id: 'thewcag',
    label: 'The WCAG',
    buildUrl: (criterion) => `https://thewcag.com/criteria/${criterion.number}`,
    note: 'Independent commercial resource. Not W3C-endorsed.',
  },
  {
    id: 'digitala11y',
    label: 'DigitalA11y',
    labelFor: (criterion) => DIGITALA11Y_LINKS[criterion.number] ? 'DigitalA11y' : 'Search DigitalA11y',
    buildUrl: (criterion) => DIGITALA11Y_LINKS[criterion.number] ||
      `https://www.digitala11y.com/?s=${encodeURIComponent(criterion.number)}`,
    note: 'Independent commercial resource. A search fallback means no dedicated article was found in the checked sitemap/checklist.',
  },
];

export function criterionResourceLinks(criterion) {
  if (!criterion?.number || !criterion?.slug) return [];
  return CRITERION_RESOURCE_TEMPLATES.map((resource) => ({
    id: resource.id,
    label: resource.labelFor ? resource.labelFor(criterion) : resource.label,
    url: resource.buildUrl(criterion),
    note: resource.note,
  }));
}

export function appendCriterionResources(parent, criterion, {compact = false} = {}) {
  const links = criterionResourceLinks(criterion);
  if (!links.length) return;
  const container = element(compact ? 'span' : 'p', 'criterion-resources');
  if (compact) {
    container.append(' · Plain language: ');
  } else {
    container.append(element('strong', '', 'Plain-language explanations: '));
  }
  links.forEach((resource, index) => {
    if (index) container.append(' · ');
    container.append(externalLink(resource.label + ' (external)', resource.url));
  });
  if (!compact) {
    container.append(element('span', 'external-note', ' Independent resources; not W3C-endorsed. AAArdvark, The WCAG and DigitalA11y are commercial sites.'));
  }
  parent.append(container);
}

export const GENERAL_RESOURCES = [
  {
    title: 'Authoritative WCAG and ARRM',
    links: [
      {label: 'WCAG 2.2 Recommendation', url: 'https://www.w3.org/TR/WCAG22/'},
      {label: 'Understanding WCAG 2.2', url: 'https://www.w3.org/WAI/WCAG22/Understanding/'},
      {label: 'ARRM tasks', url: 'https://www.w3.org/WAI/planning/arrm/tasks/'},
      {label: 'ARRM roles', url: 'https://www.w3.org/WAI/planning/arrm/roles/'},
      {label: 'WAI Quick Reference', url: 'https://www.w3.org/WAI/WCAG22/quickref/'},
    ],
  },
  {
    title: 'Plain-language explanations',
    note: 'Independent resources. AAArdvark, The WCAG and DigitalA11y are commercial sites. None is W3C-endorsed.',
    links: [
      {label: 'Simple WCAG (external)', url: 'https://simplewcag.org/'},
      {label: 'AAArdvark WCAG in Plain English (external, commercial)', url: 'https://aaardvarkaccessibility.com/wcag-plain-english/'},
      {label: 'The WCAG (external, commercial)', url: 'https://thewcag.com/'},
      {label: 'DigitalA11y (external, commercial)', url: 'https://www.digitala11y.com/'},
    ],
  },
  {
    title: 'Testing and rule references',
    note: 'Automated rules can find some failures; they do not establish accessibility or conformance.',
    links: [
      {label: 'axe-core rule descriptions (external)', url: 'https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md'},
      {label: 'CivicActions accessibility-data-reference (external, CC BY-SA 4.0)', url: 'https://github.com/CivicActions/accessibility-data-reference'},
      {label: 'Purple Hats / Oobee project (external, MIT; data conversions are in CivicActions)', url: 'https://github.com/GovTechSG/oobee'},
    ],
  },
  {
    title: 'Standards mappings and impact',
    note: 'These are separate from ARRM responsibility assignments. The accessibility-impact descriptions are proposed and unreviewed, and that repository is AGPL-3.0.',
    links: [
      {label: 'Section 508 Functional Performance Criteria (external)', url: 'https://www.access-board.gov/ict/#chapter-3-functional-performance-criteria'},
      {label: 'Section 508 WCAG-to-FPC mapping (external)', url: 'https://www.section508.gov/content/mapping-wcag-to-fpc/'},
      {label: 'EN 301 549 v3.2.1 (external PDF)', url: 'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf'},
      {label: 'Accessibility impact knowledge layer (external, proposed, AGPL-3.0)', url: 'https://github.com/mgifford/openacr-release-evidence/tree/main/data/accessibility-impact'},
    ],
  },
];

export function appendGeneralResources(parent) {
  if (!parent) return;
  const details = element('details', 'resources-disclosure');
  details.append(element('summary', '', 'More accessibility resources (external)'));
  details.append(element('p', 'meta', `W3C links are authoritative. Other resources are independent, may change, and are not used to assign ARRM responsibility. Per-criterion link patterns last checked ${LAST_CHECKED}.`));
  for (const group of GENERAL_RESOURCES) {
    const section = element('section', 'resource-group');
    section.append(element('h3', '', group.title));
    if (group.note) section.append(element('p', 'meta', group.note));
    const list = element('ul', 'resource-list');
    for (const resource of group.links) {
      const item = element('li');
      item.append(externalLink(resource.label, resource.url));
      list.append(item);
    }
    section.append(list);
    details.append(section);
  }
  parent.append(details);
}
