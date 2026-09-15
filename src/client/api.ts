import type {
  Catalog,
  DrawResult,
  HistoryEntry,
  Deck,
  Layout,
  ReversedProbability,
  SaveConcepts,
} from '../shared/types';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Normalise any thrown value into a human readable string. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch (cause) {
    throw new ApiError(errorMessage(cause), 0);
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`.trim();
    const text = await response.text().catch(() => '');
    if (text) {
      try {
        const body: unknown = JSON.parse(text);
        if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
          message = (body as { error: string }).error;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface DrawQuery {
  deck?: string;
  layout?: string;
  seed?: string;
  reversed?: ReversedProbability;
}

export interface DrawBody {
  deck: Deck | string;
  layout: Layout | string;
  seed?: string;
  reversed?: ReversedProbability;
}

export const api = {
  health: (): Promise<{ status: string }> => request<{ status: string }>('/api/health'),

  catalog: (): Promise<Catalog> => request<Catalog>('/api/decks'),

  /** GET /api/draw — engine backed, never writes history. */
  draw: (query: DrawQuery): Promise<DrawResult> => {
    const params = new URLSearchParams();
    if (query.deck) params.set('deck', query.deck);
    if (query.layout) params.set('layout', query.layout);
    if (query.seed) params.set('seed', query.seed);
    if (query.reversed !== undefined) params.set('reversed', String(query.reversed));
    return request<DrawResult>(`/api/draw?${params.toString()}`);
  },

  /** POST /api/draw — inline custom concepts, used by the concept playground. */
  drawInline: (body: DrawBody): Promise<DrawResult> =>
    request<DrawResult>('/api/draw', { method: 'POST', body: JSON.stringify(body) }),

  history: (): Promise<HistoryEntry[]> => request<HistoryEntry[]>('/api/history'),

  addHistory: (result: DrawResult): Promise<HistoryEntry> =>
    request<HistoryEntry>('/api/history', { method: 'POST', body: JSON.stringify({ result }) }),

  deleteHistory: (id: string): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  clearHistory: (): Promise<{ ok: true }> => request<{ ok: true }>('/api/history', { method: 'DELETE' }),

  saveConcepts: (body: SaveConcepts): Promise<Catalog> =>
    request<Catalog>('/api/decks', { method: 'POST', body: JSON.stringify(body) }),

  deleteConcept: (
    kind: 'decks' | 'layouts' | 'themes',
    id: string,
  ): Promise<Catalog> =>
    request<Catalog>(`/api/decks/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  reset: (): Promise<Catalog> => request<Catalog>('/api/reset', { method: 'POST' }),
};
