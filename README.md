# 故事塔罗牌 · Story Tarot

把《物語の体操》（大塚英志，星海社新書 35）第一讲「24 张卢恩卡片抽 6 张摆位置」做成一个**数据驱动、
可维护、可扩展**的本地 Web 应用，并对外提供 JSON API 取抽卡结果。

- 牌组、位置方案、解读策略、主题、界面文案**全部外置为 JSON**，代码不硬编码任何一张牌。
- 牌桌可视化 + 逐张翻牌 + 逆位明显可辨；随机或指定 seed（可复现）；逆位概率 0 / 25% / 50%。
- 解读面板逐格给出「位置含义 + 词 + 正逆 + 引导问句」，历史记录、分享链接、JSON / Markdown / 图片导出。
- 网页内概念编辑器可增删改词组与位置方案，导入导出 JSON，恢复默认。
- 中日双语（`日文原词 / 中文` 对照）随时切换。

> **两条不可动摇的原则**
> 1. **原始规则不可为了看牌而改动**：抽到的牌按抽出顺序落到编号位置，**不许看着牌面为了顺手而重排**；
>    抽到倒置的牌保持倒置。这是原书明说的犯规线，本应用把它写死在引擎里。
> 2. **释义与问句是本应用为故事训练创作的**，不冒充原书或任何塔罗原著的解释；原版牌组只照录原书的
>    24 个词（日文原词 + 中文），顺序不改。

---

## 1. 环境要求

| 项目 | 版本 |
|---|---|
| 操作系统 | Windows 11（shell：pwsh；其它平台同样可用） |
| Node.js | v24.16.0（`package.json` 要求 `>=20.19.0`） |
| npm | 11.13.0 |
| bun（可选） | 1.4.0 |
| git | 2.55 |

无需外部服务、无需数据库、无需联网、无需任何 API Key。

## 2. 安装与运行

```pwsh
# 安装依赖（一次即可）
npm install

# 开发：一条命令启动（Express + Vite 中间件，改前端即时热更）
npm run dev

# 打开 http://127.0.0.1:5173
```

```pwsh
# 构建：TypeScript 类型检查 + 客户端打包 + 服务端打包
npm run build

# 启动构建产物
npm start

# 仅做类型检查
npm run typecheck
```

服务只绑定 `127.0.0.1`，默认端口 **5173**。首屏若带 `?seed=` 参数会自动抽一次，方便复现别人分享的结果。

## 3. 目录结构

```
story-tarot/
├─ README.md                    本文件
├─ SPEC.md                      产品规格（唯一需求来源）
├─ package.json · tsconfig.json · vite.config.ts · index.html
├─ data/                        全部默认领域数据 —— 这里是“牌面真相”的唯一来源
│  ├─ registry.json             装载清单：列出要加载哪些文件 + 默认项
│  ├─ decks/                    牌组插件：runes24.json / story24.json / tarot22.json
│  ├─ layouts/                  位置方案插件：odaiba6.json
│  ├─ interpretations/          解读策略插件：story.json / oracle.json
│  ├─ themes/                   主题插件：ink.json / midnight.json
│  └─ copy.json                 界面文案插件：全部 UI 标签（中日双语）
├─ docs/
│  ├─ architecture.md           实现契约（模块分工、API、引擎语义）
│  ├─ spec-implementation.md    规格 → 实现逐条对照
│  └─ schemas/                  JSON Schema：deck / layout / draw-result
├─ src/
│  ├─ shared/types.ts           唯一领域类型定义
│  ├─ core/                     无 UI 纯引擎（engine / rng / storage / validate / errors）
│  ├─ server/                   本地 Express JSON 服务 + Vite 中间件
│  └─ client/                   React 牌桌 / 解读面板 / 历史 / 概念编辑器
└─ storage/                     运行时自动生成：concepts.json（自定义覆盖）、history.json（历史）
```

`storage/` 目录里的两个文件都由程序在运行时创建，**不属于发行数据**；删掉它们等于丢掉自定义与历史。
恢复默认只删除 `storage/concepts.json` 里的覆盖，**从不改写 `data/` 下的发行数据**。

## 4. 内置数据（全部插件一览）

`data/registry.json` 是唯一入口，格式如下（`decks` / `layouts` / `interpretations` / `themes`
里的路径都相对于 `data/`）：

```json
{
  "decks": ["decks/runes24.json", "decks/story24.json", "decks/tarot22.json"],
  "layouts": ["layouts/odaiba6.json"],
  "interpretations": ["interpretations/story.json", "interpretations/oracle.json"],
  "themes": ["themes/ink.json", "themes/midnight.json"],
  "copy": "copy.json",
  "defaults": { "deck": "runes24", "layout": "odaiba6", "interpretation": "story", "theme": "ink" }
}
```

