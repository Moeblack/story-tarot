/**
 * 服务端入口。
 *
 * 开发：`npm run dev` → tsx 直接跑本文件，Express 挂载 Vite 中间件（单端口 5173，含 HMR）。
 * 生产：`npm start` → node 跑 dist-server/index.js，Express 提供 dist 静态资源与 SPA 回退。
 *
 * 服务只绑定 127.0.0.1。
 */
import { existsSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../core/errors';
import { ConceptRegistry } from '../core/registry';
import { createApiRouter } from './api';
import { loadConfig } from './config';
import { HistoryStore } from './history';

const isDevelopment =
  process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

function httpStatusOf(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error as { status?: unknown };
    if (typeof status === 'number' && status >= 400 && status < 600) return status;
  }
  return 500;
}

function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 非 AppError 的错误（例如 express.json 的 JSON 解析失败）自带 status，优先采用。
  const status = error instanceof AppError ? error.status : httpStatusOf(error);
  const message = error instanceof Error ? error.message : '服务内部错误';
  if (status >= 500) console.error('[story-tarot]', error);
  res.status(status).json({ error: message });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const registry = new ConceptRegistry({
    dataDir: config.dataDir,
    storageDir: config.storageDir,
  });
  // 启动即装载发行数据：数据有问题就立刻以明确信息退出，而不是等到第一次请求。
  const catalog = await registry.getCatalog();
  const history = new HistoryStore(config.storageDir);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4mb' }));
  app.use('/api', createApiRouter({ registry, history }));
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `未知接口：${req.method} ${req.originalUrl}` });
  });

  const server = createHttpServer(app);

  if (isDevelopment) {
    // vite 是 devDependency：静态导入会把它拖进生产服务端包（esbuild --packages=external
    // 会保留该 import），导致 `npm start` 在没有 devDependencies 的机器上崩掉。
    // 只有开发分支才在运行时按需加载，因此这里必须用动态导入。
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: config.root,
      configFile: config.viteConfigPath,
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (!existsSync(config.clientIndexPath)) {
      console.warn(
        `[story-tarot] 未找到 ${config.clientIndexPath}，请先执行 npm run build（当前只提供 /api）。`,
      );
    }
    app.use(express.static(config.clientDistDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(config.clientIndexPath);
    });
  }

  app.use(errorHandler);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const origin = `http://${config.host}:${config.port}`;
  console.log(
    `[story-tarot] ${isDevelopment ? '开发' : '生产'}模式已启动：${origin}（root=${config.root}）`,
  );
  console.log(
    `[story-tarot] 已装载 ${catalog.decks.length} 套牌组 / ${catalog.layouts.length} 套位置方案 / ${catalog.interpretations.length} 套解读策略。`,
  );
  console.log(`[story-tarot] 试抽一张：${origin}/api/draw?seed=demo`);
}

main().catch((error: unknown) => {
  console.error('[story-tarot] 启动失败：', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
