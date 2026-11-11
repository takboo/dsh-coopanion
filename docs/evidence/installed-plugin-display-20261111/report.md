# Coopanion 已安装插件展示验收

2026-11-11（Asia/Shanghai）。正式 0.4.22 的中英文回退已复现。本地候选包在 DSH 0.2.2-rc.1 的独立 Web profile 通过中英文标题、描述和图标检查。

## 规则与执行环境

- 分发规则取自基座分支 codex/installed-plugin-display-evidence。取回后核对完整提交 `3f39a9f555bd1e4a7c568df42623a3ad9974963a`，读取该提交的指南。[固定版分发指南](https://github.com/takboo/dsh-plugin-engineering/blob/3f39a9f555bd1e4a7c568df42623a3ad9974963a/docs/distribution.md) · [基座 PR #8](https://github.com/takboo/dsh-plugin-engineering/pull/8)
- 实际执行使用项目 `scripts/verify-engineering.sh` 固定的 Linux runner 提交 `9ed36752356975cd7d47c11d63744220443c1bf7`。发布对照用该提交的 `run-container.sh web`，候选用项目入口的 `all`。本地镜像 ID 为 `sha256:4ed32e3fe08ba97f9dda137427ca84cc17efbb633248f753ad512dedb2974744`。环境为 Linux arm64、Node `24.22.2`、pnpm `11.28.5`、Playwright `1.56.1` 和 Chromium `141.0.7390.37`。候选包构建使用项目固定的 Node `24.21.0` 与 npm `11.19.1`。
- 载体为 npm DSH Host 提供的 Web 应用。运行时 `dsh --version` 为 `0.2.2-rc.1`，上游提交 `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`。下载的 npm 宿主 tarball 已计算并核对 SRI `sha512-ijR9UEVYkG15Q/Q79JzvzLBzQOQfc63VLr9n6flpwHPhr5IKn2UxthnSoto/P9l7qGd7pPvI1Ra6TW7LH3oKpg==`。[项目宿主目标](../../../tests/engineering-targets.json)

## 安装标识与包结构

| 产物 | 安装标识 | 源码提交 | tarball SHA-256 |
| --- | --- | --- | --- |
| [正式 0.4.22](https://github.com/takboo/dsh-coopanion/releases/tag/v0.4.22) | `@takboo/dsh-coopanion@0.4.22` | `ca3bab64ab1751dfbb4841c05c3e9e843738be83` | `37835e5088b086988557bddff0caa3e2dfbd35fcbe3c1433801739be69999b49` |
| 本地候选 | `@takboo/dsh-coopanion@0.4.22` | `529b11324c6a01b35f4de9fa826de6f7bd63ea1e` | `599568b05f523f3556f460f5bd0d3f61c0f9ee185494306c5792bfd2617b6dce` |

正式包取自 GitHub Release，SHA-256 与发布核验文件和本轮 npm 下载一致。候选保留包版本，以源码提交及 SHA-256 区分产物。候选的 `dist/build-info.json` 记录对应源码提交与 `dirty: false`。源码干净时执行一次 `npm pack`。包校验、实际宿主安装和容器回归都消费这份 tarball。

候选包通过 `verify:metadata` 和 `verify:package`。压缩包含 `locale/en.json` 和 `locale/zh.json`，分别验证非空的 `meta.title`、`meta.description` 及与源码的字节一致性。包内 exports 提供 `./locale/*.json`，解包后通过包自引用实际导入两个 JSON。用正式 0.4.22 反查，新检查会因缺少 locale 导出拒绝该 tarball。原包校验继续核对 manifest、bundle、入口、对应源码、图标和完整摘要。

两包分别在新建的 Web profile 通过实际 `dsh plugin add` 安装，profile 依赖指向对应本地 tarball。候选在 `0.2.2-rc.1` 通过 Web 加载与卸载，卸载后配置和 profile 依赖无该插件。用相同候选包对 `0.2.1-rc.4` 验证，宿主按 `engines.dsh` 拒绝，profile manifest、锁文件和合成配置均通过无残留检查。

## 已安装列表实测

英文通过侧栏 **Plugins** 打开 **Installed plugins**。通过 DSH **Settings → General → English → 中文** 切换，等文档语言变为 `zh-CN` 后在 **插件 → 已安装插件** 复查。卡片按其包标识定位，断言可见标题、标题关联的描述和可解码的图标。

| 产物 | DSH 界面语言 | 卡片标题 | 卡片描述 |
| --- | --- | --- | --- |
| 正式 0.4.22 | 英文 `en` | `@takboo/dsh-coopanion` | DeepSeek Whale desktop companion and task notifications for DeepSeek Harness |
| 正式 0.4.22 | 简体中文 `zh-CN` | `@takboo/dsh-coopanion` | DeepSeek Whale desktop companion and task notifications for DeepSeek Harness |
| 候选 | 英文 `en` | Coopanion · Desk Pet Pal | A desk pet that keeps you company while you work. Catch up on Harness replies and pending actions, then pick up the conversation from your desktop. |
| 候选 | 简体中文 `zh-CN` | Coopanion · 桌宠搭子 | 一只陪你工作的桌宠，帮你收好 Harness 的回复和待办，想接着聊时就在手边。 |

四次观测的卡片图标均解码为 180×180 PNG，图像字节的 SHA-256 为 `c9b49505f035fa2e0947be79730c27c0f662285c4877837b7a8cbbc85967dabb`，与包内 `assets/coopanion.png` 一致。正式包的两语言对照完成于 11:04，候选宿主核验完成于 11:08。正式包对照探针的 SHA-256 为 `553c7dfde4375e5d966a4a4a9447bc8ccb6481564265d78ee8a6a04cd53480cc`，候选 Web 探针的 SHA-256 为 `8ea9b8eb29748fde36556497707d57b70a7623392cf580dc8425e2715d022994`。项目入口核对了探针、目标配置在源码提交、包内和 checkout 中的字节。[候选 Web 探针](../../../tests/engineering-web-probe.mjs)

对照中尝试用第二个 Chromium 上下文复用启动入口，导航未通过。后续通过实际语言菜单完成两种界面的检查。

## 项目回归

- `npm run typecheck` 通过。macOS 沙箱中的 `npm test` 首轮有一项诊断用例因调用 `/bin/ps` 被拒绝而退出。从同一候选 tarball 在固定 Linux arm64 镜像重跑后，`npm test` 全部通过，共 252 项 Vitest 与 43 项 Node 测试。
- 宿主 Web 探针也通过原有桌宠设置加载、无图形会话的错误与重试、随 Harness 启动开关保存和受控 HTTP 403 指引检查。
- 项目入口的 `test:inbox-ui` 全部通过。在同一 Linux 镜像中解开同一候选包，按包内锁文件准备 Playwright `1.64.0` 及 Chromium `156.0.8078.4`。收件箱冒烟脚本通过，随后 45 项会话、字号、多屏、拖动及陪伴用例通过。

## 市场渠道快照

2026-11-11 11:09（Asia/Shanghai）只读核对公开数据。市场卡片和 Discover 使用各渠道自己的条目。

| 渠道 | 可见名称和图标字段 | 索引版本和安装来源 |
| --- | --- | --- |
| dshmarket 对应目录 | 目录条目 `dsh-coopanion` 指向项目 PNG。Discover 索引标题为 `takboo/dsh-coopanion`，中英文描述涵盖动画桌宠、任务提醒、会话聊天和角色包，索引条目无 icon 字段 | Discover 格式 1 索引为 `0.4.20`，npm。[目录数据](https://awesome-dsh-plugin.com/plugins.json) · [Discover 索引](https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json) |
| dshfind | Discover 索引标题为 `dsh-coopanion`，英文描述涵盖动画桌宠、任务提醒与会话聊天，图标字段指向仓库所有者头像 | Discover 格式 1 索引为 `0.4.19`，npm。[Discover 索引](https://api.dshfind.com/market/dsh-index.json) |

验收覆盖候选包的 npm DSH Web 安装和两种界面语言。签名 DSH Desktop、其他受支持 DSH 版本的展示、其他语言回退、安装预览、市场卡片渲染与从 Discover 实际安装均未在本轮实测。候选保留为本地验收产物，正式发布沿用项目发布门禁。