| 类别 | id | 说明 |
|---|---|---|
| 牌组 deck | `runes24` | 原版卢恩 24 词，日文原词与中文照录规格，顺序不改；每张配一个装饰性卢恩符文 |
| 牌组 deck | `story24` | 演示用自制 24 词（努力 / 友情 / 胜利 …），词与释义均为本应用创作 |
| 牌组 deck | `tarot22` | 塔罗大阿尔卡纳 22 张，牌名沿用通行译名，释义为故事训练而创作 |
| 位置方案 layout | `odaiba6` | 原作六位：1 现在 (1,1)、2 近未来 (2,1)、3 过去 (0,1)、4 援助者 (1,0)、5 敌对者 (1,2)、6 结局 (3,1) |
| 解读策略 interpretation | `story` | 故事提示：把位置、词、正逆、释义、问句串成一段成句提示 |
| 解读策略 interpretation | `oracle` | 神谕低语：只保留一句总结的短句式 |
| 主题 theme | `ink` | 墨与纸（浅色） |
| 主题 theme | `midnight` | 深夜台场（深色） |
| 文案 copy | `copy.json` | 全部界面标签，键与 UI 控件一一对应，中日双语 |

位置方案 `odaiba6` 的时间线为 **3 → 1 → 2 → 6**，4 在上为助力、5 在下为阻力，与原书图 4 一致。

### 四个插件点分别能改什么

- **牌组 deck**：换词、换释义、换问句、加牌减牌、换装饰符号。
- **位置方案 layout**：位置数量、每位的名称 / 含义 / 引导问句、在牌桌上的横纵坐标（`x` / `y`）、落位次序（`order`）。
- **解读策略 interpretation**：成句模板与正 / 逆位标签。模板可用这些占位符：
  `{slot}` 位置名、`{meaning}` 位置含义、`{word}` 词、`{orientation}` 正位 / 逆位标签、
  `{interpretation}` 该词在该方向的释义、`{question}` 该词在该方向的问句、`{slotQuestion}` 该位置自身的问句
  （位置没有写 `question` 时替换为空串）。
- **主题 theme**：六个颜色（背景、表面、正文、弱化文字、强调、边框）。
- **文案 copy**：界面上出现的每一句提示语。

---

## 5. 怎么加一套新牌组（只加一个 JSON 文件 + 注册，零改代码）

新增一整副牌，**不需要动任何一行 TypeScript**，只需两步：

**第一步：在 `data/decks/` 下新建一个 JSON 文件**，例如 `data/decks/mystory.json`：

```json
{
  "schemaVersion": 1,
  "id": "mystory",
  "name": { "zh": "我的故事词", "ja": "わたしの物語語" },
  "description": { "zh": "自制的 3 词小牌组，用来试水。", "ja": "自作の3語デッキ。試しに作ったもの。" },
  "cards": [
    {
      "id": "mystory-01",
      "word": { "zh": "出发", "ja": "出発" },
      "symbol": "1",
      "upright": { "zh": "现在就动身，边走边补细节。", "ja": "いますぐ動き出し、細部は歩きながら埋める。" },
      "reversed": { "zh": "说要出发，行李却一直没收拾。", "ja": "出発すると言いながら、荷物はずっとまとまらない。" },
      "questions": {
        "upright": { "zh": "你现在能立刻做的最小一步是什么？", "ja": "いますぐ出来る最小の一歩は何か。" },
        "reversed": { "zh": "你在等什么条件才肯动？", "ja": "どんな条件が揃えば動くのか。" }
      }
    }
  ]
}
```

字段规则（与 `docs/schemas/deck.schema.json` 一一对应）：

- `schemaVersion` 恒为 `1`；
- `id` 需匹配 `^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`，全库唯一；
- `name` / `description` / 每张牌的 `word` / `upright` / `reversed` / `questions.upright` / `questions.reversed`
  都必须是 `{ "zh": …, "ja": … }` 且两种语言都非空；
- 每张牌的 `id` 在牌组内唯一；`symbol` 可选（纯装饰）。

**第二步：把它登记进 `data/registry.json` 的 `decks` 数组**：

```json
"decks": ["decks/runes24.json", "decks/story24.json", "decks/tarot22.json", "decks/mystory.json"]
```

重启 `npm run dev`（或刷新页面）后，工具栏的牌组下拉里就会多出「我的故事词」，
`GET /api/decks` 也会带上它。**没有第三步。**

> 只想临时试一副牌、不想改仓库文件？两条替代路径：
> 用界面里的**概念编辑器**新建 / 导入，或直接 `POST /api/decks`（见下一节）；
> 两者都写进运行时覆盖存储，不碰发行数据。

位置方案、解读策略、主题、文案的加法完全相同：在对应目录加 JSON，再登记到 `registry.json`
的 `layouts` / `interpretations` / `themes` 数组（文案路径写在 `copy` 字段）。

