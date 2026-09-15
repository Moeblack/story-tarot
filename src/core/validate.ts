/**
 * 领域数据的运行时校验。
 *
 * 两层用途：
 * 1. 装载 data/** 时校验发行数据，问题以 500 暴露（安装坏了，不是请求坏了）；
 * 2. 校验 API 输入（body/query），问题以 400 暴露。
 *
 * 校验函数同时充当「净化器」：只返回已知字段，丢弃多余键，避免用户输入里的
 * 未知结构混进 Catalog 与历史文件。
 */
import type {
  Card,
  Copy,
  Deck,
  DrawResult,
  DrawnCard,
  Layout,
  Localized,
  ReversedProbability,
  SaveConcepts,
  Slot,
  Theme,
} from '../shared/types';
import { ValidationError } from './errors';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MAX_ID_LENGTH = 64;
const MAX_SEED_LENGTH = 256;
const MAX_ITEMS = 512;

const THEME_COLOR_KEYS = [
  'background',
  'surface',
  'text',
  'muted',
  'accent',
  'border',
] as const;

export function failValidation(path: string, message: string): never {
  throw new ValidationError(`${path} ${message}`);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) failValidation(path, '必须是对象');
  return value;
}

function requireString(value: unknown, path: string, maxLength: number): string {
  if (typeof value !== 'string') failValidation(path, '必须是字符串');
  if (value.trim().length === 0) failValidation(path, '不能为空');
  if (value.length > maxLength) failValidation(path, `长度不能超过 ${maxLength}`);
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) failValidation(path, '必须是有限数值');
  return value;
}

function requireArray(value: unknown, path: string, minLength: number, maxLength: number): unknown[] {
  if (!Array.isArray(value)) failValidation(path, '必须是数组');
  if (value.length < minLength) failValidation(path, `至少需要 ${minLength} 项`);
  if (value.length > maxLength) failValidation(path, `最多 ${maxLength} 项`);
  return value;
}

function assertUniqueIds(items: readonly { id: string }[], path: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) failValidation(path, `存在重复 id：${item.id}`);
    seen.add(item.id);
  }
}

export function validateId(value: unknown, path = 'id'): string {
  const id = requireString(value, path, MAX_ID_LENGTH);
  if (!ID_PATTERN.test(id)) {
    failValidation(path, '只能由字母、数字、下划线、连字符组成，且以字母或数字开头');
  }
  return id;
}

export function validateSeed(value: unknown, path = 'seed'): string {
  return requireString(value, path, MAX_SEED_LENGTH);
}

export function validateLocalized(value: unknown, path: string, maxLength: number): Localized {
  const record = asRecord(value, path);
  return {
    zh: requireString(record.zh, `${path}.zh`, maxLength),
    ja: requireString(record.ja, `${path}.ja`, maxLength),
  };
}

/** 牌面只有 id / word / symbol：多余键（含旧版的释义与问句）在这里被丢弃。 */
export function validateCard(value: unknown, path = 'card'): Card {
  const record = asRecord(value, path);
  const card: Card = {
    id: validateId(record.id, `${path}.id`),
    word: validateLocalized(record.word, `${path}.word`, 200),
  };
  if (record.symbol !== undefined && record.symbol !== null && record.symbol !== '') {
    card.symbol = requireString(record.symbol, `${path}.symbol`, 32);
  }
  return card;
}

export function validateDeck(value: unknown, path = 'deck'): Deck {
  const record = asRecord(value, path);
  if (record.schemaVersion !== 1) failValidation(`${path}.schemaVersion`, '必须是 1');
  const cards = requireArray(record.cards, `${path}.cards`, 1, MAX_ITEMS).map((item, index) =>
    validateCard(item, `${path}.cards[${index}]`),
  );
  assertUniqueIds(cards, `${path}.cards`);
  return {
    schemaVersion: 1,
    id: validateId(record.id, `${path}.id`),
    name: validateLocalized(record.name, `${path}.name`, 200),
    description: validateLocalized(record.description, `${path}.description`, 2000),
    cards,
  };
}

export function validateSlot(value: unknown, path: string): Slot {
  const record = asRecord(value, path);
  // 位置只保留名称与坐标：meaning / question 等解释性键在这里被丢弃。
  return {
    id: validateId(record.id, `${path}.id`),
    order: requireNumber(record.order, `${path}.order`),
    label: validateLocalized(record.label, `${path}.label`, 200),
    x: requireNumber(record.x, `${path}.x`),
    y: requireNumber(record.y, `${path}.y`),
  };
}

export function validateLayout(value: unknown, path = 'layout'): Layout {
  const record = asRecord(value, path);
  if (record.schemaVersion !== 1) failValidation(`${path}.schemaVersion`, '必须是 1');
  const slots = requireArray(record.slots, `${path}.slots`, 1, 64).map((item, index) =>
    validateSlot(item, `${path}.slots[${index}]`),
  );
  assertUniqueIds(slots, `${path}.slots`);
  const orders = new Set<number>();
  for (const slot of slots) {
    if (orders.has(slot.order)) failValidation(`${path}.slots`, `order 重复：${slot.order}`);
    orders.add(slot.order);
  }
  return {
    schemaVersion: 1,
    id: validateId(record.id, `${path}.id`),
    name: validateLocalized(record.name, `${path}.name`, 200),
    description: validateLocalized(record.description, `${path}.description`, 2000),
    slots,
  };
}

