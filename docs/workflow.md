# 工作流与验证门禁

本仓库的日常开发门禁与宿主验证入口由根目录 [`mise.toml`](../mise.toml) 统一声明，并通过 [`dsh-engineering.lock.json`](../dsh-engineering.lock.json) 锁定共享工程基座 `dsh-plugin-engineering` 的精确 tag 与提交。

## 首次准备与唯一门禁

首次运行统一门禁前需先准备两项前提：
1. 安装项目与锁定基座所需的 `mise` Node 运行时：`mise install` 会安装本项目固定的 Node `24.21.0`，而锁定基座 `v0.2.0-rc.1` 另要求 `mise` 管理的基座 Node `24.22.2`。
2. 定位共享基座 checkout：`mise.toml` 在启动 `locked-run.mjs` 之前先由 shell 展开 `${DSH_ENGINEERING_CHECKOUT:-../dsh-plugin-engineering}`；若基座仓库不在相邻目录 `../dsh-plugin-engineering`（例如在独立的 git worktree 中运行），即使已配置 `${XDG_CONFIG_HOME:-$HOME/.config}/dsh-plugin-engineering/checkout`，也必须显式导出 `DSH_ENGINEERING_CHECKOUT` 绝对路径。

```bash
mise install
mise install node@24.22.2
export DSH_ENGINEERING_CHECKOUT=/path/to/dsh-plugin-engineering
mise run setup
mise run check
mise run verify:host
```

- `mise run setup`：执行 `npm ci --ignore-scripts`，按随包锁文件 [`npm-shrinkwrap.json`](../npm-shrinkwrap.json) 安装依赖。
- `mise run check`：通过 `depends` 调度静态与宿主机门禁（任一失败即整门失败）：
  1. `check:shell`：经锁定基座的 `locked-run.mjs check-plugin --skip-path docs/evidence` 校验锁文件、`mise.toml` 契约、根目录无打包残留、`.rgignore` 历史降噪、包元数据导出与 EGM 文档索引。
  2. `check:metadata`：`npm run verify:metadata`，核对 `package.json`、`npm-shrinkwrap.json` 与 [`docs/release-notes.md`](release-notes.md)。
  3. `check:typecheck`：`npm run typecheck`，同时检查 Host 与 Client TypeScript 类型。
  4. `test`：`npm test`，运行核心单测、发布预检、Client 构建、多语言与兼容性巡检单测。
- `mise run verify:host`：严格串行 DAG（`verify:pack` → `verify:host:container` → `verify:host`）：
  1. `verify:pack`：`node scripts/verify-host.mjs pack`，先确认 `artifacts/` 与 `artifacts/verify-host/` 非符号链接且位于仓库根目录内，清理并重建 `artifacts/verify-host/`，构建并打包单一候选包 `artifacts/verify-host/candidate.tgz`，对同一候选包运行 `scripts/check-package.mjs`（`E1` 打包元数据校验），并默认要求工作区干净（`dist/build-info.json` 中 `dirty === false`）且包内宿主目标／Web 探针与已提交 `HEAD` 逐字节一致（仅在显式设置 `DSH_VERIFY_ALLOW_DIRTY=1` 时允许脏树试跑并输出非正式 E2 证据警告）。
  2. `verify:host:container`：经 `locked-run.mjs container all ... HEAD artifacts/verify-host/host.json` 在锁定 Linux 容器内验证真实 DSH 宿主准入、拒绝与浏览器激活。
  3. `verify:host`：`node scripts/verify-host.mjs post`，复核 `host.json` 的 `provenance`、`HEAD`、包摘要、`admit`/`refuse` 结果及包内 `dist/build-info.json`（同样遵循默认干净约束），并在同一镜像的新临时容器中以同一候选包运行 `npm run test:inbox-ui`，日志写入 `artifacts/verify-host/inbox-ui.log`。

## 锁定基座诊断与契约阅读

通过 shell 启动 `locked-run.mjs` 脚本本身时，先使用 `DSH_ENGINEERING_CHECKOUT`（默认 `../dsh-plugin-engineering`）解析脚本路径；脚本启动后，其内部按 `--checkout` > `DSH_ENGINEERING_CHECKOUT` > `${XDG_CONFIG_HOME:-$HOME/.config}/dsh-plugin-engineering/checkout` 核对锁定基座仓库：

