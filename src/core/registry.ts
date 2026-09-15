/**
 * 概念注册表：把「发行数据（data/）」与「用户自定义覆盖（storage/concepts.json）」合成一份 Catalog。
 *
 * - 发行数据在首次访问时装载并缓存；任一被引用的文件缺失或校验失败都以明确的 500 报错。
 * - 自定义条目按 id 覆盖同名发行条目（默认项「可覆盖不可删」）。
 * - 恢复默认 = 删除 storage/concepts.json，绝不改动 data/。
 * - 所有写入都经过 JsonFile 的串行原子写。
 */
import { join } from 'node:path';
import type {
  Catalog,
  Copy,
  Deck,
  Layout,
  SaveConcepts,
  Theme,
} from '../shared/types';
import { AppError, NotFoundError, ValidationError } from './errors';
import { JsonFile, readJsonFile } from './storage';
import {
  asRecord,
  validateCopy,
  validateDeck,
  validateId,
  validateLayout,
  validateSaveConcepts,
  validateTheme,
} from './validate';

export const CONCEPT_KINDS = ['decks', 'layouts', 'themes'] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export function isConceptKind(value: unknown): value is ConceptKind {
  return typeof value === 'string' && (CONCEPT_KINDS as readonly string[]).includes(value);
}

interface StoredConcepts {
  schemaVersion: 1;
  decks: Deck[];
  layouts: Layout[];
  themes: Theme[];
  copy?: Copy;
}

interface BaseData {
  decks: Deck[];
  layouts: Layout[];
  themes: Theme[];
  copy: Copy;
  defaults: { deck: string; layout: string; theme: string };
}

export interface RegistryOptions {
  dataDir: string;
  storageDir: string;
}

function emptyConcepts(): StoredConcepts {
  return { schemaVersion: 1, decks: [], layouts: [], themes: [] };
}

function emptyCopy(): Copy {
  return { schemaVersion: 1, labels: {} };
}

function upsertById<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
}

function mergeById<T extends { id: string }>(base: readonly T[], overrides: readonly T[]): T[] {
  if (overrides.length === 0) return [...base];
  const merged = [...base];
  for (const override of overrides) {
    const index = merged.findIndex((candidate) => candidate.id === override.id);
    if (index === -1) merged.push(override);
    else merged[index] = override;
  }
  return merged;
}

function pickDefaultId(declared: unknown, items: readonly { id: string }[], label: string): string {
  if (typeof declared === 'string' && items.some((item) => item.id === declared)) return declared;
  const first = items[0];
  if (!first) throw new AppError(`数据集中没有可用的${label}`);
  if (declared !== undefined && declared !== null) {
    console.warn(`[story-tarot] registry.json defaults.${label} 指向不存在的 id，已回退到 ${first.id}`);
  }
  return first.id;
}

/** 主题不是抽卡必需品；没有主题数据时给空 id，由 UI 回退到内置样式。 */
function pickDefaultThemeId(declared: unknown, themes: readonly Theme[]): string {
  if (typeof declared === 'string' && themes.some((theme) => theme.id === declared)) return declared;
  return themes[0]?.id ?? '';
}