export function validateTheme(value: unknown, path = 'theme'): Theme {
  const record = asRecord(value, path);
  if (record.schemaVersion !== 1) failValidation(`${path}.schemaVersion`, '必须是 1');
  const colors = asRecord(record.colors, `${path}.colors`);
  const parsed: Theme['colors'] = {
    background: '',
    surface: '',
    text: '',
    muted: '',
    accent: '',
    border: '',
  };
  for (const key of THEME_COLOR_KEYS) {
    parsed[key] = requireString(colors[key], `${path}.colors.${key}`, 64);
  }
  return {
    schemaVersion: 1,
    id: validateId(record.id, `${path}.id`),
    name: validateLocalized(record.name, `${path}.name`, 200),
    colors: parsed,
  };
}

export function validateCopy(value: unknown, path = 'copy'): Copy {
  const record = asRecord(value, path);
  if (record.schemaVersion !== 1) failValidation(`${path}.schemaVersion`, '必须是 1');
  const source = asRecord(record.labels, `${path}.labels`);
  const keys = Object.keys(source);
  if (keys.length > 500) failValidation(`${path}.labels`, '最多 500 条文案');
  const labels: Record<string, Localized> = {};
  for (const key of keys) {
    if (key.trim().length === 0) failValidation(`${path}.labels`, '存在空文案键');
    if (key.length > 64) failValidation(`${path}.labels`, `文案键过长：${key}`);
    labels[key] = validateLocalized(source[key], `${path}.labels.${key}`, 500);
  }
  return { schemaVersion: 1, labels };
}

export function validateSaveConcepts(value: unknown, path = 'body'): SaveConcepts {
  const record = asRecord(value, path);
  const concepts: SaveConcepts = {};
  if (record.deck !== undefined && record.deck !== null) {
    concepts.deck = validateDeck(record.deck, `${path}.deck`);
  }
  if (record.layout !== undefined && record.layout !== null) {
    concepts.layout = validateLayout(record.layout, `${path}.layout`);
  }
  if (record.theme !== undefined && record.theme !== null) {
    concepts.theme = validateTheme(record.theme, `${path}.theme`);
  }
  if (record.copy !== undefined && record.copy !== null) {
    concepts.copy = validateCopy(record.copy, `${path}.copy`);
  }
  if (Object.keys(concepts).length === 0) {
    failValidation(path, '至少需要提供 deck、layout、theme、copy 之一');
  }
  return concepts;
}

export function isReversedProbability(value: unknown): value is ReversedProbability {
  return value === 0 || value === 25 || value === 50;
}

/** 缺省为 50；接受数字与数字字符串（query 参数是字符串）。 */
export function parseReversedProbability(value: unknown, path = 'reversed'): ReversedProbability {
  if (value === undefined || value === null || value === '') return 50;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (isReversedProbability(parsed)) return parsed;
    failValidation(path, '必须是 0、25 或 50');
  }
  if (isReversedProbability(value)) return value;
  failValidation(path, '必须是 0、25 或 50');
}

export function validateDrawnCard(value: unknown, path: string): DrawnCard {
  const record = asRecord(value, path);
  const { reversed } = record;
  if (typeof reversed !== 'boolean') failValidation(`${path}.reversed`, '必须是布尔值');
  return {
    slot: validateSlot(record.slot, `${path}.slot`),
    card: validateCard(record.card, `${path}.card`),
    reversed,
  };
}

export function validateDrawResult(value: unknown, path = 'result'): DrawResult {
  const record = asRecord(value, path);
  if (record.schemaVersion !== 1) failValidation(`${path}.schemaVersion`, '必须是 1');
  if (record.engineVersion !== '1') failValidation(`${path}.engineVersion`, '必须是 "1"');
  const { reversedProbability } = record;
  if (!isReversedProbability(reversedProbability)) {
    failValidation(`${path}.reversedProbability`, '必须是 0、25 或 50');
  }
  const cards = requireArray(record.cards, `${path}.cards`, 1, 64).map((item, index) =>
    validateDrawnCard(item, `${path}.cards[${index}]`),
  );
  return {
    schemaVersion: 1,
    engineVersion: '1',
    deckId: validateId(record.deckId, `${path}.deckId`),
    deckName: validateLocalized(record.deckName, `${path}.deckName`, 200),
    layoutId: validateId(record.layoutId, `${path}.layoutId`),
    layoutName: validateLocalized(record.layoutName, `${path}.layoutName`, 200),
    seed: validateSeed(record.seed, `${path}.seed`),
    reversedProbability,
    cards,
  };
}
