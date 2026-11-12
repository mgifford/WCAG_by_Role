'use strict';

import { element, link } from './dom.js';
import { ROLE_GUIDES, ROLE_ORDER } from './role-config.js';

export function roleCardList() {
  const list = element('ul', 'role-path-list');
  for (const slug of ROLE_ORDER) {
    const guide = ROLE_GUIDES[slug];
    if (!guide) continue;
    const item = element('li');
    const card = link(guide.cardTitle, './role.html?role=' + encodeURIComponent(slug), 'role-path');
    card.dataset.role = slug;
    card.append(element('span', 'role-path-copy', guide.cardCopy));
    item.append(card);
    list.append(item);
  }
  return list;
}
