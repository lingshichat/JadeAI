<div align="center">

# RoleRover

**基于 JadeAI 持续维护的桌面优先 AI 简历工作台**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows--first-0078d4)](./desktop)

[English](./README.md)

</div>

> RoleRover 是我们基于 [JadeAI](https://github.com/twwch/JadeAI)
> 持续维护的衍生版本。当前正式产品方向已经切到纯客户端桌面应用。
> Web 部署和 Docker 优先的旧说明，在这个仓库里都已经明确退场。

## 为什么是 RoleRover

相对原版 JadeAI 更偏 Web 的形态，RoleRover 现在更强调一个更轻、更直接的桌面产品闭环：

- 用户直接下载 release 安装包即可使用，不再需要先搭一套 Web 部署环境
- 主产品路径尽量减少浏览器到服务端的来回切换，更贴近单机工作流
- 简历导入导出、updater、托盘、工作区持久化等能力尽量前移到本地桌面运行时
- AI provider 配置和密钥尽量交还给用户本地掌控，而不是默认按托管服务思路来设计
- 当前先把 Windows 发版路径打磨稳定，后续再扩展 macOS

## 当前方向

- 以桌面客户端为主，Tauri 是当前唯一受支持的正式发版运行时
- Windows 安装包和 updater 元数据通过 GitHub Actions + GitHub Releases 产出
- 用户安装方式以 GitHub Releases 下载桌面安装包为准，不再推荐部署 Web 栈
- 推送匹配的 `vX.Y.Z` tag 会先创建 draft release，人工冒烟后再发布
- 根目录 `package.json` 是桌面版本号的唯一来源
- 当前正式支持 Windows，后续扩展 macOS
- 仓库里仍保留一部分 Web / Server 代码作为迁移面，但它已经不是当前产品主路径

## 当前能力

- 拖拽式简历编辑，支持行内编辑与自动保存
- 50 套简历模板，可主题定制，可多格式导出
- AI 生成简历、简历解析、JD 匹配、求职信生成、翻译、写作优化
- 中英文双语界面
- 原生桌面壳层，包含托盘、窗口状态持久化、本地导入导出、updater 接线
- AI provider 配置和密钥保存在客户端本地；桌面运行时优先使用操作系统密钥存储
- 产品方向优先降低使用门槛和环境复杂度，让本地编辑链路更紧凑、更稳定

## 仓库状态

| 项目 | 当前状态 |
|------|----------|
| 对外产品名 | `RoleRover` |
| 当前维护仓库 | [`lingshichat/RoleRover`](https://github.com/lingshichat/RoleRover) |
| 上游基础项目 | [`twwch/JadeAI`](https://github.com/twwch/JadeAI) |
| 正式发版路径 | 基于 GitHub Releases 的 Tauri 桌面发版 |
| 当前正式渠道 | `stable` |
| 当前支持平台 | Windows |
| 下一步平台 | macOS |
| 开源协议 | [Apache License 2.0](./LICENSE) |
| 归属说明 | 见 [NOTICE](./NOTICE) |

## 截图

| 模板画廊 | 简历编辑器 |
|:---:|:---:|
| ![模板画廊](images/template-list.png) | ![简历编辑器](images/resume-edit.png) |

| AI 填充简历 | 简历分享页 |
|:---:|:---:|
| ![AI 填充简历](images/AI%20填充简历.gif) | ![简历分享页](images/简历分享页.png) |

## 快速开始

### 下载与安装

1. 打开 [GitHub Releases](https://github.com/lingshichat/RoleRover/releases)。
2. 下载最新的 Windows 安装包，通常是 `.exe` 或 `.msi`。
3. 安装后像普通桌面应用一样启动即可。

当前平台支持：

- 现在正式支持 Windows
- macOS 会在后续桌面发版阶段补上

### 环境要求

- Node.js 20+
- pnpm 9+
- 如果要跑 `pnpm run dev:tauri` 或正式构建 Windows 桌面包，需要安装 Tauri 2 对应的原生工具链，包括 Rust stable 和 MSVC 构建环境

### 安装

```bash
git clone https://github.com/lingshichat/RoleRover.git
cd RoleRover

pnpm install
```

### 开发模式

#### 1. 浏览器里快速迭代桌面渲染层

```bash
pnpm --filter @rolerover/desktop run dev
```

打开 `http://127.0.0.1:1420`。

这个模式只适合做 UI 快速迭代。所有原生 Tauri 命令都会走占位 fallback，因此不能拿它验证文件系统、密钥、导入导出、updater、托盘或发版就绪状态。

#### 2. 完整原生桌面壳调试

```bash
pnpm run dev:tauri
```

这会启动桌面渲染层和原生 Tauri 壳，适合端到端验证真实桌面行为。

#### 3. 本地 updater 冒烟

```bash
pnpm run dev:tauri:local-updater
```

当你要验证原生桌面壳对本地 localhost feed 的更新检查时，用这个入口，而不是改生产配置。

本地签名相关约定：

- 私钥放在 `desktop/.tauri/updater.key`
- 密码放在被忽略的本地配置里，比如 `.env.local`
- 完整流程见 [`desktop/dev-updater/README.md`](./desktop/dev-updater/README.md)

> `pnpm dev`、`pnpm dev:web`、Docker 和服务端导向的启动方式仍然保留在仓库里作为迁移工具，但已经不是当前 RoleRover 的推荐入口。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm --filter @rolerover/desktop run dev` | 仅启动桌面渲染层浏览器预览，监听 `127.0.0.1:1420` |
| `pnpm run dev:tauri` | 启动带原生运行时能力的 Tauri 桌面应用 |
| `pnpm run dev:tauri:local-updater` | 用临时 localhost updater 覆盖启动 Tauri 做冒烟验证 |
| `pnpm run sync:desktop-version` | 从根 `package.json` 同步桌面 package、Tauri、Cargo 版本号 |
| `pnpm run verify:desktop:version-sync` | 校验桌面版本文件是否和根版本号保持一致 |
| `pnpm run verify:desktop:migration` | 执行当前桌面迁移阶段的校验门禁 |
| `pnpm run verify:desktop:release-readiness` | 检查 updater、签名、托盘和发版配置是否就绪 |
| `pnpm run build:tauri` | 构建已签名的 Tauri 桌面产物 |
| `pnpm run build:desktop:release-updater-manifest` | 生成给 GitHub Release 使用的 `latest.json` |
| `pnpm run build:desktop:updater-feed` | 生成本地冒烟用的签名 updater feed |
| `pnpm run serve:desktop:updater-feed` | 在 localhost 启动本地 updater feed |

## GitHub 发版工作流

1. 先修改根目录 [`package.json`](./package.json) 里的版本号。
2. 运行 `pnpm run sync:desktop-version`。
3. 提交版本同步后的改动。
4. 创建并推送匹配的 `vX.Y.Z` tag。
5. GitHub Actions 会执行 [`.github/workflows/release-desktop.yml`](./.github/workflows/release-desktop.yml)，校验桌面发版门禁、构建已签名 Windows 产物、生成 `latest.json`，并创建 draft GitHub Release。
6. 下载 draft 里的产物，做最小人工冒烟：
   - 安装生成的 `.exe` 或 `.msi`
   - 确认应用能正常启动
   - 确认更新检查能访问托管 feed
   - 抽样验证一个代表性的简历打开或导出流程
7. 冒烟通过后，再把 draft release 正式发布。

GitHub Actions 需要的 secrets：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

当前发版姿态：

- 打 tag 触发的是 `stable` draft release
- 生产 updater feed 使用 GitHub 托管的 `latest.json`
- 未来如果要加 `beta`，可以在不破坏单一版本源规则的前提下扩展

## 项目结构

```text
desktop/                  # 桌面渲染层包（React + Vite + TanStack Router）
desktop/src-tauri/        # 原生 Tauri + Rust 壳层、updater、托盘、窗口状态
desktop/dev-updater/      # 本地 updater 冒烟资源和说明
src/                      # 桌面迁移期间复用的共享产品逻辑
scripts/                  # 版本同步、构建、updater、发版就绪检查脚本
.github/workflows/        # 桌面构建和 tag 发版自动化
```

## 常见问题

<details>
<summary><b>既然已经是纯客户端，为什么还会看到浏览器地址？</b></summary>

桌面渲染层仍然支持在 `http://127.0.0.1:1420` 里做浏览器预览，用来加快 UI 迭代。但这不是正式交付形态，也不能证明原生桌面能力正常。

</details>

<details>
<summary><b>AI provider 配置和密钥现在放在哪里？</b></summary>

在正式支持的桌面运行时里，provider 配置保存在本地客户端工作区，密钥优先落到操作系统密钥存储。浏览器预览模式只是一种开发 fallback，不代表正式能力边界。

</details>

<details>
<summary><b>为什么仓库里还有 JadeAI 或旧 Web/Server 流程的痕迹？</b></summary>

这些大多是迁移期遗留和上游归属说明。我们仍然保留 JadeAI 的上游 attribution，同时一部分 Web 时代的共享代码还在仓库里，正在随着桌面化逐步收口。

</details>

## 协议与归属

本仓库基于 JadeAI 衍生而来，继续遵循 [Apache License 2.0](./LICENSE)。

如果你继续分发或修改这个 fork，请至少做到：

- 保留 Apache 2.0 协议文本
- 保留上游归属与版权信息
- 对修改过的文件做出清晰标记
- 保留 [NOTICE](./NOTICE) 中的衍生说明