function readStoredItems<T>(
  value: unknown,
  path: string,
  validate: (value: unknown, path?: string) => T,
): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${path} 必须是数组`);
  return value.map((item, index) => validate(item, `${path}[${index}]`));
}

function mergeCatalog(base: BaseData, stored: StoredConcepts): Catalog {
  const decks = mergeById(base.decks, stored.decks);
  const layouts = mergeById(base.layouts, stored.layouts);
  const themes = mergeById(base.themes, stored.themes);
  const copy: Copy = stored.copy
    ? { schemaVersion: 1, labels: { ...base.copy.labels, ...stored.copy.labels } }
    : base.copy;
  return {
    decks,
    layouts,
    themes,
    copy,
    defaults: {
      deck: pickDefaultId(base.defaults.deck, decks, '牌组'),
      layout: pickDefaultId(base.defaults.layout, layouts, '位置方案'),
      theme: pickDefaultThemeId(base.defaults.theme, themes),
    },
    customIds: {
      decks: stored.decks.map((item) => item.id),
      layouts: stored.layouts.map((item) => item.id),
      themes: stored.themes.map((item) => item.id),
    },
  };
}

function findById<T extends { id: string }>(items: readonly T[], id: string, label: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new NotFoundError(`未知${label}：${id}`);
  return found;
}

export class ConceptRegistry {
  private readonly dataDir: string;
  private readonly concepts: JsonFile<StoredConcepts>;
  private base: Promise<BaseData> | null = null;

  constructor(options: RegistryOptions) {
    this.dataDir = options.dataDir;
    this.concepts = new JsonFile<StoredConcepts>(
      join(options.storageDir, 'concepts.json'),
      emptyConcepts,
    );
  }

  private baseData(): Promise<BaseData> {
    if (!this.base) {
      const pending = this.loadBase();
      this.base = pending;
      pending.catch(() => {
        if (this.base === pending) this.base = null;
      });
    }
    return this.base;
  }

  private async loadBase(): Promise<BaseData> {
    const manifestPath = join(this.dataDir, 'registry.json');
    const raw = await readJsonFile<unknown>(manifestPath);
    if (raw === null) throw new AppError(`缺少数据注册表文件：${manifestPath}`);
    const manifest = asRecord(raw, 'registry.json');

    const decks = await this.loadItems(manifest.decks, 'decks', validateDeck);
    const layouts = await this.loadItems(manifest.layouts, 'layouts', validateLayout);
    const themes = await this.loadItems(manifest.themes, 'themes', validateTheme);
    if (decks.length === 0) throw new AppError('registry.json 没有提供任何牌组');
    if (layouts.length === 0) throw new AppError('registry.json 没有提供任何位置方案');

    const copy =
      manifest.copy === undefined || manifest.copy === null
        ? emptyCopy()
        : await this.loadCopy(manifest.copy);

    const declared = asRecord(manifest.defaults ?? {}, 'registry.json.defaults');
    return {
      decks,
      layouts,
      themes,
      copy,
      defaults: {
        deck: pickDefaultId(declared.deck, decks, '牌组'),
        layout: pickDefaultId(declared.layout, layouts, '位置方案'),
        theme: pickDefaultThemeId(declared.theme, themes),
      },
    };
  }

  private async loadItems<T>(
    entries: unknown,
    kind: ConceptKind,
    validate: (value: unknown, path?: string) => T,
  ): Promise<T[]> {
    if (entries === undefined || entries === null) {
      console.warn(`[story-tarot] registry.json 未列出 ${kind}`);
      return [];
    }
    if (!Array.isArray(entries)) {
      throw new AppError(`registry.json 的 ${kind} 必须是「相对 data 的路径」数组`);
    }
    const items: T[] = [];
    for (const entry of entries) {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        throw new AppError(`registry.json 的 ${kind} 只能包含非空字符串路径`);
      }
      const file = join(this.dataDir, entry);
      const raw = await readJsonFile<unknown>(file);
      if (raw === null) throw new AppError(`registry.json 引用的文件不存在：${file}`);
      try {
        items.push(validate(raw, entry));
      } catch (error) {
        throw new AppError(
          `数据文件 ${file} 校验失败：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return items;
  }

  private async loadCopy(entry: unknown): Promise<Copy> {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new AppError('registry.json 的 copy 必须是「相对 data 的路径」');
    }
    const file = join(this.dataDir, entry);
    const raw = await readJsonFile<unknown>(file);
    if (raw === null) throw new AppError(`registry.json 引用的文案文件不存在：${file}`);
    try {
      return validateCopy(raw, entry);
    } catch (error) {
      throw new AppError(
        `文案文件 ${file} 校验失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** 读取自定义覆盖文件；内容损坏时明确报错，而不是静默丢数据。 */
  private async readStored(): Promise<StoredConcepts> {
    const raw = await this.concepts.read();
    try {
      const record = asRecord(raw, 'storage/concepts.json');
      const stored: StoredConcepts = {
        schemaVersion: 1,
        decks: readStoredItems(record.decks, 'storage/concepts.json decks', validateDeck),
        layouts: readStoredItems(record.layouts, 'storage/concepts.json layouts', validateLayout),
        themes: readStoredItems(record.themes, 'storage/concepts.json themes', validateTheme),
      };
      if (record.copy !== undefined && record.copy !== null) {
        stored.copy = validateCopy(record.copy, 'storage/concepts.json copy');
      }
      return stored;
    } catch (error) {
      throw new AppError(
        `自定义概念文件 ${this.concepts.path} 无法解析，请修复或删除后重试：${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** 发行数据 + 自定义覆盖的合并结果。 */
  async getCatalog(): Promise<Catalog> {
    return mergeCatalog(await this.baseData(), await this.readStored());
  }

  /** 按 id 覆盖式保存自定义概念（一个请求可同时保存多种类）。 */
  async saveConcepts(input: SaveConcepts): Promise<Catalog> {
    const incoming = validateSaveConcepts(input);
    await this.concepts.update((current) => {
      const next: StoredConcepts = {
        schemaVersion: 1,
        decks: current.decks,
        layouts: current.layouts,
        themes: current.themes,
      };
      if (current.copy) next.copy = current.copy;
      if (incoming.deck) next.decks = upsertById(current.decks, incoming.deck);
      if (incoming.layout) next.layouts = upsertById(current.layouts, incoming.layout);
      if (incoming.theme) next.themes = upsertById(current.themes, incoming.theme);
      if (incoming.copy) next.copy = incoming.copy;
      return next;
    });
    return this.getCatalog();
  }

  /** 只删除自定义条目；发行条目只能被覆盖，不能被删除。 */
  async deleteConcept(kind: ConceptKind, id: string): Promise<Catalog> {
    const conceptId = validateId(id, `${kind}.id`);
    const current = await this.readStored();
    const customList: readonly { id: string }[] = current[kind];
    if (!customList.some((item) => item.id === conceptId)) {
      throw new ValidationError(
        `自定义 ${kind} 中不存在 id 为 ${conceptId} 的条目；发行条目只能覆盖，不能删除`,
      );
    }
    await this.concepts.update((stored) => {
      const next: StoredConcepts = {
        schemaVersion: 1,
        decks: stored.decks,
        layouts: stored.layouts,
        themes: stored.themes,
      };
      if (stored.copy) next.copy = stored.copy;
      switch (kind) {
        case 'decks':
          next.decks = stored.decks.filter((item) => item.id !== conceptId);
          break;
        case 'layouts':
          next.layouts = stored.layouts.filter((item) => item.id !== conceptId);
          break;
        case 'themes':
          next.themes = stored.themes.filter((item) => item.id !== conceptId);
          break;
      }
      return next;
    });
    return this.getCatalog();
  }

  /** 恢复默认概念与文案；历史记录不受影响。 */
  async reset(): Promise<Catalog> {
    await this.concepts.remove();
    return this.getCatalog();
  }

  /** 解析牌组引用：字符串查 Catalog，对象一次性使用并当场校验。 */
  resolveDeck(catalog: Catalog, ref: unknown): Deck {
    if (typeof ref === 'string') return findById(catalog.decks, validateId(ref, 'deck'), '牌组');
    return validateDeck(ref, 'deck');
  }

  resolveLayout(catalog: Catalog, ref: unknown): Layout {
    if (typeof ref === 'string') return findById(catalog.layouts, validateId(ref, 'layout'), '位置方案');
    return validateLayout(ref, 'layout');
  }
}
