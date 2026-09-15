export type Language = 'zh' | 'ja';
export type Localized = { zh: string; ja: string };
export type ReversedProbability = 0 | 25 | 50;
export interface Card {
  id: string;
  word: Localized;
  symbol?: string;
  upright: Localized;
  reversed: Localized;
  questions: { upright: Localized; reversed: Localized };
}
export interface Deck { schemaVersion: 1; id: string; name: Localized; description: Localized; cards: Card[] }
export interface Slot { id: string; order: number; label: Localized; meaning: Localized; x: number; y: number; question?: Localized }
export interface Layout { schemaVersion: 1; id: string; name: Localized; description: Localized; slots: Slot[] }
export interface Interpretation { schemaVersion: 1; id: string; name: Localized; template: Localized; orientations: { upright: Localized; reversed: Localized } }
export interface Theme { schemaVersion: 1; id: string; name: Localized; colors: { background: string; surface: string; text: string; muted: string; accent: string; border: string } }
export interface Copy { schemaVersion: 1; labels: Record<string, Localized> }
export interface Catalog { decks: Deck[]; layouts: Layout[]; interpretations: Interpretation[]; themes: Theme[]; copy: Copy; defaults: { deck: string; layout: string; interpretation: string; theme: string }; customIds: { decks: string[]; layouts: string[]; interpretations: string[]; themes: string[] } }
export interface DrawnCard { slot: Slot; card: Card; reversed: boolean; prompt: Localized }
export interface DrawResult { schemaVersion: 1; engineVersion: '1'; deckId: string; deckName: Localized; layoutId: string; layoutName: Localized; interpretationId: string; seed: string; reversedProbability: ReversedProbability; cards: DrawnCard[] }
export interface DrawOptions { deck: Deck; layout: Layout; seed: string; reversed: ReversedProbability; interpretation: Interpretation }
export interface HistoryEntry { id: string; drawnAt: string; result: DrawResult }
export interface SaveConcepts { deck?: Deck; layout?: Layout; interpretation?: Interpretation; theme?: Theme; copy?: Copy }
