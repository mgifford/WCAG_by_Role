# WCAG by Role: Five fictional professional personas

**Status:** These five personas are editorial archetypes, not validated research or representations of all people in these professions. Their communication preferences affect independent role interpretations only; they do not modify WCAG, ARRM, or task assignments.

**Illustration system:** exactly one RoboHash classic robot (`set1`) per persona, all `400x400`, with unique seeds. The five 400x400 PNG portraits are cached under `web/assets/personas/` after inspection; source URLs and SHA-256 hashes are recorded in `data/exports/avatar-manifest.json`. The published site never requests RoboHash.

## Business Analyst Blair

**Role:** Business Analysis  
**Summary:** Blair turns service needs, policy constraints and accessibility expectations into verifiable requirements and handoffs.  
**Scenario:** Blair supports a government digital-service team replacing a complex application form. The procurement and delivery teams want concise requirements, accountable handoffs and observable acceptance evidence.

**Goals**

- Write accessibility requirements that can be verified rather than relying on generic compliance claims.
- Map each delivery decision to a responsible role without treating ARRM as an organizational mandate.
- Find the right W3C source to cite in an acceptance criterion.

**Needs**

- Examples of requirements, acceptance evidence and handoff language.
- A clear distinction between normative WCAG requirements and advisory ARRM task assignments.
- Traceability from a requirement to its WCAG criterion and relevant ARRM task.

**Thoughts**

- Who needs to make this decision, and where should it be recorded?
- What evidence would establish that the delivered interaction works?

**Feelings**

- Concerned when accessibility is reduced to an untestable statement in a contract.
- More confident when requirements, owners and review evidence are visible together.

**Behaviours**

- Cross-references requirements, issue tickets and design decisions.
- Reviews procurement or acceptance documents with content, design, QA and development colleagues.

**Pain points**

- Vague wording such as fully accessible with no observable acceptance criteria.
- A list of technical failures without a clear consequence for scope, delivery or verification.

**Communication guidance**

- Lead with: Lead with the decision or expected outcome, then show a verifiable example and responsible collaborators.
- Preferred vocabulary: requirement, acceptance criterion, risk, scope, decision, evidence, traceability.
- Example formats: acceptance criterion, procurement requirement, handoff decision, risk register entry.
- Validation question: Can explain which requirement is normative, which task is advisory, and what evidence would help check the outcome.

