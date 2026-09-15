import type { Localized } from '../shared/types';

/**
 * Canonical structural guards for data crossing the JSON boundary
 * (imported concept files, fetched API payloads). Field level checks live at
 * the call sites; these only narrow `unknown` into readable shapes.
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isLocalized(value: unknown): value is Localized {
  return isPlainObject(value) && typeof value.zh === 'string' && typeof value.ja === 'string';
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
