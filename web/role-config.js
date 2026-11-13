'use strict';

// Role guides are project navigation over the same normalized ARRM data as the
// explorer. Adding a supported role requires an entry here plus a matching role
// in web/data/role-data.json; the explorer and role template share these values.
export const ROLE_GUIDES = {
  'business-analysis': {
    slug: 'business-analysis',
    role: 'Business Analysis',
    title: 'WCAG for Business Analysts',
    navLabel: 'Business analysis guide',
    cardTitle: 'WCAG for Business Analysts',
    cardCopy: 'Requirements, acceptance criteria, procurement and cross-team decisions that keep accessibility visible.',
    intro: 'Business analysts turn organizational goals into requirements, user stories and acceptance criteria. ARRM assigns a small number of tasks primarily to Business Analysis; more often the role supports or contributes to decisions owned by user experience, content or development.',
    explorerQuery: 'role=Business%20Analysis&all=1',
    handoff: [
      'Write accessibility into requirements and acceptance criteria, and link the ARRM task ID and WCAG criterion.',
      'When a task is owned by another role, name that owner and the evidence expected rather than assigning the work to the business role.',
      'A business decision, procurement clause or acceptance criterion is not proof that the delivered experience conforms.',
    ],
  },
  'content-authoring': {
    slug: 'content-authoring',
    role: 'Content Authoring',
    title: 'WCAG for Content Authors',
    navLabel: 'Content authoring guide',
    cardTitle: 'WCAG for Content Authors',
    cardCopy: 'Plain language, headings, link text, text alternatives, tables, media descriptions and error guidance.',
    intro: 'Content authors create and maintain the words, text alternatives, document structure and media descriptions people rely on. ARRM assigns many content and media tasks primarily to Content Authoring, with user experience, visual design and development as collaborators.',
    explorerQuery: 'role=Content%20Authoring&all=1',
    handoff: [
      'Keep the content purpose, audience and accessible alternative with the ARRM task ID when handing off to design or development.',
      'Write headings, labels, link text and text alternatives for the person using them, not only for the visual layout.',
      'Check the content in its rendered context after publication; a content spreadsheet is not evidence that the page works.',
    ],
  },
  'user-experience-design': {
    slug: 'user-experience-design',
    role: 'User Experience (UX) Design',
    title: 'WCAG for UX Designers',
    navLabel: 'UX design guide',
    cardTitle: 'WCAG for UX Designers',
    cardCopy: 'Interaction flows, navigation, form structure, feedback, error recovery and design research.',
    intro: 'UX designers shape flows, navigation, forms, feedback and the overall interaction model. ARRM assigns many tasks primarily to User Experience (UX) Design, with content, visual design and front-end development as frequent collaborators.',
    explorerQuery: 'role=User%20Experience%20(UX)%20Design&all=1',
    handoff: [
      'Record the interaction decision and the ARRM task ID in the flow, prototype or handoff note.',
      'When a task is owned by content or development, name the owner and the evidence needed at handoff.',
      'Test the flow with keyboard, screen reader and cognitive-access needs; a clickable prototype can hide implementation barriers.',
    ],
  },
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

export const ROLE_ORDER = ['business-analysis', 'content-authoring', 'user-experience-design', 'visual-design', 'front-end-development'];

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
