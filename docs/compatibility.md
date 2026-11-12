# DSH 兼容性自动检查

[兼容性工作流](../.github/workflows/dsh-compatibility.yml) 每小时第 37 分钟从 main 读取官方 GitHub Release（含候选版）、npm latest/next 和官方 macOS ARM64 Desktop feed，平台调度可能延迟。默认只检查高于当前精确支持列表最高版本的目标，每轮最多三个版本；手动执行可指定精确版本或 dsh-v tag。

## 正式支持与候选结案

正式宿主范围以 [package.json](../package.json) 的 `engines.dsh` 和 DSH peer 声明为准。v0.4.24 将 `0.2.2-rc.2` 的审阅提案纳入正式 manifest 与 shrinkwrap，保留此前七版 Host 支持与运行时依赖。[PR #47](https://github.com/takboo/dsh-coopanion/pull/47)

v0.4.19 纳入了 `0.2.2-rc.1`，三个历史兼容性 Issue 已结案。发布身份、最终 CI、VM 范围及已知限制集中见[最近一次发布核验](releasing.md#最近一次发布核验)。[PR #38](https://github.com/takboo/dsh-coopanion/pull/38)

`0.2.2-alpha.2` 与 `alpha.3` 只保留固定配套组合的候选证据，未加入正式支持列表。alpha.2 默认浮动解析曾复现上游 preset 初始化失败；候选成功和 Issue 结案均不表示旧 alpha 的默认安装已通过。原始失败及后续复验入口见[历史失败追溯](#历史失败追溯)。

## 检查与状态

每个版本一个 Issue；发布物身份包含 npm integrity、上游 Release/commit 与 Desktop ZIP SHA-512。只有仓库所有者及 GitHub Actions 机器人的有效状态标记参与去重。执行前先记录 running 与尝试次数；npm 和 Desktop 独立结算。

- 同一发布物已完成时不重复安装；仅新增 Release 元数据时更新报告。
- Desktop 后到时只补 Desktop，保留原 npm 检查的提交与运行身份。
- 网络或安装准备暂时失败、超时、中断及缺报告为 retry；至少六小时后重试，同一组件身份最多自动三次。明确断言、依赖冲突或完整性错误为 failed。手动精确版本可复验。
- 候选检查成功为 partial，不能替代最终提交的常规 CI 或正式支持声明。未知 Desktop 运行时必须审阅，不能自动放宽。

准备提案要求目标版本不低于正式支持列表的最高版本。当前最高已支持版本可手动演练；较旧版本的复现需使用原记录对应的源码基线和产物。

报告读取兼容下载后的两种布局：多个 artifact 的具名子目录，以及单个 artifact 直接展开到输出根目录。准备阶段已经确认的依赖冲突保留为 failed，不因后续平台 job 未执行而降为“缺报告、等待重试”；单个组件仍须通过原有来源、目标和包摘要校验。

## 双轨宿主证据

发现阶段读取 npm `latest` 的精确版本和 integrity。SDK 组件身份同时绑定宿主和这份发布物，原包更新后会重新观察。发布轨在独立 Linux Docker 任务中下载并校验 npm 原始 tarball，使用默认准入安装到干净 profile。接受后用包内探针验证真实 Web 宿主和插件设置。拒绝时核对官方诊断、profile 回滚和配置中无该插件，报告 `refused-as-expected`。候选轨继续运行原有三平台适配安装矩阵，报告候选包 SHA-256、integrity、实际准入和运行阶段。两轨核对同一精确 DSH 版本和 integrity。插件断言失败记 `failed`，安装准备、浏览器启动或执行中断按实际阶段记 `retry`。

手动工作流输入一个精确宿主版本可同时演练两轨。可用 Docker 在本地复现发布轨，容器内安装项目锁定的 Playwright Chromium 后运行 `DSH_VERSION=0.2.2-rc.2 npm run compat:published`。候选适配使用 `compat:prepare` 和 `compat:check`，传入同一发现目标和构建目录。正式支持范围由项目 PR 审阅决定。

## 配套基线与验证范围

已审阅的 Cordis、Schemastery、Loader／Include／Group、Cosmokit 及 Host Timer 精确输入统一由 [reviewed-dependencies.mjs](../scripts/compatibility/reviewed-dependencies.mjs) 维护。准备 job、SDK／Desktop 的 npm Web Host 安装和提案／报告校验共用该定义。

各配套版本与候选 SDK 发布包的 peer 要求对应，包来自 npm 官方 registry，并按发布 integrity 校验后审阅源码。0.2.2 基线审阅中，Schemastery 的 `src/index.ts` 相对 3.18.5 未变；Cordis 的配置解析、更新、事件分发和依赖卸载，以及 Loader／Include 的配置写入和挂载发生变化，仍需类型、单元、真实 Loader 和恢复契约验证。

准备 job 在隔离副本更新精确 DSH 开发依赖、已有 peer、engines 及 npm-shrinkwrap.json，保留原有支持和配套表以外的顶层依赖；重建旧 Host 锁条目，保留其他锁条目。正式源码与工作区在前后做摘要核对，不自动改变正式 manifest、版本号或运行时依赖。未知版本沿用既有基线，若冲突则报告失败，待源码审阅后再调整精确配套定义。

Loader／Include／Group／Cosmokit 显式列入候选开发依赖，避免预发布范围解析到下一轮组件。准备阶段检查完整依赖树，提案校验拒绝嵌套锁条目混入未审阅版本；组件身份包含配套基线，避免复用旧组合上的证据。

SDK 检查及 Desktop 的 npm Web Host 安装保持官方发布字节和原有 peer 约束，安装后检查完整依赖树，并在报告中保存 `hostDependencies`；成功报告必须与审阅输入一致。官方 Desktop ASAR 按原字节独立验证。固定配套证据与普通 npm 浮动解析分别结算；正式 rc.1 的普通安装由发布矩阵验证。

基线和候选分别执行类型及单元检查，候选执行完整浏览器、通知与 test:inbox-ui。Linux 只构建一次候选 .tgz，三个安装 job 下载同一字节，验证摘要后分别在 Linux x64、Windows x64 与 macOS ARM64 运行真实 Loader、网页设置、通知／目标／会话契约、原生桌宠与恢复。项目基线继续保留静态准入断言。既有完整安装断言保留，候选没有跳过完成或接受回执检查。

Desktop job 在独立目录下载匹配的官方 macOS ARM64 ZIP，检查摘要、路径及符号链接、完整代码签名和 DeepSeek Team ID；允许的载体运行时由 [desktop-artifact.mjs](../scripts/compatibility/desktop-artifact.mjs) 校验。通知、目标完成与会话契约单独运行于真实 ASAR，随后在官方 Electron 中运行同包安装与桌宠联动。该 GUI 流程的 Web Host／Client 由对应 npm 产物提供，桌宠按产品正常路径使用其声明的独立 Electron 依赖；原生 Desktop shell、通知中心、真实账号模型及物理输入／多屏另行验收。

Desktop 契约探针从签名 ASAR 解析宿主模块。ESM 使用 ASAR 作为解析基点，CommonJS 使用以 ASAR 为基点创建的 `require`，两者都校验解析结果的来源。DSH `0.2.2-rc.2` 的目标完成检查曾因 `require.resolve()` 保留 npm 调用方的解析基点而失败，原始记录见 [Issue #46](https://github.com/takboo/dsh-coopanion/issues/46)。

## 报告与提案

检查 job 仅有读取权限，环境剔除令牌及 API 凭据，使用临时 HOME、DSH_HOME 与 profile。默认分支的报告 job 才能更新 Issue、创建分支与 Draft PR；pull_request 只检查。流程直接串联候选验证，不依赖机器人 PR 触发第二轮 CI。

依赖提案只允许 package.json 与 npm-shrinkwrap.json，严格核对目标版本、基线 manifest、锁内 registry 来源和 integrity。已有提案或人工修改不自动覆盖。候选报告不自动修改正式分支、标记 Ready、合并、打标签或发布。报告保留来源提交、目标身份、包摘要、平台、阶段及对应 Actions 链接；报告、必要日志、失败截图和候选包保留 14 天，应用 ZIP、依赖、浏览器和测试会话不上传。

当前发布资格仍由 [发布流程](releasing.md) 的最终提交全量 CI、正式支持矩阵的同包安装和 npm／Release 字节核验决定。

## 本地执行

使用 `.node-version` 和 `packageManager` 固定工具链。只读发现不启动浏览器：

```bash
npm run compat:discover -- --local
```

候选准备在共享基座的隔离 Linux 容器或项目 CI 内执行。容器内使用锁文件安装依赖，`PLAYWRIGHT_BROWSERS_PATH` 指向本轮环境提供的浏览器绝对路径。项目测试若需另一个匹配版本，在临时容器内准备并随任务回收。

```bash
DSH_VERSION=0.2.2-rc.2 npm run compat:prepare
```

示例版本对应 v0.4.24 的最高支持宿主，切换源码基线时先核对 `package.json`。准备输出目录含 candidate.json、proposal.json、候选包、paper-star.zip 和 report.json。随后设置 DSH_TARGET_JSON 为发现的完整目标 JSON，DSH_CANDIDATE_DIR 为该输出目录，再运行 `npm run compat:check`；macOS ARM64 上的 `npm run compat:desktop` 只接受匹配的官方 feed 身份。原生检查在隔离 VM 中串行执行，范围及环境要求见[开发指南](development.md)。

本地命令不写 Issue 或 PR。发现、状态与提案机制复用 dsh-session-bin / dsh-usage-state，MIT 许可保留在 scripts/compatibility/LICENSE；本流程不调用付费 AI 服务。

## 历史失败追溯

2026-11-05 核查的三个原始运行使用 Cordis `4.0.5` 开发基线，与候选 SDK 的 peer 要求冲突，均在 `target-lock` 阶段发生 `ERESOLVE`。当时基线安装、类型和单元检查通过，候选平台安装及 Desktop 检查没有运行；单 artifact 下载布局还曾使汇总器将该失败误报为待重试。

- `0.2.2-alpha.2`：[Issue #35](https://github.com/takboo/dsh-coopanion/issues/35)、[原运行](https://github.com/takboo/dsh-coopanion/actions/runs/41626179738)。
- `0.2.2-alpha.3`：[Issue #36](https://github.com/takboo/dsh-coopanion/issues/36)、[原运行](https://github.com/takboo/dsh-coopanion/actions/runs/41788822490)。
- `0.2.2-rc.1`：[Issue #37](https://github.com/takboo/dsh-coopanion/issues/37)、[原运行](https://github.com/takboo/dsh-coopanion/actions/runs/41922628817)。

Issue 保留原始要求、失败摘要、来源身份与后续候选复验，已随 v0.4.19 发布结案。重放原 artifact 只验证报告汇总，不算新一轮候选检查；后续成功不改写早期失败的含义。