**RoboHash avatar:** [wcag-role-business-blair](https://robohash.org/wcag-role-business-blair.png?set=set1&size=400x400) (one image; set1, 400x400).

## Content Author Casey

**Role:** Content Authoring  
**Summary:** Casey maintains content across a large site and needs guidance that makes accessible publishing practical and repeatable.  
**Scenario:** Casey edits guidance pages, images, form instructions and documents in a CMS. They coordinate with designers and developers but cannot change underlying component code.

**Goals**

- Write labels, link text, headings and text alternatives that convey their intended meaning.
- Apply repeatable editorial checks to new and existing content.
- Know when content needs a design or code change instead of another editorial revision.

**Needs**

- Before-and-after writing examples with context.
- Plain-language explanations of source criteria and role assignments.
- A checklist for checking published content, including surrounding context.

**Thoughts**

- What does someone need to understand or do after reading this?
- Is the problem in the words, the content structure or the component itself?

**Feelings**

- Frustrated by advice that assumes a content editor can edit HTML templates.
- Reassured by examples that distinguish an authoring decision from a developer handoff.

**Behaviours**

- Uses a CMS preview and checks published pages against source material.
- Collaborates on alt text, error messages and content patterns.

**Pain points**

- Guidance that gives only a success-criterion number and no editorial example.
- A CMS that makes the right authoring choice difficult or impossible.

**Communication guidance**

- Lead with: Start with what the reader needs to understand; show a concrete content example and when to ask others for help.
- Preferred vocabulary: reader, purpose, meaning, label, heading, alternative text, publishing workflow.
- Example formats: link rewrite, image alternative, heading outline, form-instruction edit.
- Validation question: Can make or request the correct editorial change and inspect it in its published context.

**RoboHash avatar:** [wcag-role-content-casey](https://robohash.org/wcag-role-content-casey.png?set=set1&size=400x400) (one image; set1, 400x400).

## UX Designer Uma

**Role:** User Experience (UX) Design  
**Summary:** Uma designs user journeys and prototypes, checking whether people can complete important interactions across different access needs.  
**Scenario:** Uma maps an online service journey, including authentication, error recovery and support. Stakeholders frequently mistake a working prototype for evidence that the final experience is accessible.

**Goals**

- Identify barriers in user flows before implementation.
- Connect interaction decisions to user needs and evaluation scenarios.
- Make handoffs between research, content, visual design and development explicit.

**Needs**

- User journey and interaction examples linked to criteria.
- Examples of task failures, alternative paths and recovery states.
- Questions suitable for moderated and assistive-technology usability research.

**Thoughts**

- What happens when someone cannot complete this step as designed?
- How do we know the proposed interaction actually supports the task?

**Feelings**

- Concerned when a polished prototype obscures untested interaction states.
- More confident after hearing evidence from participants with varied access needs.

**Behaviours**

- Develops journey maps, task flows, prototypes and research scripts.
- Revises designs after observing where people get stuck.

**Pain points**

- Conformance labels with little description of user impact.
- Missing states for errors, timeouts, keyboard navigation and interrupted journeys.

**Communication guidance**

- Lead with: Lead with the user scenario and failure mode, then explain the interaction decision and how it can be evaluated.
- Preferred vocabulary: user journey, task completion, interaction, feedback, error recovery, research, prototype.
- Example formats: journey map, task-flow annotation, prototype state, research scenario.
- Validation question: Can identify an interaction decision, potential barrier, collaborator and research-based validation step.

**RoboHash avatar:** [wcag-role-ux-uma](https://robohash.org/wcag-role-ux-uma.png?set=set1&size=400x400) (one image; set1, 400x400).

## Visual Designer Val

**Role:** Visual Design  
**Summary:** Val maintains a component library and wants visual accessibility decisions to survive implementation across states and environments.  
**Scenario:** Val designs components used by several teams. They need to specify focus appearance, type, spacing, contrast, responsive variants and adaptations to user preferences.

**Goals**

- Describe accessible visual states and component variants precisely.
- Make accessibility annotations actionable in design handoffs.
- Check rendered implementations rather than assuming design files demonstrate conformance.

**Needs**

- Visual comparisons of good and poor states.
- Design-token, focus, colour, typography and reflow examples.
- An explicit distinction between the design decision and implementation verification.

**Thoughts**

- Will the state remain clear when colours change or the layout reflows?
- Have I specified enough for the developer to reproduce the intended behavior?

**Feelings**

- Frustrated when an accessible state is lost between the design and production.
- Motivated by concrete examples that can be incorporated into the design system.

**Behaviours**

- Annotates component states and responsive variants.
- Reviews the live interface with developers and compares it against design intent.

**Pain points**

- Guidance that assumes a contrast check alone resolves all visual accessibility concerns.
- Ambiguous handoffs for focus, hover, forced-colours and user preferences.

**Communication guidance**

- Lead with: Use a visual state and its constraints first, followed by design specifications and what must be verified in the browser.
- Preferred vocabulary: visual hierarchy, component state, focus indicator, contrast, typography, layout, design token.
- Example formats: component variant, design token, state matrix, responsive annotation.
- Validation question: Can describe the expected visual outcome and coordinate verification with the implementing developer.

**RoboHash avatar:** [wcag-role-visual-val](https://robohash.org/wcag-role-visual-val.png?set=set1&size=400x400) (one image; set1, 400x400).

## Front-End Developer Finley

**Role:** Front-End Development  
**Summary:** Finley implements accessible components and wants precise, testable guidance tied to browser behavior and W3C references.  
**Scenario:** Finley maintains a reusable component library in an open-source web project. They fix defects in keyboard behavior, names, roles, states, focus and responsive rendering.

**Goals**

- Translate an assigned task into robust semantics and predictable browser behavior.
- Verify a change using automated checks plus manual keyboard and assistive-technology testing.
- Preserve design and content decisions while implementing accessible interaction.

**Needs**

- Short technical examples, valid HTML and clear failure cases.
- Reproducible browser and assistive-technology test steps.
- Direct links to W3C criteria and the precise ARRM task and collaborator.

**Thoughts**

- What browser behavior must change, and how can I reproduce the failure?
- Is this problem caused by markup, CSS, scripting, authoring content or interaction design?

**Feelings**

- Frustrated by vague accessibility guidance with no concrete failure mode.
- More confident when expected behavior and a reproducible test are recorded.

**Behaviours**

- Works from issues and pull requests with repeatable test cases.
- Checks dynamic states using keyboard, browser tools and assistive technology.

**Pain points**

- A design handoff without keyboard, focus or error states.
- Automated test scores being treated as sufficient proof of accessibility.

**Communication guidance**

- Lead with: Start with an observable failure and expected behavior; provide implementation detail, test procedure and the source criterion.
- Preferred vocabulary: semantic HTML, CSS, JavaScript, keyboard behavior, accessible name, component, test case.
- Example formats: HTML example, component behavior contract, Playwright fixture, keyboard test case.
- Validation question: Can implement the change and explain which parts remain subject to manual testing and team review.

**RoboHash avatar:** [wcag-role-developer-finley](https://robohash.org/wcag-role-developer-finley.png?set=set1&size=400x400) (one image; set1, 400x400).

## Original references and credits

- CivicActions persona structure: https://accessibility.civicactions.com/personas/
- W3C ARRM roles: https://www.w3.org/WAI/planning/arrm/roles/
- RoboHash: https://robohash.org/ ; software MIT-licensed at https://github.com/e1ven/Robohash ; set1 artwork by Zikri Kader under CC BY 4.0
- Classic robot set1 artwork by Zikri Kader, CC BY 4.0.
- The personas above were independently authored for this project; they are not direct copies of CivicActions personas or W3C guidance.
