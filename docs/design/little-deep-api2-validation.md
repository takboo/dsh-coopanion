# 小湛实验性 API 2：首轮接入与 VM 验证

2026-10-29，`codex/little-deep-api2`。工作／请求的已确认表演已接入实际宿主；这是本地实验包，未发布，也未覆盖用户体验及物理设备验收。当前方案与后续范围从[设计入口](README.md)接手。

## 行为与兼容

宿主提供选中会话的完整工作身份、focus／tools／report、源时间、完整待处理请求身份和生命周期。事件时间与宿主 step 动画时钟分离，密集工具往返保留集中工作尾巴段；?／! 结算后接当前工作。running 通知先于 turn/start 到达时不制造临时工作身份。普通回合结束回安静陪伴，共享完成语义不变。

[状态契约](../character-state-contract.md)通过清单显式选择加入，API 仍为 2。旧角色继续收到原神态及动作字段；固定上游沙箱和 body kit 未改。角色只接收最小元数据，不接触正文、推理、工具参数、凭证或请求提交权限。

首轮包不启用自主行走、生活抚摸／隐身、异常新分镜或目标完成庆祝候选。已确认生活段仍可在浏览器样片观看，产品空闲态暂用安静陪伴。

## 实际环境与产物

来宾 macOS 15.7.7 / 24G720、arm64，4 CPU / 8 GiB；Node 24.21.0、npm 11.19.1、pnpm 11.7.0。浏览器 Chromium 156.0.8078.4；原生 Electron 44.7.0。DSH 为官方安装的 `0.2.1-rc.3`，provider/model 为 `opencode-go/deepseek-v4.1-flash`。

源从 `e4a0e9b294bfc86d31d0826aeb4c4898f56c5bd6` 加本分支改动导出到新的 VM 目录，未覆盖旧 checkout。来宾没有 .git，包内 build-info 的 commit／dirty 为 null，不能冒充某个 Git 提交的直接构建；源码输入与构建产物用摘要绑定。

| 产物 | SHA-256 |
| --- | --- |
| 实测插件 tgz（本地测试版 0.4.14） | `b19390ba1e8f181dda3b9995a795767f00088cdf430e4cdbaf29eb266a720165` |
| 实测角色 little-deep-r3.zip（0.0.1） | `5f8c978c55da00e7e0cdcf50384a241f2162f1f5aa0512b7b6f50f16e8fff8b7` |
| 插件 productDigest | `98a174c932b0f7b3c25fd9d8fb9e480d1240851e6b164418ef64748f319c1716` |

本机证据根目录为 `artifacts/little-deep-api2-20261029-9cew5pay/`（忽略的本地产物，其他 checkout 不保证存在）。角色 ZIP 自带 source.json 与原始许可；插件和角色均使用固定文件完成安装及测试，没有覆盖已测产物。最终源码与证据摘要见该目录 `verification.json`。

## 验证结果

| 层次 | 结果与边界 |
| --- | --- |
| 类型及单元回归 | typecheck、verify:metadata 通过；29 个 Vitest 文件，233 通过／1 跳过；另 12 个构建／发布辅助与 Client 用例通过 |
| 表演与只读观察 | 70 个引擎用例、3 个观察器用例通过；固定回放与当前段落分别保留原边界 |
| 既有 UI | test:ui、test:notification-ui、完整 test:inbox-ui 通过，含字号、多屏及 NPC 受控回归 |
| 新包浏览器 | 实际 ZIP 导入及沙箱，11 场景通过；事实输入为受控快照 |
| 新包原生 | 实际 Electron／IPC／角色沙箱，11 场景通过；事实输入为受控快照，使用隔离测试沙箱开关 |
| 真实模型实装 | 官方 DSH CLI 安装固定 tgz，正常 Chromium sandbox；实际 provider 生成、18 次文件读取、两次正式提问、一次实际审批拒绝，21 次工具均结算，turn/end=completed。两问请求身份不同，工作开场始终为 1；答复及拒绝后分别实际回到潜水，最终待处理与符号清空、完整身体回安静态 |

11 个受控场景覆盖：导入潜水、24 次工具／思考切换、混合请求及完整身份、等待期间最新汇报、隐藏恢复、减少动态、90／150／240 尺寸、请求中拖放、关注切换、最小元数据和旧 paper-star 兼容。原生与浏览器为同一 ZIP。

真实模型测试没有替换 LLM、伪造 session 事件或使用旧日志重放。测试答复器只为本轮隔离会话答复“继续／结束”，为无害探针工具拒绝审批；不是用户本人操作，也不证明物理通知或自然交互观感。临时 key 仅通过隐藏输入、SSH stdin 和进程环境传递，profile 只保存环境变量引用，未写入仓库或报告。原始会话留在 VM 私有目录，报告只保留元数据和截图。

最终连续检查为证据目录 `vm-final/api2-real-r8/validation.json`，记录 129 个真实 session 事件和 634 个生成流帧。同期原生截图包括 `real-question-1.png`、`real-approval.png`、`real-resume-after-question.png`、`real-resume-after-approval.png` 与 `real-turn-ended.png`；工作续接与最终完整身体均有独立断言。旧尝试按原字节保留，不作为最终通过记录。

## 复现入口

先按[VM 说明](../macos-vm-testing.md)准备独立环境，再按[包说明](../../examples/little-deep/README.md)从完整源码构建一个新的 ZIP。受控用例：

```bash
DSH_CHARACTER_ZIP=/absolute/little-deep.zip DSH_TEST_ARTIFACTS=/new/output/ui \
  node tests/little-deep-api2-ui.mjs
DSH_CHARACTER_ZIP=/absolute/little-deep.zip DSH_TEST_ARTIFACTS=/new/output/native \
  node tests/little-deep-api2-native.mjs
```

浏览器在非默认缓存时同时设置 CHROMIUM_PATH 与 PLAYWRIGHT_BROWSERS_PATH（完整收件箱测试的子进程也会启动浏览器）。实际模型驱动为 `tests/little-deep-api2-host.mjs`，使用 DSH_TEST_RUNTIME、DSH_TEST_PACKAGE、DSH_CHARACTER_ZIP、DSH_TEST_ARTIFACTS 四个绝对路径；临时 key 由 `tests/helpers/private-provider-run.py` 从 stdin 读入环境，不放进命令或配置。该用例会实际调用 provider，创建独立 profile 并保留私有会话日志。

尚未覆盖 Windows／Linux 原生、物理多屏及混合 DPI、长期资源、实际通知中心、真实用户输入观感，以及允许审批、提问取消和未确认的新分镜。完成本轮 VM 验证不自动完成这些验收或产生正式发布。
