'use strict';

import { element } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
export const CRITERION_ICON_SPRITE = './wcag22-icons.svg';

// Original line icons, MIT-licensed with the rest of the project. They are
// decorative next to visible text; keep aria-hidden unless a standalone label
// is explicitly supplied.
export const ICONS = {
  image: [
    ['rect', {x: 3, y: 4, width: 18, height: 16, rx: 2}],
    ['circle', {cx: 8.5, cy: 9, r: 1.5}],
    ['path', {d: 'M4 17l5-5 4 4 3-3 4 4'}],
  ],
  structure: [
    ['rect', {x: 9, y: 3, width: 6, height: 5, rx: 1}],
    ['rect', {x: 3, y: 16, width: 6, height: 5, rx: 1}],
    ['rect', {x: 15, y: 16, width: 6, height: 5, rx: 1}],
    ['path', {d: 'M12 8v4M6 14v2M12 12v4M18 14v2M6 14h12'}],
  ],
  input: [
    ['path', {d: 'M5 3l14 8-6 2-2 6z'}],
    ['path', {d: 'M13 13l4 4'}],
  ],
  form: [
    ['rect', {x: 3, y: 4, width: 18, height: 16, rx: 2}],
    ['path', {d: 'M7 9h6'}],
    ['rect', {x: 7, y: 12, width: 10, height: 4, rx: 1}],
  ],
  css: [
    ['path', {d: 'M4 20l4-1 10-10-3-3L5 16z'}],
    ['path', {d: 'M14 6l4 4M4 20l1-4'}],
  ],
  navigation: [
    ['circle', {cx: 12, cy: 12, r: 9}],
    ['path', {d: 'M15.5 8.5l-2 5-5 2 2-5z'}],
  ],
  table: [
    ['rect', {x: 3, y: 4, width: 18, height: 16, rx: 1}],
    ['path', {d: 'M3 9h18M3 14h18M9 4v16M15 4v16'}],
  ],
  animation: [
    ['path', {d: 'M10 8l6 4-6 4z'}],
    ['path', {d: 'M4 6h3M3 12h4M4 18h3'}],
  ],
  static: [
    ['rect', {x: 4, y: 3, width: 16, height: 18, rx: 2}],
    ['path', {d: 'M8 8h8M8 12h8M8 16h5'}],
  ],
  dynamic: [
    ['path', {d: 'M20 7a8 8 0 0 0-14-2L4 7'}],
    ['path', {d: 'M4 3v4h4M4 17a8 8 0 0 0 14 2l2-2'}],
    ['path', {d: 'M20 21v-4h-4'}],
  ],
  design: [
    ['path', {d: 'M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4 6 6 0 0 0-8-6z'}],
    ['circle', {cx: 8.5, cy: 9, r: 1}],
    ['circle', {cx: 11, cy: 6.5, r: 1}],
    ['circle', {cx: 15, cy: 7, r: 1}],
  ],
  code: [
    ['path', {d: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12'}],
  ],
  vision: [
    ['path', {d: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z'}],
    ['circle', {cx: 12, cy: 12, r: 2.5}],
  ],
  color: [
    ['circle', {cx: 12, cy: 12, r: 9}],
    ['path', {d: 'M12 3v9h9M3 12h9v9'}],
  ],
  hearing: [
    ['path', {d: 'M6 9a6 6 0 0 1 12 0c0 3-2 4-3 5s-1 2-1 3a3 3 0 0 1-6 0'}],
    ['path', {d: 'M9 9a3 3 0 0 1 5.5 1.5c0 1.5-1.5 2-2 3'}],
  ],
  cognition: [
    ['path', {d: 'M8 20v-3a6 6 0 1 1 8 0v3M9 9a3 3 0 0 1 6 0M12 6V3M8 12h2M14 12h2'}],
  ],
  motor: [
    ['path', {d: 'M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3a1.7 1.7 0 0 1 3-1.5l1 2'}],
  ],
  speech: [
    ['path', {d: 'M4 5h16v11H9l-5 4z'}],
    ['path', {d: 'M8 9h8M8 12h5'}],
  ],
  photosensitivity: [
    ['path', {d: 'M13 2L5 14h6l-1 8 8-12h-6z'}],
  ],
  privacy: [
    ['rect', {x: 5, y: 10, width: 14, height: 11, rx: 2}],
    ['path', {d: 'M8 10V7a4 4 0 0 1 8 0v3'}],
    ['circle', {cx: 12, cy: 15, r: 1.5}],
  ],
  business: [
    ['rect', {x: 5, y: 4, width: 14, height: 17, rx: 2}],
    ['rect', {x: 9, y: 2, width: 6, height: 4, rx: 1}],
    ['path', {d: 'M9 10h6M9 14h6M9 18h4'}],
  ],
  content: [
    ['rect', {x: 4, y: 3, width: 16, height: 18, rx: 2}],
    ['path', {d: 'M8 8h8M8 12h8M8 16h5M16 14l4-4 2 2-4 4-2 .5z'}],
  ],
  ux: [
    ['circle', {cx: 5, cy: 6, r: 2}],
    ['circle', {cx: 19, cy: 6, r: 2}],
    ['circle', {cx: 12, cy: 18, r: 2}],
    ['path', {d: 'M7 6h10M6 8v4a4 4 0 0 0 4 4h1M18 8v4a4 4 0 0 1-4 4h-1'}],
  ],
  other: [
    ['circle', {cx: 6, cy: 12, r: 1.5}],
    ['circle', {cx: 12, cy: 12, r: 1.5}],
    ['circle', {cx: 18, cy: 12, r: 1.5}],
  ],
};

export const CATEGORY_ICONS = {
  'Images and Graphs': 'image',
  'Semantic Structure': 'structure',
  'Input Modalities': 'input',
  'Form Interactions': 'form',
  'CSS and Presentation': 'css',
  Navigation: 'navigation',
  'Data Tables': 'table',
  'Animation and Movement': 'animation',
  'Static Content': 'static',
  'Dynamic Interactions': 'dynamic',
  'Other ARRM tasks': 'other',
};

export const ROLE_ICONS = {
  'business-analysis': 'business',
  'content-authoring': 'content',
  'user-experience-design': 'ux',
  'visual-design': 'design',
  'front-end-development': 'code',
};

export const FUNCTIONAL_NEEDS = [
  {
    id: 'vision',
    title: 'Vision',
    icon: 'vision',
    description: 'People who are blind or have low vision, including people who enlarge text, zoom, use a screen reader or rely on high contrast.',
    reference: 'Section 508 FPC: WV, LV',
  },
  {
    id: 'color',
    title: 'Colour perception',
    icon: 'color',
    description: 'People who cannot distinguish some colours or who need information without colour as the only cue.',
    reference: 'Section 508 FPC: WPC · EN 301 549 4.2.3',
  },
  {
    id: 'hearing',
    title: 'Hearing',
    icon: 'hearing',
    description: 'People who are Deaf or hard of hearing, including people who rely on captions, transcripts or visual alternatives to audio.',
    reference: 'Section 508 FPC: WH, LH · EN 301 549 4.2.4, 4.2.5',
  },
  {
    id: 'cognition',
    title: 'Cognition and learning',
    icon: 'cognition',
    description: 'People with cognitive, learning, attention or memory differences who benefit from clear structure, predictable behaviour and reduced cognitive load.',
    reference: 'Section 508 FPC: LLCLA · EN 301 549 4.2.10',
  },
  {
    id: 'motor',
    title: 'Motor and manipulation',
    icon: 'motor',
    description: 'People with limited dexterity, strength, reach or use of a pointing device, including keyboard-only and switch users.',
    reference: 'Section 508 FPC: LM, LRS · EN 301 549 4.2.7, 4.2.8',
  },
  {
    id: 'speech',
    title: 'Speech',
    icon: 'speech',
    description: 'People who cannot use voice input or who need a non-vocal way to operate a service.',
    reference: 'Section 508 FPC: WS · EN 301 549 4.2.6',
  },
  {
    id: 'photosensitivity',
    title: 'Photosensitivity',
    icon: 'photosensitivity',
    description: 'People at risk from flashing, rapid changes or other visual effects that can trigger seizures or discomfort.',
    reference: 'EN 301 549 4.2.9',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    icon: 'privacy',
    description: 'People who need accessibility features to keep their data private. EN 301 549 treats privacy as a functional performance statement.',
    reference: 'EN 301 549 4.2.11',
  },
];

export function createIcon(name, {className = '', size = 24, label = ''} = {}) {
  const shapes = ICONS[name];
  if (!shapes) return element('span', className);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', ['icon', className].filter(Boolean).join(' '));
  if (label) {
    svg.setAttribute('role', 'img');
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = label;
    svg.append(title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
  for (const [tag, attrs] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, String(value));
    svg.append(shape);
  }
  return svg;
}

export function categoryIcon(category) {
  return CATEGORY_ICONS[category] || 'other';
}

export function createCriterionIcon(number, {className = '', size = 56} = {}) {
  if (!/^\d+\.\d+\.\d+$/.test(String(number))) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', ['icon', 'sc-icon', className].filter(Boolean).join(' '));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset.criterion = number;
  const use = document.createElementNS(SVG_NS, 'use');
  const href = `${CRITERION_ICON_SPRITE}#sc-${number.replaceAll('.', '-')}`;
  use.setAttribute('href', href);
  use.setAttributeNS(XLINK_NS, 'xlink:href', href);
  svg.append(use);
  return svg;
}

export function appendFunctionalNeeds(parent) {
  if (!parent) return;
  const list = element('ul', 'need-grid');
  for (const need of FUNCTIONAL_NEEDS) {
    const item = element('li', 'need-card');
    const head = element('div', 'need-head');
    head.append(createIcon(need.icon, {className: 'need-icon', size: 30}), element('h3', '', need.title));
    item.append(head, element('p', '', need.description), element('p', 'need-reference', need.reference));
    list.append(item);
  }
  parent.replaceChildren(list);
}
