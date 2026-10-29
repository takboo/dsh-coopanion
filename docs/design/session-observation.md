# 小湛会话结构与只读观察

这组工具核对事实折叠、请求身份、事件／动画双时钟，使用旧的表面工作动作。当前获确认的段落表演从[设计入口](README.md)进入；尚未写入本组工具，也尚未接入正式 Host。

## 工具与用途

| 入口 | 用途与限制 |
| --- | --- |
| [work-study.html](art-workflow/whale-little-deep-v3/work-study.html) | 固定会话的 655 条脱敏结构回放；旧 considering／doing／replying 表演，仅作机制对照 |
| [live-study.html](art-workflow/whale-little-deep-v3/live-study.html) | 指定日志的只读增量观察；由独立观察器提供，不从 4187 静态服务取得现场事实 |
| [work-fixed.html](art-workflow/whale-little-deep-v3/work-fixed.html) | 最早的固定 20 秒镜头对照，已被当前段落样片取代 |

结构回放在 [session-replay.js](art-workflow/whale-little-deep-v3/session-replay.js)，事实／身体承接及可选完成候选在 [work-loop.js](art-workflow/whale-little-deep-v3/work-loop.js)，表面动作为 [work-activities.js](art-workflow/whale-little-deep-v3/work-activities.js)。固定分镜的源码保留以支持对照与回归。

`advanceEventTime(ms)` 计量源事实时间，`advance(seconds)` 推进身体、笔画与可读停留。回放倍速只压缩事实时间，动画使用自身 dt。1.4 秒姿态保持和 0.8 秒工具桥接是旧表演参数；固定 4 秒潜水判断已移除。持续 thinking 或日志未结束均不能证明真实长考或 Agent 存活。

## 离线结构再生成

[prepare-little-deep-session.mjs](../../scripts/prepare-little-deep-session.mjs)复用当前 Model、Broker、CompletionTracker，读取一个已结束会话。它只导出元数据和公开文字的时间窗口，记录源摘要及投影源码摘要，拒绝覆盖不同内容的既有输出。

```bash
node --experimental-transform-types scripts/prepare-little-deep-session.mjs \
  --source /absolute/path/to/session.v4.jsonl.zstd \
  --zstd /absolute/path/to/zstd \
  --output /new/path/structure.json
```

回放可以暂停、定位、切换 1／8／16／32 倍速。附加模拟请求与历史请求独立；定位清理附加模拟，历史审批只按原决定退出。默认在共享 completed 边界停止；选择“加入目标完成候选”才观看[未确认的完成段](storyboards/little-deep-completion-v0.md)。

## 进行中只读观察

[watch-little-deep-session.mjs](../../scripts/watch-little-deep-session.mjs)每 500 毫秒读取一个指定 v4 压缩日志的完整帧，输出元数据 NDJSON。使用新的输出目录：

```bash
node --experimental-transform-types scripts/watch-little-deep-session.mjs \
  --source /absolute/path/to/session.v4.jsonl.zstd \
  --session session-actual-id \
  --output /new/path/to/observations \
  --port 4188
```

当前脚本依赖本机 `/opt/homebrew/bin/zstd`。打开 `http://127.0.0.1:4188/whale-little-deep-v3/live-study.html`；只监听 loopback，HTTP 仅允许 GET／HEAD。结束后在启动终端按 Ctrl-C。页面不答复问题、授权工具或修改源会话。

观察器复用 Model、Broker、共享完成判断和锁定版本的提问投影。legacy 阻塞型 `ask_user_question` 缺少 timed-question 投影时，单独标为 `blocking-tool-span`，按完整调用身份从工具调用观察到对应结果。正式接入仍应使用 Host 请求回调；日志观察不覆盖实时 reasoning／文字增量、Agent 存活或宿主兼容。

## 已核对的固定会话

以下均是 2026-10-29 的历史结果，两个会话现均已结束。新一轮验证应使用新事实，并绑定实际源码身份。

| 会话 | 核对结果 | 覆盖边界 |
| --- | --- | --- |
| `session-d1e0a596-a85e-47d6-a5a0-c3926016430f` | 655 事件、59 步、109 对工具、一次审批；7 个公开文字阶段后可继续工具；5 个局部工具错误；seq 654 才共享 completed | 无正式提问；离线结构不能证明运行中接入；seq 338 的目标状态变化不提前庆祝 |
| `session-784ffb57-6579-4b21-9fb8-be69d164c65a` | 159 事件、20 步、29 次工具调用；首个问题结算 → 工具 → 审批拒绝 → 新问题结算 → seq 158 普通 reply，无目标和待处理请求 | 接入时首问已等待；其出场未现场捕获。两问按 legacy 工具区间观察；未覆盖允许审批、混合请求或新段落表演 |

原生界面由用户实际答复／拒绝，我们只读核对。完整过程、原始文件摘要和当时局限见[归档说明](../archive/2026-10-29-work-mainline/README.md)。固定记录保留原字节，不把旧回放观感或机制通过推广为当前产品验收。
