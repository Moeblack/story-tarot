# 实现契约

唯一领域类型位于 `src/shared/types.ts`。目录分工：`src/core/` 为无 UI 的纯引擎；`src/server/` 为本地 Express JSON 文件存储和 Vite 中间件服务；`src/client/` 为 React UI；`data/` 为全部默认领域数据；`docs/schemas/` 为 JSON Schema。

## 数据装载
`data/registry.json` 结构：`{ "decks": ["decks/runes24.json", "decks/story24.json", "decks/tarot22.json"], "layouts": ["layouts/odaiba6.json"], "interpretations": ["interpretations/story.json"], "themes": ["themes/ink.json"], "copy": "copy.json", "defaults": { "deck": "runes24", "layout": "odaiba6", "interpretation": "story", "theme": "ink" } }`。文件路径相对 data。自定义覆盖保存 `storage/concepts.json`，历史保存 `storage/history.json`，均运行时创建。恢复默认删除覆盖而不修改发行数据。

## 引擎
`src/core/engine.ts` 导出 `draw(options: DrawOptions): DrawResult`。参数和输出均为 JSON 可序列化。固定 seed、输入领域数据及引擎版本，结果完全一致。采用无重复洗牌，slots 按 order 递增分配，永不按牌面调位。逆位概率仅 0/25/50。`prompt` 经 strategy.template 插值，支持 `{slot}`、`{meaning}`、`{word}`、`{orientation}`、`{interpretation}`、`{question}`、`{slotQuestion}`；方向文案来自策略 `orientations.upright/reversed` 的双语数据，不在引擎硬编码领域牌面。时间属于 HistoryEntry.drawnAt（实际记录时刻），不加入纯 DrawResult；因此相同 seed 的 HTTP 响应可逐字一致，而历史仍包含真实时间。

## API
- GET /api/health → `{status:"ok"}`。
- GET /api/decks → Catalog（完整数据）。
- GET /api/draw?deck&layout&seed&reversed&interpretation → DrawResult；缺省采用 registry.defaults，reversed=50，seed 省略时生成随机字符串。GET 不写历史，UI 明确记录。
- POST /api/draw → DrawResult；body `{deck: Deck|string, layout: Layout|string, seed?:string, reversed?:0|25|50, interpretation?: Interpretation|string}`。对象直接一次性使用，不保存。
- GET /api/history → HistoryEntry[]，最新优先。
- POST /api/history body `{result: DrawResult}` → HistoryEntry，服务端生成 id/drawnAt。
- DELETE /api/history/:id → `{ok:true}`。
- DELETE /api/history → `{ok:true}`。
- POST /api/decks body SaveConcepts → Catalog；按 id upsert，一个请求可保存多个种类。
- DELETE /api/decks/:kind/:id → Catalog；kind=decks/layouts/interpretations/themes，仅删除自定义项，默认项可覆盖不可删。
- POST /api/reset → Catalog；恢复默认概念及文案，不删历史。
错误统一非 2xx `{error:string}`。服务只绑定 127.0.0.1，默认端口 5173。

## UI 与启动
UI 使用 API 抽卡，共用唯一引擎。入口 `src/client/main.tsx`，样式 `src/client/styles.css`。`npm run dev` 启动 `tsx src/server/index.ts`（开发 Vite 中间件），`npm run build` 执行 TypeScript 编译检查、Vite 客户端构建及服务端打包；`npm start` 启动构建产物。初始 URL 有 seed 自动抽取，全部参数 deck/layout/seed/reversed 保持可复制；自定义概念分享须接收方先导入，界面提示。
