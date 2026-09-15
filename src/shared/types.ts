export type Language = 'zh' | 'ja';
export type Localized = { zh: string; ja: string };
export type ReversedProbability = 0 | 25 | 50;
/**
 * 牌面只有「词」（外加一个纯装饰符号）。释义、逆位释义、引导问句一律不属于
 * 领域数据：联想由使用者自己做，卡片不得替他做完。
 */
export interface Card {
  id: string;
  word: Localized;
  symbol?: string;
}
export interface Deck { schemaVersion: 1; id: string; name: Localized; description: Localized; cards: Card[] }
/** 位置只留名称与坐标：名称是事实（主角的现在），含义与问句是解释。 */
export interface Slot { id: string; order: number; label: Localized; x: number; y: number }
export interface Layout { schemaVersion: 1; id: string; name: Localized; description: Localized; slots: Slot[] }
export interface Theme { schemaVersion: 1; id: string; name: Localized; colors: { background: string; surface: string; text: string; muted: string; accent: string; border: string } }
export interface Copy { schemaVersion: 1; labels: Record<string, Localized> }
export interface Catalog { decks: Deck[]; layouts: Layout[]; themes: Theme[]; copy: Copy; defaults: { deck: string; layout: string; theme: string }; customIds: { decks: string[]; layouts: string[]; themes: string[] } }
export interface DrawnCard { slot: Slot; card: Card; reversed: boolean }
export interface DrawResult { schemaVersion: 1; engineVersion: '1'; deckId: string; deckName: Localized; layoutId: string; layoutName: Localized; seed: string; reversedProbability: ReversedProbability; cards: DrawnCard[] }
export interface DrawOptions { deck: Deck; layout: Layout; seed: string; reversed: ReversedProbability }
export interface HistoryEntry { id: string; drawnAt: string; result: DrawResult }
export interface SaveConcepts { deck?: Deck; layout?: Layout; theme?: Theme; copy?: Copy }