---

## 6. 导入、编辑与恢复默认

界面里的**概念编辑器**支持：

- 从左侧选择牌组 / 位置方案 / 解读策略 / 主题 / 文案，逐字段编辑（含逐张牌的增删与上下移动）；
- **直接编辑 JSON**：整块贴入、格式化、应用，解析失败会明确报错；
- **导出 JSON**：把当前概念导出成文件，用于备份或分发给别人；
- **导入 JSON**：读入别人给的概念文件；
- **恢复默认**：删除全部自定义覆盖，回到 `data/` 的发行数据（历史记录保留）。

覆盖规则：自定义项与内置项 **id 相同即为覆盖**——保存后界面用的是你的版本，**发行文件本身不会被改写**；
删除自定义项后，内置版本立刻回来。**内置项可以覆盖，不可以删除。**

## 7. 分享链接，以及它带不动什么

URL 携带 `deck` / `layout` / `seed` / `reversed`（可再加 `interpretation`），打开即复现同一次抽卡：

```
http://127.0.0.1:5173/?deck=runes24&layout=odaiba6&seed=story-20260915&reversed=25
```

**限制（界面里也会提示）**：链接只带参数，**带不动自定义牌组与位置**。想让对方看到你的自制牌组，
必须**先把导出 / 导入的 JSON 交给对方导入**，再打开链接；否则对方只会看到 id 找不到、退回默认数据的牌组。
同一个 `seed` 只有在**牌组、位置方案、解读策略与引擎版本都相同**时才逐字复现。

## 8. 导出

- **JSON**：完整 `DrawResult`，可直接喂给 `POST /api/history` 或另存归档；
- **Markdown**：按位置逐条列出「位置 / 词 / 正逆 / 释义 / 问句 / 成句提示」，可直接贴进小说笔记；
- **结果图片**：把牌桌与解读渲染成一张图，便于贴到聊天里。

---

## 9. 怎么调 API（curl 示例）

服务默认在 `http://127.0.0.1:5173`，只监听本机。Windows 上用 `curl.exe`（避免 pwsh 的 `curl` 别名），
URL 里的 `&` 必须给整个地址加引号。所有接口出错时返回非 2xx，正文固定为 `{"error":"…"}`。

**健康检查**

```pwsh
curl.exe -s http://127.0.0.1:5173/api/health
# {"status":"ok"}
```

**列出全部牌组与位置方案（含词的完整数据）**

```pwsh
curl.exe -s http://127.0.0.1:5173/api/decks
# {"decks":[…],"layouts":[…],"interpretations":[…],"themes":[…],"copy":{…},"defaults":{…},"customIds":{…}}
```

**抽一次牌（GET）** —— `deck` / `layout` / `seed` / `reversed` / `interpretation` 都可省略，
省略时用 `registry.defaults`、`reversed=50`、seed 随机生成并回显：

```pwsh
curl.exe -s "http://127.0.0.1:5173/api/draw?deck=runes24&layout=odaiba6&seed=story-20260915&reversed=25"
```

```json
{
  "schemaVersion": 1,
  "engineVersion": "1",
  "deckId": "runes24",
  "deckName": { "zh": "原版卢恩 24", "ja": "原典ルーン24" },
  "layoutId": "odaiba6",
  "layoutName": { "zh": "原作六位", "ja": "原作の六位置" },
  "interpretationId": "story",
  "seed": "story-20260915",
  "reversedProbability": 25,
  "cards": [
    {
      "slot": { "id": "slot1", "order": 1, "label": { "zh": "主角的现在", "ja": "主人公の現在" }, "meaning": { "zh": "…", "ja": "…" }, "x": 1, "y": 1, "question": { "zh": "…", "ja": "…" } },
      "card": { "id": "runes24-09", "word": { "zh": "至诚", "ja": "至誠" }, "symbol": "ᚺ", "upright": { "zh": "…", "ja": "…" }, "reversed": { "zh": "…", "ja": "…" }, "questions": { "upright": { "zh": "…", "ja": "…" }, "reversed": { "zh": "…", "ja": "…" } } },
      "reversed": false,
      "prompt": { "zh": "在「主角的现在」这个位置上，至诚 以正位出现。…", "ja": "「主人公の現在」の位置に、至誠 が正位置で現れた。…" }
    }
  ]
}
```

同一 `seed` + 同一牌组 / 位置 / 解读策略 + 同一引擎版本 → **完全一致**的结果（引擎不做任何实时取值）。

**抽一次牌（POST）** —— 请求体可直接携带自定义牌组 / 位置 / 解读策略对象，供外部脚本一次调用；
传**字符串**则按 id 取内置数据，传**对象**则原样一次性使用、不落盘：

