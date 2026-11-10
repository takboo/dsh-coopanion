# Coopanion 0.4.21 共享 Tart 迁移试跑

2026-11-10 · `dsh-plugin-onboarding` 的「旧项目迁移」路径。共享 Tart 来宾的完整原生安装探针通过，临时克隆已回收。独立 Linux Web 回归也通过。

## 入口盘点

从基座提交 `56bcd3c0b122c3281b1090f45673ddde2d538481` 读取 `.agents/skills/dsh-plugin-onboarding/SKILL.md`、`docs/engineering-contract.md`、`docs/plugin-onboarding.md`、`docs/test-environments.md` 和 `docs/distribution.md`。执行的 `scripts/run-tart.sh` 与该提交中的 Git blob 逐字节一致，SHA-256 为 `dc814586a7f5f311f8d4cf8d47b66ef67a07b6d492b704e393f8749cd49cb34a`。

| 路径 | 本轮盘点 |
| --- | --- |
| Coopanion 旧 VM 存储 `~/Documents/codespace/personal-projects/dsh-coopanion/.local/macos-vm/tart` | 路径已不存在。父目录约 104 KiB，为历史本机记录。 |
| 共享 `TART_HOME` `~/Documents/codespace/personal-projects/dsh-plugin-engineering/.local/tart` | 固定基座 runner 直接设置此路径。Tart 2.41.1 列出本地基线 `dsh-sequoia-arm64-base-eee659985b01` 和对应的 OCI 镜像缓存，运行前均停止。 |
| 标签上的本地开发指南 | 旧指南指向项目隔离 VM，本机管理入口和 SSH 配置由操作者提供。接入前的主分支工作稿已改称共享实验室，缺少可直接复跑的来宾安装步骤。 |
| 产品探针和输出 | `package.json` 的 `test:install` 调用 `tests/install.mjs`，读取 `DSH_TEST_VERSION` 和 `DSH_TEST_PACKAGE_DIR`。最终断言产物为 `artifacts/install-0.2.2-rc.1.json`，中间阶段由 `DSH_TEST_PHASE_FILE` 记录。 |
| CI 和普通 Web | CI 的宿主安装矩阵在 `macos-15` 等 runner 下载产物并核对 SHA-256 后运行同一安装入口。普通 Web 回归走 `scripts/verify-engineering.sh` 的 Linux 容器。 |

OCI 基线引用为 `ghcr.io/cirruslabs/macos-sequoia-base@sha256:eee659985b01e4df2a6c0754bd8d25e54969933c43fdcd4edef8bea337b3d354`。

## 发布物与宿主身份

