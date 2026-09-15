/**
 * JSON 文件存储原语：读取任意 JSON，序列化写入（串行 + 原子）。
 *
 * 「串行」：同一个 JsonFile 实例上的所有写操作排进一条 Promise 链，
 * 读-改-写不会交错，最后写入者胜出。
 * 「原子」：先写同目录临时文件再 rename 覆盖，读者永远不会看到半个文件。
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

export async function readJsonFile<T>(file: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return JSON.parse(raw) as T;
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}

export class JsonFile<T> {
  readonly path: string;
  private readonly fallback: () => T;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(path: string, fallback: () => T) {
    this.path = path;
    this.fallback = fallback;
  }

  /** 读取当前内容；文件不存在时返回 fallback。 */
  async read(): Promise<T> {
    const value = await readJsonFile<T>(this.path);
    return value === null ? this.fallback() : value;
  }

  /** 串行化的读-改-写。mutate 拿到的是磁盘上的最新内容。 */
  update(mutate: (current: T) => T | Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      const current = await this.read();
      const next = await mutate(current);
      await writeJsonAtomic(this.path, next);
      return next;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  /** 删除文件（恢复默认）。 */
  remove(): Promise<void> {
    const task = this.queue.then(async () => {
      await rm(this.path, { force: true });
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}
