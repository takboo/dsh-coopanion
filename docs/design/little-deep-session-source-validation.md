# 新会话工作状态来源修复

2026-10-30，`codex/little-deep-api2`，基于 `550d895d7f2528194a05fa0daea803f631cd0f35`。本轮修复宿主选择表演来源的方式，工作／生活表演及已安装的小湛 0.0.2 角色包不变。

## 原因与修复

指定会话 `session-7c4551ba-7973-4108-88a9-99a60914bc8b` 有连续 148 个持久事件，一回合工作 85.526 秒，19 次工具调用。首个工具在开工后 2.112 秒出现，包含实际思考和工作阶段，没有正式提问／审批。只导出事件计数与最小工作元数据，不复制正文、推理或工具参数。

实机桌宠聊天仍指向旧会话。Model 有意保留聊天目标，而状态扩展误把这个目标当作唯一表演来源，给角色传入 work=null。之前的实际模型验证手动选中了测试会话，漏掉“旧聊天空闲、新 session 开工”的路径。

最小用例先复现失败，再修复：聊天目标保持原值，表演自动跟随新工作。选中的会话有工作／请求时优先；空闲时呈现真实待处理请求或其他活动会话，同级来源保持稳定。工作、请求和结算属于同一完整来源身份。此选择不修改聊天目标、草稿、发送、回执或审批权限。协议字段详见[状态契约](../character-state-contract.md)。

## 验证范围

本轮使用既有 0.0.2 ZIP，SHA-256 为 `472e0b31f8d778ff4acfb76074d40d8c002cb54074a78f65280890b17a5bd61f`。包内解析器和角色实现不变；只更新宿主投影。原 ZIP 的 source.json 是原构建的来源记录，不代表本轮宿主源码摘要。

验证环境为 macOS 15.7.7 / 24G720 arm64 VM、Node 24.21.0、Electron 44.7.0、Chromium 156.0.8078.4，使用新来宾源码目录及独立 profile。

- 指定会话经实际 PetModel 与宿主投影器回放：142 个活动快照均归属新工作会话，含 focus／tools／report，聊天目标全程不变，结束后恢复空闲。
- 浏览器和 Electron 各 13 场景通过。新增旧聊天空闲、新会话潜水、完整请求身份及退出后续同一工作段；原有混合请求、尺寸、隐藏恢复、拖拽、皮肤与旧 paper-star 兼容继续通过。原生场景使用隔离测试沙箱开关，不代表系统沙箱或物理实机验收。
- 29 个 Vitest 文件通过：236 项通过、1 项原有跳过；另 12 个构建／Client 用例通过。类型及元数据检查通过。
- test:ui、test:notification-ui、完整 test:inbox-ui 通过，含发送目标冻结、草稿／回执、混合请求、生活互动及共享投掷。

同一固定 tgz 用于隔离 CLI 安装与实际 Desktop 更新，角色保持既有 ZIP。完整插件包摘要、运行时 productDigest、源码摘要及安装回执关联保存在本机独立目录 `artifacts/little-deep-session-source-20261030-okbx77tj/verification.json`；该忽略目录不保证在其他 checkout 存在。源码导出不带 .git，构建 commit／dirty 为 null，最终提交另绑定于验证记录。私密配置备份与原始安装日志不进入仓库。

真实 provider 驱动已补上“旧聊天空闲”的前置场景，但本次修复验证没有重新调用 provider；本次指定旧会话核对是持久元数据回放。随后用户新建真实 session 并确认工作主线及请求续接正常，另见[2026-10-30 实机体验记录](little-deep-real-session-acceptance.md)，不改写本次回放的证据范围。未发布或推送。

## 2026-10-30 主分支同步

按用户要求将本分支 rebase 到远程 main `54684143f4c86724c852b1a93cde00cb2c43a7e0`（v0.4.15），无冲突，保留全部 13 个开发提交。重放后的测试源码提交为 `5ab48ea904875bea7436ea19f07358ece744669c`；原提交保留在本地备份分支 `codex/little-deep-api2-before-main-20261030`。range-diff 的两处变化仅为主分支周围上下文；29 个主分支独有文件与 197 个开发分支独有文件的树内容均保持，6 个双方修改文件另外复查。

macOS 15.7.7 / 24G720 arm64 VM 中使用独立源码目录，核对依赖图只有根包版本元数据变化，复用相同图的依赖。以下检查通过：

- 类型、元数据、构建；31 个 Vitest 文件、244 项通过／1 项原有跳过，另 13 个构建／Client 用例通过。
- test:ui、test:notification-ui、完整 test:inbox-ui，包含主分支新增的聊天目标确认、存档物理步进及几何重同步用例。
- 原 0.0.2 ZIP 的浏览器／Electron 各 13 场景，包含后台开工、请求续接和旧角色兼容。
- 原生生命周期分别在跟踪开启、跟踪关闭及迟到显示事件注入下检查，每组 4 种初态，共 12 次正常退出。属于隔离受控检查，未扩大为物理平台验收。

本机资料位于 `artifacts/little-deep-rebase-20261030-2o_4db7v/`，绑定备份／新基线、range-diff、743 个测试源码文件及 484 个运行时输入；构建 productDigest 为 `e47a688fba3b1ac04d7a9bd7bc980cddca684ab65bc5e8c12fc37a86f4699f8a`。源码导出没有 .git，构建 commit／dirty 为 null；最终文档提交另绑定于 verification.json。

本轮未重新分发、安装或调用真实 provider，之前实机验收仍归属原固定包。本轮启动的测试 VM 已关闭，旧证据保留原字节；未推送或发布。

## 2026-10-30 rebase 版实机试装

按用户明确要求，将源码提交 `ec91d1966b4b76181752f721bb01a8c1743fa354` 的 0.4.15 插件安装到实际 Desktop profile，继续使用原 0.0.2 角色包。较前述完整回归源码只有两处文档变化；运行时 productDigest 仍为 `e47a688fba3b1ac04d7a9bd7bc980cddca684ab65bc5e8c12fc37a86f4699f8a`。

VM 使用固定 Node 24.21.0／npm 11.19.1 生成唯一 tgz，SHA-256 为 `df7b1405b1a6acbaea0a583d511f33edd332fc448d61c7380e317786b8383064`。先通过独立 profile 的官方 DSH 0.2.1-rc.3 CLI 安装及包内 CharacterStore 的旧角色／0.0.2 兼容检查，再用相同字节经官方 Desktop CLI 更新实机。安装后逐一核对 654 个插件文件、9 个角色文件；角色 revision、选择、既有配置与其他直接依赖均保持。原配置及旧包留在用户目录的私密回滚备份中，不复制到仓库。

正常重启后，Harness 会话界面及 Little Deep Experimental 已加载。实际桌宠服务器提供的 pet.js、character-state.js、session-ui.js 与该包／源码一致。随后用户直接反馈“测试通过”，本轮 rebase 版实机工作流程体验按该反馈记为通过；本次未提供新的 session ID，没有新增指定会话日志核对，也没有借用此前固定包的实机验收。

本地资料位于 `artifacts/little-deep-rebase-install-20261030-gckze668/`，含唯一 tgz、源码与包摘要、隔离安装检查、实机安装回执及启动核对。源码导出不含 .git，构建 commit／dirty 为 null，源码提交与后续记录提交另绑定于 verification.json。本轮测试 VM 已关闭；未推送或发布。

用户后续确认单列于 `artifacts/little-deep-rebase-acceptance-20261030-9l51svt5/`，绑定同一包与角色摘要；安装时的固定报告不回写。该确认不扩大为目标完成、异常／停止或生活交互候选的体验确认。
