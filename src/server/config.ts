/** 服务端配置：只绑定回环地址，路径全部相对仓库根解析，可用环境变量覆盖。 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../core/errors';

export interface ServerConfig {
  host: string;
  port: number;
  root: string;
  dataDir: string;
  storageDir: string;
  clientDistDir: string;
  clientIndexPath: string;
  viteConfigPath: string;
}

const HOST = '127.0.0.1';
const DEFAULT_PORT = 5173;

/**
 * 仓库根定位：优先环境变量，其次从 cwd 与模块位置向上找 package.json。
 * 这样 `npm run dev`（tsx 跑 src/server/index.ts）与 `npm start`
 * （node 跑 dist-server/index.js）无论从哪个目录启动都能找到 data/ 与 dist/。
 */
function resolveRoot(env: NodeJS.ProcessEnv): string {
  const override = env.STORY_TAROT_ROOT?.trim();
  if (override) return resolve(override);
  const here = fileURLToPath(import.meta.url);
  const candidates = [
    process.cwd(),
    resolve(here, '..'),
    resolve(here, '..', '..'),
    resolve(here, '..', '..', '..'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'package.json'))) return candidate;
  }
  return process.cwd();
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(`端口号无效：${value}`);
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const root = resolveRoot(env);
  const clientDistDir = resolve(root, 'dist');
  return {
    host: HOST,
    port: parsePort(env.PORT ?? env.STORY_TAROT_PORT),
    root,
    dataDir: resolve(root, 'data'),
    storageDir: resolve(root, 'storage'),
    clientDistDir,
    clientIndexPath: join(clientDistDir, 'index.html'),
    viteConfigPath: join(root, 'vite.config.ts'),
  };
}