- [v0.4.21 GitHub Release](https://github.com/takboo/dsh-coopanion/releases/tag/v0.4.21) 提供 `dsh-coopanion-0.4.21.tgz`、`verification.json`、`SHA256SUMS` 和探针所需的 `paper-star.zip`。同字节别名和发布说明只用于完整校验 Release 清单。
- 规范包 SHA-256 为 `248f799f6baa218e2acac6bda5b0a95abf77a6dcc64340f6a83f865ad785cae3`。标签 HEAD、`verification.json` 的 `sourceCommit` 和包内 `dist/build-info.json` 的 `commit` 均为 `810789948475c42deb8333333510fa25b4e3ed7e`，包内 `dirty` 为 `false`。
- npm 宿主为 `@deepseek-ai/dsh@0.2.2-rc.1`。发布 tarball 的 SHA-512 SRI 与项目宿主目标及 npm 安装锁一致，为 `sha512-ijR9UEVYkG15Q/Q79JzvzLBzQOQfc63VLr9n6flpwHPhr5IKn2UxthnSoto/P9l7qGd7pPvI1Ra6TW7LH3oKpg==`。来宾重新计算 SRI，并将安装用的 CLI 入口与 npm tarball 内的入口逐字节比对。

## macOS 来宾与原生断言

1. 从共享存储克隆出 `dsh-job-20261110T072545-58672`。基座日志记录该克隆和上文 OCI 摘要。来宾的 `sw_vers` 为 macOS `15.7.7`（`24G720`），`uname -m` 为 `arm64`。Guest Agent 在已登录 GUI 会话的同一 UID 下执行。输入挂载为 AppleVirtIOFS，实际写入探针返回 `EPERM`。
2. 同一来宾检出 `v0.4.21`，重新核对包 SHA-256、包内提交和宿主 SRI。Node 为 `v24.21.0`、npm 为 `11.19.1`。原生探针实际使用的 Electron 可执行文件报告 `v44.7.0`。准备 Web 设置页所需的完整 Chromium `156.0.8078.4`，Playwright revision 为 `1248`。
3. 在新建、插件依赖为空的 profile 中，通过真实 `dsh plugin --profile coopanion-install add` 安装规范包。探针验证 bundle 自动启用且没有兼容豁免，再通过 npm DSH Host 的 profile Loader 启动它。探针连接实际 Electron 窗口，检查桌宠 DOM、关闭并从设置重新打开窗口，最后检查宿主退出码为 0。标签上的 `npm run test:install` 完整通过。
4. 基座 runner 返回 `0`，并确认 `guestReclaimed=dsh-job-20261110T072545-58672`。收尾的 `tart list` 只列出已停止的本地基线和 OCI 镜像缓存，克隆目录和实验室锁均已消失。

通过阶段为 `admitted`, `host-contracts`, `web-settings-and-native-window`。以下字段摘自来宾的 `artifacts/install-0.2.2-rc.1.json`。

```json
{
  "dsh": "0.2.2-rc.1",
  "sourceCommit": "810789948475c42deb8333333510fa25b4e3ed7e",
  "archiveSha256": "248f799f6baa218e2acac6bda5b0a95abf77a6dcc64340f6a83f865ad785cae3",
  "plugin": "@takboo/dsh-coopanion@0.4.21",
  "installed": true,
  "profileLoader": true,
  "nativeWindow": true,
  "closeAndRelaunch": true,
  "cleanShutdown": true,
  "riskExemption": false
}
```

载体为 macOS Tart 来宾中的 npm DSH Host 和 Coopanion Electron 窗口。官方签名 DSH Desktop 此轮未运行。

## Linux Web 回归

使用标签对应源码调用 `scripts/verify-engineering.sh`，基座为该脚本原有的 `9ed36752356975cd7d47c11d63744220443c1bf7`。Linux arm64 容器的镜像 ID 为 `sha256:4ed32e3fe08ba97f9dda137427ca84cc17efbb633248f753ad512dedb2974744`，宿主报告记录的包 SHA-256 和源码提交与上文一致。DSH `0.2.2-rc.1` 通过准入、Web 启动、项目探针和卸载，`0.2.1-rc.4` 按预期拒绝。项目的 `test:inbox-ui` 也通过，Chromium 为 `156.0.8078.4`。

## 复跑中解决的准备问题

| 发生阶段 | 观察和处理 |
| --- | --- |
| 来宾挂载预检 | Guest Agent 的 PATH 缺少 `/sbin`，而 VirtioFS 的挂载点是共享目录的父级。改用绝对命令路径，并在实际输入目录验证写入被拒绝。共享目录返回 `EPERM`。 |
| 来宾依赖准备 | host-only 来宾无法解析 npm registry。宿主在临时目录准备 npm 依赖和 pnpm 离线存储，只读传入来宾。来宾中的 Loader 重新创建安装结果。复跑脚本使用彼此独立的临时 npm 配置文件。 |
| 安装探针运行到 Web 设置 | 来宾 `dsh-job-20261110T072048-57701` 已通过 `admitted` 和 `host-contracts`，并连接到原生窗体。只有 headless shell 时，标签的探针在打开设置页报缺少 `chromium-1248`，退出码为 1。该来宾已回收，复跑改为暂存完整 Chromium。 |

复跑使用[开发指南的本地 macOS 原生安装入口](../../development.md#本地-macos-原生安装)。宿主临时依赖与发布附件随任务清理，项目只保留脱敏报告和复跑入口。