```bash
node "${DSH_ENGINEERING_CHECKOUT:-../dsh-plugin-engineering}/scripts/locked-run.mjs" doctor
node "${DSH_ENGINEERING_CHECKOUT:-../dsh-plugin-engineering}/scripts/locked-run.mjs" docs docs/engineering-contract.md
```

- `locked-run.mjs doctor` 校验基座 checkout、锁文件 tag/commit 与 `mise` 管理的 Node 运行时。
- `locked-run.mjs docs <path>` 从锁定的基座提交只读输出工程契约与接入规范，避免读到未锁定分支上的漂移文档。

## 证据等级（`E0`–`E4`）

报告必须明确列出本轮实跑的最高证据等级，未实际执行的等级一律标为 `not-run`，禁止以低等级代替高等级。

| 等级 | 含义 | 本仓代表入口 | 边界说明 |
|---|---|---|---|
| `E0` | 静态外壳、文档与结构门禁 | `mise run check` 中的 `check:shell`、`check:metadata`、`check:typecheck` | 不代替单测、打包或真实宿主运行 |
| `E1` | 宿主机单元测试与同包元数据校验 | `mise run test`、`mise run verify:pack`（`scripts/check-package.mjs` 检查同包 `locale/*.json`、`icon`、`dist/build-info.json` 与对应源码） | 使用受控夹具与模拟边界，不代替真实 DSH 宿主安装 |
| `E2` | 隔离 Linux 容器真实宿主与浏览器回归 | `mise run verify:host`（`host.json` 准入／拒绝／Web 探针 + 同镜像同包 `test:inbox-ui`） | 无图形桌面会话，不代替原生 Electron 窗口或物理设备验收 |
| `E3` | 原生桌面与隔离来宾系统验收 | [共享 Tart 复跑](development.md#本地-macos-原生安装)、Windows 原生几何／置顶／指针回归、`test:desktop` / `test:keyboard-native` / `test:install` | 自动化矩阵与物理实机、多屏／混合 DPI 及真实模型会话分别报告 |
| `E4` | 公开分发与渠道安装核验 | [发布流程](releasing.md)（同包 `verification.json`、`SHA256SUMS`、npm 与 GitHub Release 核对） | 本地构建或试装成功不能代替正式发布核验 |

## 改动面与最小必跑验证矩阵

| 改动范围 | 最小必跑验证 |
|---|---|
| 文档、索引、锁文件或工程外壳（`mise.toml` / `.rgignore` / `scripts/verify-host.mjs`） | `mise run check`；涉及容器入口或锁文件升级时补跑 `mise run verify:host` |
| Host / Client 业务、完成语义（`src/completion.ts`）、通知或会话逻辑 | `mise run check`、`npm run build`，按[关键行为回归](development.md#关键行为回归)补跑对应测试 |
| 浏览器回复、收件箱、字号、多屏或 NPC 日常 | `mise run check` + `npm run test:inbox-ui`（或 `mise run verify:host` 容器内复跑） |
| 打包清单、宿主兼容声明、图标／多语言导出或容器探针 | `mise run check` + `mise run verify:host`（同时覆盖 `E1` 同包校验与 `E2` 真实宿主准入／拒绝） |
| 原生窗口、生命周期、键盘、多屏拖拽或发布候选包 | 上述门禁 + 对应隔离原生／Tart 验收与[发布流程](releasing.md) |

## EGM 文档结构与 `.rgignore` 约定

- **L1 导航索引**：根目录 [`README.md`](../README.md) 面向用户展示，[`AGENTS.md`](../AGENTS.md) 负责接手约束，[`docs/README.md`](README.md) 全量索引 `docs/*.md`，[`src/README.md`](../src/README.md) 映射 `src/` 源码结构。
- **历史证据降噪**：[`docs/evidence/`](evidence/README.md) 保留原始历史证据字节且不可修改；由根 [`.rgignore`](../.rgignore) 以 `/docs/evidence/` 排除出默认检索，禁止在之后追加 `!` 反排除或添加嵌套 `docs/.rgignore`／`docs/.ignore`。需要溯源时使用 `rg --no-ignore docs/evidence`。
- **工作区整洁**：仓库根目录禁止遗留 `.tgz` 或 `.zip` 产物；候选验证产物统一落在已忽略的 `artifacts/verify-host/`。