```pwsh
curl.exe -s -X POST http://127.0.0.1:5173/api/draw `
  -H "Content-Type: application/json" `
  -d '{"deck":"story24","layout":"odaiba6","seed":"novel-ch1","reversed":0,"interpretation":"oracle"}'
```

```pwsh
# 带自定义牌组对象（示例：一副 2 张牌的小牌组）
curl.exe -s -X POST http://127.0.0.1:5173/api/draw `
  -H "Content-Type: application/json" `
  -d '{"deck":{"schemaVersion":1,"id":"adhoc","name":{"zh":"临时","ja":"臨時"},"description":{"zh":"临时牌组","ja":"臨時のデッキ"},"cards":[{"id":"adhoc-1","word":{"zh":"雨","ja":"雨"},"upright":{"zh":"洗净街道","ja":"街を洗う"},"reversed":{"zh":"把人困住","ja":"人を閉じ込める"},"questions":{"upright":{"zh":"谁在雨里等？","ja":"雨の中で誰が待つ？"},"reversed":{"zh":"你困住了谁？","ja":"誰を閉じ込めた？"}}}]},"layout":"odaiba6","seed":"adhoc-1","reversed":25}'
```

**历史记录**

```pwsh
curl.exe -s http://127.0.0.1:5173/api/history
# HistoryEntry[]，最新在前；每条含服务端生成的真实时间 drawnAt 与 id

# 保存一次结果到历史（服务端生成 id 与 drawnAt）
$r = curl.exe -s "http://127.0.0.1:5173/api/draw?seed=keep-me"
curl.exe -s -X POST http://127.0.0.1:5173/api/history `
  -H "Content-Type: application/json" -d ('{"result":' + $r + '}')

curl.exe -s -X DELETE "http://127.0.0.1:5173/api/history/<id>"   # 删除一条
curl.exe -s -X DELETE http://127.0.0.1:5173/api/history          # 清空全部
```

**保存自定义概念（牌组 / 位置 / 解读 / 主题 / 文案，一次可存多种）**

```pwsh
curl.exe -s -X POST http://127.0.0.1:5173/api/decks `
  -H "Content-Type: application/json" `
  -d '{"deck":{"schemaVersion":1,"id":"mystory","name":{"zh":"我的故事词","ja":"わたしの物語語"},"description":{"zh":"自制牌组","ja":"自作デッキ"},"cards":[{"id":"mystory-01","word":{"zh":"出发","ja":"出発"},"upright":{"zh":"立刻动身","ja":"すぐ動く"},"reversed":{"zh":"迟迟不动","ja":"動けない"},"questions":{"upright":{"zh":"最小一步是什么？","ja":"最小の一歩は？"},"reversed":{"zh":"你在等什么？","ja":"何を待つ？"}}}]}}'
# 返回更新后的 Catalog
```

```pwsh
# 删除某个自定义项（kind = decks | layouts | interpretations | themes；仅能删自定义项）
curl.exe -s -X DELETE http://127.0.0.1:5173/api/decks/decks/mystory

# 恢复默认：清空全部自定义概念与文案覆盖，保留历史
curl.exe -s -X POST http://127.0.0.1:5173/api/reset
```

## 10. JSON Schema

`docs/schemas/` 下三份 Schema 与 `src/shared/types.ts` 逐字段对应，可用于校验、编辑器提示与生成客户端：

| 文件 | 对应类型 | 用途 |
|---|---|---|
| `docs/schemas/deck.schema.json` | `Deck` / `Card` / `Localized` | 校验牌组文件（新增牌组时照它写） |
| `docs/schemas/layout.schema.json` | `Layout` / `Slot` / `Localized` | 校验位置方案文件 |
| `docs/schemas/draw-result.schema.json` | `DrawResult` / `DrawnCard` | 校验 `/api/draw` 与 `/api/history` 的返回 |

均为 JSON Schema 2020-12；`draw-result.schema.json` 通过相对 `$id` 引用前两份里的
`card` / `slot` 定义，因此三份文件请放在同一目录下一起使用。

## 11. 声明与边界

- 本应用把原书第一讲的规则当作**不可改动的骨架**：抽牌顺序决定落位，看牌不得重排，逆位保持逆位。
  自制的牌组、位置、释义只替换「牌上的词与说法」，不替换这套规则。
- 全部释义与问句（含 `tarot22` 的牌义）都是**为本应用的故事训练创作的文本**，
  不代表也不冒充《物語の体操》或任何塔罗原著的解释。
- 不做用户系统、不做云端、不做付费、不引入需要外部 API Key 的依赖。
- 规格 → 实现的逐条对照见 [`docs/spec-implementation.md`](docs/spec-implementation.md)；
  模块分工与 API 契约见 [`docs/architecture.md`](docs/architecture.md)。
