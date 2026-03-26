<div align="center">

# RoleRover

**基于 JadeAI 二开的 AI 简历工作台**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)](./Dockerfile)

[English](./README.md)

</div>

> RoleRover 是我们基于 [JadeAI](https://github.com/twwch/JadeAI)
> 持续维护的衍生版本。当前仓库里大多数对外品牌和技术标识已经切到 `RoleRover`；
> 仍保留的 `JadeAI` 主要只用于说明上游来源或当前仓库路径。

## 为什么做这个二开版本

- 维护我们自己的产品路线和仓库定位
- 把 README、部署方式、默认品牌从“上游项目视角”调整为“我们自己的维护版本”
- 保留原项目成熟的编辑器、AI 能力、导出与分享能力
- 避免一次性全量改名带来的高风险改动，先完成对外品牌切换

## 当前能力

- 拖拽式简历编辑，支持行内编辑与自动保存
- 50 套简历模板，可主题定制，可多格式导出
- AI 生成简历、简历解析、JD 匹配、求职信生成、翻译、语法与写作优化
- 分享链接与可选密码保护
- 默认 SQLite，可切换 PostgreSQL
- 中英文双语界面
- AI 配置按用户保存在浏览器，不落服务端

## Fork 状态

| 项目 | 当前状态 |
|------|----------|
| 对外产品名 | `RoleRover` |
| 上游基础项目 | [`twwch/JadeAI`](https://github.com/twwch/JadeAI) |
| 当前维护仓库 | `lingshichat/JadeAI` |
| 开源协议 | [Apache License 2.0](./LICENSE) |
| 归属说明 | 见 [NOTICE](./NOTICE) |
| 改名策略 | 过渡式：对外品牌和大多数技术标识已迁移到 `RoleRover`，同时保留上游归属说明 |

## 截图

| 模板画廊 | 简历编辑器 |
|:---:|:---:|
| ![模板画廊](images/template-list.png) | ![简历编辑器](images/resume-edit.png) |

| AI 填充简历 | 简历分享页 |
|:---:|:---:|
| ![AI 填充简历](images/AI%20填充简历.gif) | ![简历分享页](images/简历分享页.png) |

## 快速开始

### 本地开发

#### 环境要求

- Node.js 20+
- pnpm 9+

#### 安装

```bash
git clone https://github.com/lingshichat/JadeAI.git
cd JadeAI

pnpm install
cp .env.example .env.local
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

> 当前 GitHub / 仓库路径仍然使用 `JadeAI`，但维护中的产品品牌已经切到
> `RoleRover`。

`pnpm dev` 会自动：

- 在缺少配置时从 `.env.example` 生成 `.env.local`
- 确保 `data/` 目录存在
- 同时启动 Next.js 应用和本地 Exa Pool MCP sidecar

如果需要手动维护数据库，仍可使用 `pnpm db:migrate` 和 `pnpm db:seed`。

### Docker

这个二开版本不再默认依赖上游发布的镜像，建议直接构建本仓库的 Dockerfile：

```bash
docker compose up --build -d
```

也可以手动构建运行：

```bash
docker build -t rolerover:latest .

docker run -d -p 3000:3000 \
  --name rolerover \
  -e AUTH_SECRET=<你生成的密钥> \
  -v "$(pwd)/data:/app/data" \
  rolerover:latest
```

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

### 可选 PostgreSQL

```bash
docker run -d -p 3000:3000 \
  --name rolerover \
  -e AUTH_SECRET=<你生成的密钥> \
  -e DB_TYPE=postgresql \
  -e DATABASE_URL=postgresql://user:pass@host:5432/rolerover \
  rolerover:latest
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `AUTH_SECRET` | 是 | — | 会话加密密钥 |
| `DB_TYPE` | 否 | `sqlite` | 数据库类型：`sqlite` 或 `postgresql` |
| `DATABASE_URL` | PostgreSQL 时 | — | PostgreSQL 连接字符串 |
| `SQLITE_PATH` | 否 | `./data/jade.db` | SQLite 数据库文件路径 |
| `NEXT_PUBLIC_AUTH_ENABLED` | 否 | `false` | 启用 Google OAuth（`true`）或使用指纹模式（`false`） |
| `GOOGLE_CLIENT_ID` | OAuth 时 | — | Google OAuth 客户端 ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 时 | — | Google OAuth 客户端密钥 |
| `NEXT_PUBLIC_APP_NAME` | 否 | `RoleRover` | UI 中显示的应用名称 |
| `NEXT_PUBLIC_APP_URL` | 否 | `http://localhost:3000` | 应用 URL |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | 否 | `zh` | 默认语言：`zh` 或 `en` |
| `EXA_POOL_MCP_PORT` | 否 | `3334` | 本地 Exa Pool MCP sidecar 使用的端口 |

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 必要时自动引导本地环境，然后启动 Next.js 开发服务器和本地 Exa Pool MCP sidecar |
| `pnpm dev:stack` | 不做引导，直接启动 Next.js 开发服务器和本地 Exa Pool MCP sidecar |
| `pnpm dev:web` | 仅启动 Next.js 开发服务器 |
| `pnpm dev:mcp` | 仅启动本地 Exa Pool MCP sidecar |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm db:generate` | 生成 Drizzle 迁移文件（SQLite） |
| `pnpm db:generate:pg` | 生成 Drizzle 迁移文件（PostgreSQL） |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:studio` | 打开 Drizzle Studio |
| `pnpm db:seed` | 注入示例数据 |

## 项目结构

```text
src/
├── app/                  # Next.js App Router 与 Route Handlers
├── components/           # UI、编辑器、仪表盘、预览、Landing
├── hooks/                # 自定义 React Hooks
├── lib/
│   ├── ai/               # Prompt、工具、模型集成
│   ├── auth/             # NextAuth 与指纹认证
│   └── db/               # Schema、仓库、种子数据、迁移
├── stores/               # Zustand 状态
└── types/                # 共享 TypeScript 类型
```

## 品牌过渡说明

- 对外文档与默认应用名已经切到 `RoleRover`
- 当前 GitHub 仓库名仍然使用 `JadeAI`
- 上游归属说明会继续保留 `JadeAI`
- 后续仍可继续做仓库路径级别的改名，不影响现在的日常开发与部署

## 常见问题

<details>
<summary><b>AI 配置是怎么工作的？</b></summary>

RoleRover 不要求在服务端配置 AI API Key。每位用户都可以在应用内
**设置 > AI** 中填写自己的 provider、API Key、Base URL 和模型。这些
密钥只保存在浏览器本地，不会被服务端持久化。

</details>

<details>
<summary><b>可以在 SQLite 和 PostgreSQL 之间切换吗？</b></summary>

可以。将 `DB_TYPE` 设为 `sqlite` 或 `postgresql` 即可。SQLite 是默认选项，
几乎零配置；如果使用 PostgreSQL，还需要额外配置 `DATABASE_URL`。

</details>

<details>
<summary><b>为什么仓库里还有少量 `JadeAI` 标识？</b></summary>

这些残留引用目前是有意保留的，主要用于标记上游项目来源，或者对应当前还没改名的仓库路径。

</details>

## 协议与归属

本仓库基于 JadeAI 衍生而来，继续遵循 [Apache License 2.0](./LICENSE)。

如果你继续分发或修改这个 fork，请至少做到：

- 保留 Apache 2.0 协议文本
- 保留上游归属与版权信息
- 对修改过的文件做出清晰标记
- 保留 [NOTICE](./NOTICE) 中的衍生说明
