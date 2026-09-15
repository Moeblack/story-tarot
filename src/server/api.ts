/**
 * /api 路由：完整参数校验 + 统一错误响应 { error }。
 * 所有抽卡都走同一个 core/engine.draw，UI 与外部脚本因此共享同一结果。
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { draw } from '../core/engine';
import { NotFoundError } from '../core/errors';
import type { ConceptRegistry } from '../core/registry';
import { isConceptKind } from '../core/registry';
import { randomSeed } from '../core/rng';
import {
  asRecord,
  failValidation,
  parseReversedProbability,
  validateDrawResult,
  validateId,
  validateSaveConcepts,
  validateSeed,
} from '../core/validate';
import type { HistoryStore } from './history';

export interface ApiDependencies {
  registry: ConceptRegistry;
  history: HistoryStore;
}

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

/** Express 4 不会捕获 async 抛错，统一转交给错误中间件。 */
function route(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

function readQuery(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) failValidation(`query.${name}`, '只能出现一次');
  if (typeof value !== 'string') failValidation(`query.${name}`, '必须是字符串');
  return value.length > 0 ? value : undefined;
}

export function createApiRouter({ registry, history }: ApiDependencies): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 完整 Catalog（含牌组 / 位置方案 / 主题 / 文案 / 默认值 / 自定义 id）。
  router.get(
    '/decks',
    route(async (_req, res) => {
      res.json(await registry.getCatalog());
    }),
  );

  // 只读抽卡：不写历史（UI 在用户需要时才 POST /api/history）。
  router.get(
    '/draw',
    route(async (req, res) => {
      const seed = readQuery(req.query.seed, 'seed');
      const deck = readQuery(req.query.deck, 'deck');
      const layout = readQuery(req.query.layout, 'layout');
      const reversed = parseReversedProbability(readQuery(req.query.reversed, 'reversed'));

      const catalog = await registry.getCatalog();
      const result = draw({
        deck: registry.resolveDeck(catalog, deck ?? catalog.defaults.deck),
        layout: registry.resolveLayout(catalog, layout ?? catalog.defaults.layout),
        seed: seed === undefined ? randomSeed() : validateSeed(seed),
        reversed,
      });
      res.json(result);
    }),
  );

  // 一次性抽卡：body 可直接携带自定义牌组 / 位置 / 解读对象，不落盘。
  router.post(
    '/draw',
    route(async (req, res) => {
      const body = asRecord(req.body, 'body');
      const catalog = await registry.getCatalog();
      const result = draw({
        deck: registry.resolveDeck(catalog, body.deck ?? catalog.defaults.deck),
        layout: registry.resolveLayout(catalog, body.layout ?? catalog.defaults.layout),
        seed: body.seed === undefined || body.seed === null ? randomSeed() : validateSeed(body.seed),
        reversed: parseReversedProbability(body.reversed, 'body.reversed'),
      });
      res.json(result);
    }),
  );

  router.get(
    '/history',
    route(async (_req, res) => {
      res.json(await history.list());
    }),
  );

  router.post(
    '/history',
    route(async (req, res) => {
      const body = asRecord(req.body, 'body');
      const result = validateDrawResult(body.result, 'body.result');
      res.status(201).json(await history.add(result));
    }),
  );

  router.delete(
    '/history/:id',
    route(async (req, res) => {
      const id = validateId(req.params.id, 'id');
      if (!(await history.remove(id))) throw new NotFoundError(`历史记录不存在：${id}`);
      res.json({ ok: true });
    }),
  );

  router.delete(
    '/history',
    route(async (_req, res) => {
      await history.clear();
      res.json({ ok: true });
    }),
  );

  // 保存自定义概念：按 id upsert，一个请求可同时保存多种类。
  router.post(
    '/decks',
    route(async (req, res) => {
      const concepts = validateSaveConcepts(asRecord(req.body, 'body'));
      res.json(await registry.saveConcepts(concepts));
    }),
  );

  router.delete(
    '/decks/:kind/:id',
    route(async (req, res) => {
      const { kind } = req.params;
      if (!isConceptKind(kind)) {
        failValidation('kind', '必须是 decks、layouts 或 themes 之一');
      }
      res.json(await registry.deleteConcept(kind, req.params.id));
    }),
  );

  // 恢复默认概念与文案（不动历史）。
  router.post(
    '/reset',
    route(async (_req, res) => {
      res.json(await registry.reset());
    }),
  );

  return router;
}
