# brainstorm: allow AI to visit specified webpages

## Goal

让 JadeAI 里的 AI 对话能力不再只局限于简历上下文和本地工具，而是能在用户交互过程中访问用户指定的网页，必要时也能执行受控的网页搜索，从而帮助用户基于外部网页内容完成简历优化、岗位分析或信息提取。

## What I already know

* 用户当前需求：项目已经有 AI 对话，但不能调用 `websearch` 和 `webfetch`；希望在和项目内 AI 交互时，让它能够“去查”或“访问”用户指定的网页。
* 用户已明确选择 MVP 范围为“指定 URL 访问 + 受控网页搜索”。
* 用户倾向于集成现成能力层，而不是纯手写抓取，候选方向包括 MCP 集成或 Exa。
* 用户说明当前不能使用 Exa 官方服务，原因是实际接入依赖“中转站 / pool”。
* 用户已确认第一阶段目标是“先本机可用”，正式部署放到后续阶段。
* 用户已确认第一阶段希望把 MCP sidecar 内置进 JadeAI 仓库统一管理，而不是保留仓库外独立脚本。
* 用户已确认 sidecar 不保留 Python 版本，第一阶段直接改写为 TypeScript / Node 实现。
* 当前聊天入口是 [`src/app/api/ai/chat/route.ts`](/home/lingshi/workspace/apps/jadeai/src/app/api/ai/chat/route.ts)，使用 `streamText(...)` 驱动流式对话。
* 当前聊天工具由 [`src/lib/ai/tools.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/tools.ts) 提供，现有工具都聚焦于简历读写，如 `updateSection`、`rewriteText`、`analyzeJdMatch`、`translateResume`，没有网页访问能力。
* 当前系统提示词在 [`src/lib/ai/prompts.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/prompts.ts) 中，把模型定位为“简历优化助手”，并假定主要工具是简历编辑工具。
* 当前 provider 封装在 [`src/lib/ai/provider.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/provider.ts)，支持 OpenAI、Anthropic、Gemini 和自定义 base URL。
* OpenAI 分支目前显式返回 `p.chat(modelId)`，说明当前代码路径仍偏向 chat-completions 兼容模式，而不是直接使用 OpenAI Responses API 的 built-in tools。
* 前端聊天 UI 在 [`src/components/ai/ai-message.tsx`](/home/lingshi/workspace/apps/jadeai/src/components/ai/ai-message.tsx) 已支持展示工具调用参数和结果，因此新增网页工具后，前端消息承载能力基本已具备。
* 项目 README 明确把 `/api/ai/chat` 定义为“带简历上下文的流式 AI 对话”，AI 配置来自用户本地设置，不存储在服务端。

## Assumptions (temporary)

* 首个 MVP 优先放在“AI 聊天面板”能力里，而不是同步扩展到所有 AI 端点。
* 用户希望的是“受控网页访问能力”，不是放开任意后台爬虫或无限制互联网代理。
* 现阶段更合理的是把网页能力接到服务端工具层，而不是把整个模型后端切成新的 agent runtime。
* 如果继续坚持 MCP 路线，MCP server 需要能够对接用户的 pool，而不是直接依赖 Exa 官方远程 MCP。
* 第一阶段可以接受本地 sidecar / stdio 方案，只要本机体验可用。
* 生产部署环境允许服务端出网；本地开发阶段如果沙箱禁网，不代表线上能力也必须禁用。
* 网页访问结果需要在回答中可追溯，至少要保留 URL、标题或摘要来源。

## Open Questions

* TypeScript / Node MCP server 的本地启动方式怎么定：随 `pnpm dev` 自动启动、按首次 AI 请求懒启动，还是单独命令启动？
* 是否接受新增服务端配置项（例如 `EXA_POOL_API_KEY`、`EXA_POOL_BASE_URL` 或 MCP 服务地址）？

## Requirements (evolving)

* AI 在聊天过程中可以调用网页能力，而不是仅靠模型自身幻觉回答。
* 当用户明确提供 URL 时，AI 可以访问该网页并基于网页内容回答。
* 当用户未提供 URL、但明确要求“帮我查”时，AI 可以执行受控网页搜索并基于结果回答。
* 网页能力应受到控制，避免无限制访问、恶意站点访问或不可解释的来源使用。
* 新能力应尽量复用现有 chat route + tools 架构，减少前端重做。
* 方案优先考虑接入成熟外部能力层（MCP / Exa），避免从零实现搜索引擎和网页抓取体系。

## Acceptance Criteria (evolving)

* [ ] 用户在 AI 聊天里提供一个 URL 后，AI 可以成功读取网页内容并回答该网页相关问题。
* [ ] 用户在 AI 聊天里要求“搜索某个主题”时，AI 可以执行网页搜索并给出基于搜索结果的回答。
* [ ] 工具调用过程在聊天消息中可见，便于调试和理解 AI 为什么得出某个答案。
* [ ] 至少能限制网页工具的使用范围，例如最大调用次数、域名限制或只允许用户显式提供的 URL。
* [ ] 如果网页访问失败，AI 能返回明确错误，而不是伪造内容。
* [ ] 在本机开发环境中，JadeAI 可以稳定连通 Exa Pool MCP sidecar。
* [ ] Exa Pool MCP sidecar 的源码、启动方式和配置说明都收敛到 JadeAI 仓库内。
* [ ] Sidecar 实现与主仓库技术栈统一为 TypeScript / Node。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 通用浏览器自动化或多步网页操作代理
* 在本次 MVP 中支持登录态网站、验证码、复杂 SPA 全量渲染
* 在没有范围约束的情况下开放任意域名的无限制抓取
* 在本次 MVP 中把整个聊天架构替换成新 agent framework
* 第一阶段处理正式部署拓扑和多实例运维

## Technical Notes

* 代码入口：
  * [`src/app/api/ai/chat/route.ts`](/home/lingshi/workspace/apps/jadeai/src/app/api/ai/chat/route.ts)
  * [`src/lib/ai/tools.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/tools.ts)
  * [`src/lib/ai/provider.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/provider.ts)
  * [`src/lib/ai/prompts.ts`](/home/lingshi/workspace/apps/jadeai/src/lib/ai/prompts.ts)
  * [`src/components/ai/ai-message.tsx`](/home/lingshi/workspace/apps/jadeai/src/components/ai/ai-message.tsx)
* 当前依赖：
  * `ai@^6.0.78`
  * `@ai-sdk/openai@^3.0.26`
  * `@ai-sdk/anthropic@^3.0.50`
* 本地仓库中当前没有现成的 MCP / Exa 集成代码。
* 用户提供了一个现成参考实现：`/mnt/e/A_programming/mcp/exa-pool-mcp/exa_pool_mcp.py`，它是一个基于 `FastMCP` 的 Python stdio MCP server，封装了 `/search`、`/contents`、`/findSimilar`、`/answer`、`/research` 等 Exa Pool API。
* 官方资料核对结果：
  * OpenAI 官方 Responses API 文档说明 built-in `web_search` 可通过 `tools` 参数启用，并可包含来源信息。
  * AI SDK OpenAI 文档说明 OpenAI provider 支持 `openai.responses(...)` 和 `openai.tools.webSearchPreview()`。
  * Anthropic 官方文档说明 Claude 的 web search tool 支持 `allowed_domains` / `blocked_domains` / `max_uses`。
  * AI SDK Anthropic 文档说明 Anthropic provider 既支持 `webSearch_20250305(...)`，也支持 `webFetch_20250910(...)`。
  * AI SDK 官方文档说明可用 `createMCPClient()` 把 MCP 服务器工具自动转换成 AI SDK tools，并支持 HTTP / SSE 远程 MCP。
  * Exa 官方文档说明既提供直接 `search` / `contents` API，也提供托管的远程 MCP 服务 `https://mcp.exa.ai/mcp`。
  * Exa MCP 官方文档说明可按需启用 `web_search_exa`、`web_search_advanced_exa`、`crawling_exa` 等工具。
  * Claude Code 官方文档说明 `claude mcp serve` 可把 Claude Code 作为 MCP server 暴露给其他应用。

## Research Notes

### What similar tool stacks do

* OpenAI Responses API 倾向于把网页搜索作为 provider 内建工具，由模型自主决定是否调用，并返回来源。
* Anthropic 既提供 web search，也提供 web fetch，说明“搜索网页”和“访问指定 URL”通常被视为两类不同能力。
* AI SDK 本身支持两类路线：
  * provider-defined built-in tools
  * app-defined custom tools（由业务后端自己执行）
* AI SDK 也支持第三类路线：
  * MCP-sourced tools（由远程或本地 MCP server 提供，再映射为 AI SDK tools）

### Constraints from our repo/project

* 当前代码已经围绕“本地 tool loop”搭好了 chat 架构，新增自定义工具的改动面相对集中。
* OpenAI 代码路径目前不是 Responses API 风格，这会增加直接接入 OpenAI built-in web search 的迁移成本。
* 项目支持多 provider 和自定义端点，如果走 provider-native 路线，能力会天然不一致。
* UI 已能展示工具调用细节，因此更适合把网页能力建模成显式 tool。
* 如果把 Claude Code / Codex 之类 agent runtime 接进来，更像是引入“另一个智能体后端”，而不是单纯补充两个网页工具。
* 用户提供的 `exa_pool_mcp.py` 能证明“Exa 能通过 MCP 暴露搜索/抓取能力”这条方向可行，但它当前是 `stdio` 传输，且工具返回值主要是 JSON 字符串，不是结构化 schema，直接塞进 JadeAI 的 Next.js route 作为生产实现并不理想。
* AI SDK 官方文档明确建议生产环境优先用 HTTP transport；`stdio` 只适合本地服务器和本地开发。

### Feasible approaches here

**Approach A: Exa Pool MCP sidecar via AI SDK MCP client**

* How it works:
  * 把 sidecar 源码收敛进 JadeAI 仓库，保留用户现有的 `exa_pool_mcp.py` 思路，让它对接 `EXA_POOL_BASE_URL` / `EXA_POOL_API_KEY`。
  * JadeAI 通过 AI SDK MCP client 连接这个 MCP server，并与现有 resume tools 合并。
  * 若只在本机使用，可先走 `stdio`；若要正式部署，应把这个 MCP server 改成 HTTP / SSE 可连接服务。
* Pros:
  * 很贴合当前 AI SDK 架构，落地快。
  * “搜索”和“抓取”都有现成工具，不必自己维护网页解析。
  * 仍然是 provider-agnostic，OpenAI / Anthropic / Gemini 继续复用同一套 tools。
* Cons:
  * 引入 MCP 生命周期管理和额外依赖。
  * 若继续使用 `stdio`，只适合本地开发，不适合正式部署。
  * 需要新增服务端配置，并处理 MCP 失败、限流、超时。
  * 即使改为 TypeScript，本地 `stdio` sidecar 的进程管理仍要明确。

**Approach B: Direct Exa Pool API custom tools**

* How it works:
  * 不走 MCP，直接在服务端实现 `searchWeb` 和 `fetchWebPage` 两个业务工具。
  * `searchWeb` 调 pool `/search`，`fetchWebPage` 调 pool `/contents`。
* Pros:
  * 依赖链更短，调试更直接。
  * 返回结构完全由我们定义，更容易做 UI 和限额控制。
  * 对正式部署最稳，不需要额外维护 MCP 进程。
* Cons:
  * 仍然绑定 Exa Pool，只是少了 MCP 层。
  * 比 MCP 路线多一些自己写胶水代码的工作。

**Approach C: Local agent-runtime bridge (Claude Code / similar)**

* How it works:
  * 通过本地或远程 MCP server / agent protocol，把 Claude Code 或类似代理运行时接到应用后端。
  * 由该 agent runtime 暴露网页能力，再由 JadeAI 调用。
* Pros:
  * 如果后面想扩展成更强 agent，潜力最大。
* Cons:
  * 对当前项目来说偏重，运维和部署复杂度明显更高。
  * 更接近“新增一个代理系统”，超出这次 MVP 的最小闭环。

## Decision (ADR-lite)

**Context**: 用户已明确需要“指定 URL 访问 + 受控网页搜索”，并且倾向于 MCP / Exa 这类现成能力层；当前项目基于 AI SDK 的 tool loop，尚未集成 MCP。

**Decision**: 在“必须走 Exa Pool / 中转站”的前提下，第一阶段优先采用 `仓库内置的 TypeScript / Node Exa Pool MCP sidecar + AI SDK MCP client`；暂不建议把 Claude Code / Codex 这类 agent runtime 作为首个 MVP 的集成对象。

**Consequences**:

* 两条优先路线都能满足“搜索 + 访问 URL”。
* MCP 路线更快接现成工具，但如果要正式部署，最好把 stdio server 再包装成 HTTP / SSE 服务。
* Direct API 路线更简单可控，尤其适合正式部署。
* 无论选哪条，都会新增服务端外部依赖和相关配置项。
* 若沿用用户提供的 Python MCP server，更适合把它部署成独立 sidecar / remote MCP 服务，而不是由 Next.js 按请求临时拉起 stdio 子进程。
* 对第一阶段而言，“本机先可用”使 `TypeScript / Node MCP sidecar + AI SDK MCP client` 成为可接受的 MVP 方案。
* 对第一阶段而言，用户已进一步确认 sidecar 需要收敛到 JadeAI 仓库内统一维护，并统一到 TypeScript / Node 技术栈。
