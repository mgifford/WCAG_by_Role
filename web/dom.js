'use strict';

export function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

export function link(label, url, className, ariaLabel) {
  const a = element('a', className, label);
  a.href = url;
  if (ariaLabel) a.setAttribute('aria-label', ariaLabel);
  return a;
}

export function externalLink(label, url, className, ariaLabel) {
  const a = link(label, url, className, ariaLabel);
  a.rel = 'external';
  a.dataset.external = 'true';
  return a;
}

export function appendParagraph(parent, value, className) {
  parent.append(element('p', className, value));
}
