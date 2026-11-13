import test from 'node:test';
import assert from 'node:assert/strict';
import { criterionResourceLinks } from '../web/resources.js';
import { DIGITALA11Y_LINKS } from '../web/digitala11y-links.js';

const focus = {number: '2.4.7', slug: 'focus-visible'};

test('2.4.7 exposes all four per-criterion resources', () => {
  const links = criterionResourceLinks(focus);
  assert.equal(links.length, 4);
  assert.deepEqual(links.map(link => link.label), [
    'Simple WCAG', 'AAArdvark plain English', 'The WCAG', 'DigitalA11y',
  ]);
  assert.equal(links[0].url, 'https://simplewcag.org/criteria/2-4-7-focus-visible/');
  assert.equal(links[1].url, 'https://aaardvarkaccessibility.com/wcag-plain-english/2-4-7-focus-visible/');
  assert.equal(links[2].url, 'https://thewcag.com/criteria/2.4.7');
  assert.equal(links[3].url, 'https://www.digitala11y.com/focus-visible-understanding-sc-2-4-7/');
});

test('The WCAG uses the criterion number for every criterion', () => {
  for (const criterion of [
    {number: '1.1.1', slug: 'non-text-content'},
    {number: '2.4.7', slug: 'focus-visible'},
    {number: '3.3.9', slug: 'accessible-authentication-enhanced'},
  ]) {
    const thewcag = criterionResourceLinks(criterion).find(link => link.id === 'thewcag');
    assert.equal(thewcag.url, `https://thewcag.com/criteria/${criterion.number}`);
  }
});

test('DigitalA11y falls back to a labelled site search when no direct article is mapped', () => {
  const links = criterionResourceLinks({number: '1.4.6', slug: 'contrast-enhanced'});
  const digital = links.find(link => link.id === 'digitala11y');
  assert.equal(digital.label, 'Search DigitalA11y');
  assert.equal(digital.url, 'https://www.digitala11y.com/?s=1.4.6');
});

test('DigitalA11y direct-link map contains the checked articles', () => {
  assert.equal(Object.keys(DIGITALA11Y_LINKS).length, 55);
  assert.equal(DIGITALA11Y_LINKS['2.4.7'], 'https://www.digitala11y.com/focus-visible-understanding-sc-2-4-7/');
  assert.equal(DIGITALA11Y_LINKS['4.1.2'], 'https://www.digitala11y.com/understanding-sc-4-1-2-name-role-value/');
});
