/**
 * 抽卡引擎：纯函数，不触碰文件系统、时间与随机源。
 *
 * 规则（SPEC 1.3）：
 * - 固定 seed + 同一份领域数据 + 引擎版本 ⇒ 结果完全一致（含逐字可复现的 prompt）；
 * - Fisher–Yates 无重复洗牌，抽取「位置数量」张牌；
 * - 抽到的牌按顺序摆到 order 递增的位置上——永不按牌面调位；
 * - 逆位概率只允许 0 / 25 / 50；
 * - prompt 由 interpretation.template 插值得到，牌面文案一律来自领域数据。
 */
import type {
  Card,
  DrawOptions,
  DrawResult,
  DrawnCard,
  Interpretation,
  Localized,
  ReversedProbability,
  Slot,
} from '../shared/types';
import { EngineError } from './errors';
import { createRandom } from './rng';

export const ENGINE_VERSION = '1' as const;

export const REVERSED_PROBABILITIES: readonly ReversedProbability[] = [0, 25, 50];

/** template 支持的插值记号，UI 与数据文件都可据此撰写模板。 */
export const PROMPT_TOKENS = [
  'slot',
  'meaning',
  'word',
  'orientation',
  'interpretation',
  'question',
  'slotQuestion',
] as const;

type Orientation = 'upright' | 'reversed';

const MAX_SEED_LENGTH = 256;
const MAX_SLOTS = 64;

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (match: string, token: string) =>
    Object.hasOwn(values, token) ? values[token] : match,
  );
}

/**
 * 把一张牌摆在一个位置上时生成的引导文案（中日双语）。
 * {orientation} 取自 interpretation.orientations，因此正逆位措辞属于领域数据。
 */
export function buildPrompt(
  card: Card,
  slot: Slot,
  reversed: boolean,
  interpretation: Interpretation,
): Localized {
  const orientation: Orientation = reversed ? 'reversed' : 'upright';
  const orientationLabel = interpretation.orientations[orientation];
  const cardMeaning = card[orientation];
  const cardQuestion = card.questions[orientation];
  const slotQuestion = slot.question;
  return {
    zh: interpolate(interpretation.template.zh, {
      slot: slot.label.zh,
      meaning: slot.meaning.zh,
      word: card.word.zh,
      orientation: orientationLabel.zh,
      interpretation: cardMeaning.zh,
      question: cardQuestion.zh,
      slotQuestion: slotQuestion ? slotQuestion.zh : '',
    }),
    ja: interpolate(interpretation.template.ja, {
      slot: slot.label.ja,
      meaning: slot.meaning.ja,
      word: card.word.ja,
      orientation: orientationLabel.ja,
      interpretation: cardMeaning.ja,
      question: cardQuestion.ja,
      slotQuestion: slotQuestion ? slotQuestion.ja : '',
    }),
  };
}

/** 按 order 递增排序（不修改入参）；order 相同时以原始下标稳定排序。 */
export function orderedSlots(layoutSlots: readonly Slot[]): Slot[] {
  return layoutSlots
    .map((slot, index) => ({ slot, index }))
    .sort((left, right) => left.slot.order - right.slot.order || left.index - right.index)
    .map((entry) => entry.slot);
}

/** 无重复洗牌：Fisher–Yates，返回牌组下标的一个排列。 */
function shuffledIndices(count: number, random: () => number): number[] {
  const indices: number[] = [];
  for (let index = 0; index < count; index += 1) indices.push(index);
  for (let cursor = count - 1; cursor > 0; cursor -= 1) {
    const swapWith = Math.floor(random() * (cursor + 1));
    const held = indices[cursor];
    indices[cursor] = indices[swapWith];
    indices[swapWith] = held;
  }
  return indices;
}

export function draw(options: DrawOptions): DrawResult {
  const { deck, layout, interpretation, seed, reversed } = options;

  if (typeof seed !== 'string' || seed.length === 0) {
    throw new EngineError('seed 必须是非空字符串');
  }
  if (seed.length > MAX_SEED_LENGTH) {
    throw new EngineError(`seed 最长 ${MAX_SEED_LENGTH} 个字符`);
  }
  if (!(REVERSED_PROBABILITIES as readonly number[]).includes(reversed)) {
    throw new EngineError('逆位概率只能是 0、25 或 50');
  }
  if (!deck || !Array.isArray(deck.cards) || deck.cards.length === 0) {
    throw new EngineError('牌组至少需要一张牌');
  }
  if (!layout || !Array.isArray(layout.slots) || layout.slots.length === 0) {
    throw new EngineError('位置方案至少需要一个位置');
  }
  if (layout.slots.length > MAX_SLOTS) {
    throw new EngineError(`位置数量最多 ${MAX_SLOTS} 个`);
  }
  if (layout.slots.length > deck.cards.length) {
    throw new EngineError(
      `位置数量（${layout.slots.length}）多于牌数（${deck.cards.length}），无法无重复发牌`,
    );
  }
  if (!interpretation || !interpretation.template) {
    throw new EngineError('解读策略缺少 template');
  }

  const slots = orderedSlots(layout.slots);
  const random = createRandom(seed);
  const indices = shuffledIndices(deck.cards.length, random);
  const threshold = reversed / 100;

  const cards: DrawnCard[] = slots.map((slot, position) => {
    const card = deck.cards[indices[position]];
    // threshold 为 0 时 && 短路，不消耗随机数：0% 与 25%/50% 的洗牌序列因此各自稳定。
    const isReversed = threshold > 0 && random() < threshold;
    return {
      slot,
      card,
      reversed: isReversed,
      prompt: buildPrompt(card, slot, isReversed, interpretation),
    };
  });

  return {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    deckId: deck.id,
    deckName: deck.name,
    layoutId: layout.id,
    layoutName: layout.name,
    interpretationId: interpretation.id,
    seed,
    reversedProbability: reversed,
    cards,
  };
}
