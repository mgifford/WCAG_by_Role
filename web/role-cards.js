'use strict';

import { element } from './dom.js';
import { ROLE_GUIDES, ROLE_ORDER } from './role-config.js';
import { ROLE_ICONS, createIcon } from './visuals.js';

export function roleCardList() {
  const list = element('ul', 'role-path-list');
  for (const slug of ROLE_ORDER) {
    const guide = ROLE_GUIDES[slug];
    if (!guide) continue;
    const item = element('li');
    const card = element('a', 'role-path');
    card.href = './role.html?role=' + encodeURIComponent(slug);
    card.dataset.role = slug;
    card.append(
      createIcon(ROLE_ICONS[slug] || 'other', {className: 'role-path-icon', size: 32}),
      element('span', 'role-path-title', guide.cardTitle),
      element('span', 'role-path-copy', guide.cardCopy),
    );
    item.append(card);
    list.append(item);
  }
  return list;
}
