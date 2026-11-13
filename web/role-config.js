'use strict';

// Role guides are project navigation over the same normalized ARRM data as the
// explorer. Adding a supported role requires an entry here plus a matching role
// in web/data/role-data.json; the explorer and role template share these values.
export const ROLE_GUIDES = {
  'visual-design': {
    slug: 'visual-design',
    role: 'Visual Design',
    title: 'WCAG for Visual Designers',
    navLabel: 'Visual design guide',
    cardTitle: 'WCAG for Visual Designers',
    cardCopy: 'Colour, typography, focus appearance, interactive controls, layout and visual communication.',
    intro: 'Visual designers decide how information looks and how interactive states are perceived. ARRM assigns some tasks primarily to Visual Design; for others, Visual Design supports a primary owner such as User Experience (UX) Design or Front-End Development.',
    explorerQuery: 'role=Visual%20Design&all=1',
    handoff: [
      'Record the design decision and the WCAG criterion it supports in the design file or handoff note.',
      'Use the ARRM task ID when asking a developer to implement a visual behaviour, and name the primary owner when ownership is shared.',
      'Check the rendered result, not only the mock-up. Focus appearance, contrast, reflow and forced-colours behaviour depend on implementation.',
    ],
  },
  'front-end-development': {
    slug: 'front-end-development',
    role: 'Front-End Development',
    title: 'WCAG for Front-End Developers',
    navLabel: 'Front-end development guide',
    cardTitle: 'WCAG for Front-End Developers',
    cardCopy: 'Semantic HTML, keyboard interaction, names and states, forms, responsive implementation and dynamic content.',
    intro: 'Front-end developers turn design and content decisions into document structure, accessible names, keyboard behaviour, states and responsive presentation. ARRM assigns many implementation tasks primarily to Front-End Development, with Visual Design and User Experience (UX) Design as frequent collaborators.',
    explorerQuery: 'role=Front-End%20Development&all=1',
    handoff: [
      'Keep the ARRM task ID and WCAG criterion link with the implementation ticket or pull request.',
      'When a task is primary for another role, name that owner and link the design or content decision being implemented.',
      'Verify with the browser and assistive technology. A component that exists in code is not evidence that it works for users.',
    ],
  },
};

export const ROLE_ORDER = ['visual-design', 'front-end-development'];

// ARRM task-prefix navigation. The names match the section headings on the
// W3C ARRM tasks page; this mapping is a project navigation aid, not a WCAG
// taxonomy. Unknown prefixes stay visible under the fallback category.
export const CATEGORY_BY_PREFIX = {
  IMG: 'Images and Graphs',
  SEM: 'Semantic Structure',
  INP: 'Input Modalities',
  FRM: 'Form Interactions',
  CSS: 'CSS and Presentation',
  NAV: 'Navigation',
  TAB: 'Data Tables',
  ANM: 'Animation and Movement',
  SCT: 'Static Content',
  DYN: 'Dynamic Interactions',
};

export const CATEGORY_ORDER = [
  'Images and Graphs',
  'Semantic Structure',
  'Input Modalities',
  'Form Interactions',
  'CSS and Presentation',
  'Navigation',
  'Data Tables',
  'Animation and Movement',
  'Static Content',
  'Dynamic Interactions',
  'Other ARRM tasks',
];

export const CATEGORY_SOURCE_URL = 'https://www.w3.org/WAI/planning/arrm/tasks/';
