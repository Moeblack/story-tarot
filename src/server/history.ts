/** 抽卡历史：storage/history.json，最新写入者追加在尾部，读取时反转成「最新优先」。 */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { DrawResult, HistoryEntry } from '../shared/types';
import { AppError } from '../core/errors';
import { JsonFile } from '../core/storage';

export class HistoryStore {
  private readonly file: JsonFile<HistoryEntry[]>;

  constructor(storageDir: string) {
    this.file = new JsonFile<HistoryEntry[]>(join(storageDir, 'history.json'), () => []);
  }

  private async readAll(): Promise<HistoryEntry[]> {
    const entries = await this.file.read();
    if (!Array.isArray(entries)) {
      throw new AppError(`历史记录文件格式错误（应为数组）：${this.file.path}`);
    }
    return entries;
  }

  /** 最新优先。 */
  async list(): Promise<HistoryEntry[]> {
    return [...(await this.readAll())].reverse();
  }

  /** id 与 drawnAt 由服务端生成：drawnAt 是真实记录时刻，不在纯引擎结果里。 */
  async add(result: DrawResult): Promise<HistoryEntry> {
    const entry: HistoryEntry = { id: randomUUID(), drawnAt: new Date().toISOString(), result };
    await this.file.update((current) => [...current, entry]);
    return entry;
  }

  async remove(id: string): Promise<boolean> {
    let removed = false;
    await this.file.update((current) => {
      const next = current.filter((entry) => entry.id !== id);
      removed = next.length !== current.length;
      return next;
    });
    return removed;
  }

  async clear(): Promise<void> {
    await this.file.remove();
  }
}
