import type {
  Card,
  Copy,
  Deck,
  Layout,
  Localized,
  Slot,
  Theme,
} from '../shared/types';
import { isFiniteNumber, isLocalized, isPlainObject } from './guards';
import { FALLBACK_COLORS } from './theme';

/* ------------------------------------------------------------------ *
 * Runtime validation for concepts that enter through JSON import.
 * Everything is rebuilt field by field, so a hand-edited file can never
 * smuggle an undefined field into the UI or the engine.
 * ------------------------------------------------------------------ */

function asCard(value: unknown, index: number): Card {
  if (!isPlainObject(value)) throw new Error(`card[${index}] must be an object`);
  if (typeof value.id !== 'string') throw new Error(`card[${index}].id must be a string`);
  if (!isLocalized(value.word)) throw new Error(`card[${index}].word must be {zh,ja}`);
  return { id: value.id, word: value.word, symbol: typeof value.symbol === 'string' ? value.symbol : '' };
}

function asSlot(value: unknown, index: number): Slot {
  if (!isPlainObject(value)) throw new Error(`slot[${index}] must be an object`);
  if (typeof value.id !== 'string') throw new Error(`slot[${index}].id must be a string`);
  if (!isFiniteNumber(value.order)) throw new Error(`slot[${index}].order must be a number`);
  if (!isLocalized(value.label)) throw new Error(`slot[${index}].label must be {zh,ja}`);
  if (!isFiniteNumber(value.x)) throw new Error(`slot[${index}].x must be a number`);
  if (!isFiniteNumber(value.y)) throw new Error(`slot[${index}].y must be a number`);
  return { id: value.id, order: value.order, label: value.label, x: value.x, y: value.y };
}

export function asDeck(value: unknown): Deck {
  if (!isPlainObject(value)) throw new Error('deck must be an object');
  if (typeof value.id !== 'string') throw new Error('deck.id must be a string');
  if (!isLocalized(value.name)) throw new Error('deck.name must be {zh,ja}');
  if (!isLocalized(value.description)) throw new Error('deck.description must be {zh,ja}');
  if (!Array.isArray(value.cards)) throw new Error('deck.cards must be an array');
  return {
    schemaVersion: 1,
    id: value.id,
    name: value.name,
    description: value.description,
    cards: value.cards.map(asCard),
  };
}

export function asLayout(value: unknown): Layout {
  if (!isPlainObject(value)) throw new Error('layout must be an object');
  if (typeof value.id !== 'string') throw new Error('layout.id must be a string');
  if (!isLocalized(value.name)) throw new Error('layout.name must be {zh,ja}');
  if (!isLocalized(value.description)) throw new Error('layout.description must be {zh,ja}');
  if (!Array.isArray(value.slots)) throw new Error('layout.slots must be an array');
  return {
    schemaVersion: 1,
    id: value.id,
    name: value.name,
    description: value.description,
    slots: value.slots.map(asSlot),
  };
}

const COLOR_KEYS = ['background', 'surface', 'text', 'muted', 'accent', 'border'] as const;

export function asTheme(value: unknown): Theme {
  if (!isPlainObject(value)) throw new Error('theme must be an object');
  if (typeof value.id !== 'string') throw new Error('theme.id must be a string');
  if (!isLocalized(value.name)) throw new Error('theme.name must be {zh,ja}');
  if (!isPlainObject(value.colors)) throw new Error('theme.colors must be an object');
  const colors = { ...FALLBACK_COLORS };
  for (const key of COLOR_KEYS) {
    if (typeof value.colors[key] !== 'string') throw new Error(`theme.colors.${key} must be a string`);
    colors[key] = value.colors[key];
  }
  return { schemaVersion: 1, id: value.id, name: value.name, colors };
}

export function asCopy(value: unknown): Copy {
  if (!isPlainObject(value)) throw new Error('copy must be an object');
  if (!isPlainObject(value.labels)) throw new Error('copy.labels must be an object');
  const labels: Record<string, Localized> = {};
  for (const [key, entry] of Object.entries(value.labels)) {
    if (!isLocalized(entry)) throw new Error(`copy.labels["${key}"] must be {zh,ja}`);
    labels[key] = entry;
  }
  return { schemaVersion: 1, labels };
}

/* ------------------------------------------------------------------ *
 * Factories for brand new user-created concepts.
 * ------------------------------------------------------------------ */

function blank(): Localized {
  return { zh: '', ja: '' };
}

export function emptyCard(id: string): Card {
  return { id, word: blank(), symbol: '' };
}

export function emptySlot(id: string, order: number, x: number, y: number): Slot {
  return { id, order, label: blank(), x, y };
}

export function emptyDeck(id: string): Deck {
  return { schemaVersion: 1, id, name: blank(), description: blank(), cards: [emptyCard(`${id}-card-1`)] };
}

export function emptyLayout(id: string): Layout {
  return { schemaVersion: 1, id, name: blank(), description: blank(), slots: [emptySlot(`${id}-slot-1`, 1, 1, 1)] };
}

export function emptyTheme(id: string): Theme {
  return { schemaVersion: 1, id, name: blank(), colors: { ...FALLBACK_COLORS } };
}

export function emptyCopy(): Copy {
  return { schemaVersion: 1, labels: {} };
}

/** Deep clone through JSON — every domain object is plain JSON data. */
export function cloneConcept<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
