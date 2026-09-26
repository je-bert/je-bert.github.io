import { describe, expect, test } from "bun:test";
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { createPresentationNavigator, buildBookingUrl } from "./presentation.js";
import * as presentation from "./presentation.js";

test('the public presentation opts out of search indexing', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const head = html.split('</head>')[0];
  const robots = head.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
  expect(robots?.[1].split(',').map((value) => value.trim()) ?? []).toContain('noindex');
});

test('the Safari local-file entry point runs as a classic script', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const entry = html.match(/<script([^>]*?)src="\.\/presentation.js"[^>]*>/);
  expect(entry).not.toBeNull();
  expect(entry[1]).not.toContain('module');
  const context = { module: { exports: {} }, URL };
  new Script(readFileSync(new URL('./presentation.js', import.meta.url), 'utf8')).runInNewContext(context);
  expect(context.module.exports.createPresentationNavigator(6).next()).toBe(1);
});

test('all selected problems reach Cal.com without losing accents or punctuation', () => {
  const url = new URL(buildBookingUrl({ problems: ['On recopie les mêmes infos', 'L’info est difficile à retrouver', 'Erreurs & oublis'] }));
  expect(url.origin + url.pathname).toBe('https://cal.com/je-bert');
  expect(url.searchParams.get('duration')).toBe('15');
  expect(url.searchParams.get('notes')).toBe('Rencontre découverte Realsync\nProblèmes vécus :\n- On recopie les mêmes infos\n- L’info est difficile à retrouver\n- Erreurs & oublis');
});

test('booking stays available without answers, including after a reset', () => {
  buildBookingUrl({ problems: ['Les suivis se perdent'] });
  expect(new URL(buildBookingUrl({ problems: [] })).searchParams.has('notes')).toBe(false);
  expect(new URL(buildBookingUrl({})).searchParams.has('notes')).toBe(false);
});

test('deselecting a problem removes it from the next booking link', () => {
  buildBookingUrl({ problems: ['Les suivis se perdent', 'Nos outils ne se parlent pas'] });
  const url = new URL(buildBookingUrl({ problems: ['Nos outils ne se parlent pas'] }));
  expect(url.searchParams.get('notes')).toBe('Rencontre découverte Realsync\nProblèmes vécus :\n- Nos outils ne se parlent pas');
});

test('an enlarged preview closes on any click and can reopen with another image', () => {
  // Only the native dialog methods are substituted; production event handlers run unchanged.
  const dialog = new EventTarget();
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  dialog.setAttribute = () => {};
  const image = {};
  const buttons = ['cameleon', 'joly'].map((name) => {
    const button = new EventTarget();
    button.dataset = { preview: `${name}.png`, previewTitle: name };
    return button;
  });
  expect(typeof presentation.initializeImagePreview).toBe('function');
  presentation.initializeImagePreview(dialog, image, buttons);
  buttons[0].dispatchEvent(new Event('click'));
  expect(dialog.open).toBe(true);
  expect(image.src).toBe('cameleon.png');
  dialog.dispatchEvent(new Event('click'));
  expect(dialog.open).toBe(false);
  buttons[1].dispatchEvent(new Event('click'));
  expect(dialog.open).toBe(true);
  expect(image.src).toBe('joly.png');
  expect(image.alt).toBe('joly');
});

describe("createPresentationNavigator", () => {
  test('notifies when leaving the last slide by previous or direct navigation', () => {
    let departures = 0;
    const navigator = createPresentationNavigator(4, () => { departures += 1; });
    navigator.goTo(3);
    navigator.previous();
    expect(departures).toBe(1);
    navigator.goTo(3);
    navigator.goTo(0);
    expect(departures).toBe(2);
  });

  test('does not clear answers when staying on the last slide or navigating elsewhere', () => {
    let departures = 0;
    const navigator = createPresentationNavigator(4, () => { departures += 1; });
    navigator.next();
    navigator.previous();
    navigator.goTo(3);
    navigator.next();
    navigator.goTo(3);
    navigator.goTo(99);
    expect(departures).toBe(0);
  });

  test("keeps navigation within the first and last screen", () => {
    const navigator = createPresentationNavigator(6);

    expect(navigator.previous()).toBe(0);
    expect(navigator.current()).toBe(0);

    for (let index = 0; index < 7; index += 1) {
      navigator.next();
    }

    expect(navigator.current()).toBe(5);
    expect(navigator.next()).toBe(5);
  });
});
