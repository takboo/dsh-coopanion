# 小湛当前设计与接手

更新于 2026-10-29。当前分支为 `codex/little-deep-livelings`，是基于 main 的独立浏览器角色原型；尚未接入 Harness、API 2、NPC 或原生窗口。产品契约描述现有大肥鱼插件。另一条 `codex/aliveness-foundation` 生活感路线未合并。

## 当前方案与下一步

**当前观看入口：[集中工作／生活连续对照](art-workflow/whale-little-deep-v3/work-life-study.html)。** 用户已授权按表演分层方向制作分镜与样片；[本轮分镜](storyboards/little-deep-work-life-v0.md)含 24 秒并排示例及六张同源关键姿态。工作收鳍潜入，密集工具／短思考保留尾巴，汇报或请求时浮出；生活保留完整鲸鱼，舒展、探看、露腹、追泡泡与休息。两段同机位、同配色、同尺度，可遮住分镜文字比较。

**当前整体样片观感已获确认。** 用户于 2026-10-29 反馈“整体观感可以”，并将生活段的交互、隐身等列为后续增强。当前工作／生活段落作为表演基线保留；后续生活增强的具体触发、隐身表现及恢复方式另按分镜展开。这次确认适用于当前独立样片，不推广为真实模式接入、目标完成候选或产品验收。

?／! 继续使用已确认控制器。请求期间保留工作 id、续点及扫摆相位，最后一个请求结算后接到最新阶段；若等待中已改为汇报，则保持完整鲸鱼说明，不潜回旧阶段。生活遇到示例工作会取消旧活动，再回生活时重新安排。本轮为分镜模拟，不向 Harness 发请求、提交决定或启用 NPC。

采用 **STORYBOARD 分镜优先**，制作过程同时形成可复用的角色工作流。接手先读[制作流程](character-production-workflow.md)、[本轮工作／生活表演语法](storyboards/little-deep-behavior-grammar-v0.md)及[普通工作主线分镜](storyboards/little-deep-mainline-v0.md)；已确认的局部分镜为[提问](storyboards/little-deep-work-v0.md)和[审批](storyboards/little-deep-approval-v0.md)。

**此前反馈与本轮范围：** 用户曾认为节奏有所改善，但潜水消失、整段变化仍少。按“事件 → 行为意图 → 持续表演段落”组织，不为每条记账事件配动作；本轮已补集中工作循环、工作／汇报交接及生活退让的分镜，并获当前整体样片观感确认。潜水用于明确的集中工作段，不以固定持续时长宣称识别长考。

事件时钟与动画时钟已拆分，4 秒自动潜水规则已移除。用户新建 `session-784ffb57-6579-4b21-9fb8-be69d164c65a` 用于现场观察；已只读记录 159 条事件、20 步、29 次工具调用，其中 14 次调用在观察接入后发生。已核对首个真实提问结算后继续工具、真实审批进入／用户拒绝后退出、第二个新身份提问进入／结算，以及 seq 158 的普通 reply 结束、零待处理请求。原生 DSH 界面和独立观察页均有核对；日志观察不等于正式 Host 请求回调、实时模型流或 Agent 存活验证。

**W03 提问与 W02 审批的当前样片均已获用户确认。** 身体沿用 1.5 秒出场，问号逐笔描画；感叹号约 0.8 秒内成形，圆点最后落下、轻颤更弱。保留同一造型和无底牌笔画，不以对视为目标。

用户于 10 月 29 日先确认提问出场节奏，随后确认“这版结算退场和交互接管可以，继续按同样的流程做审批场景”。提问出场、0.36 秒退场、轻触和拖动接管沿用已确认版本；该反馈不结算整套角色或产品体验。

用户随后确认“?和!通过了”。当前[审批样片](art-workflow/whale-little-deep-v3/approval-study.html)含连续表演、三张同源关键帧，以及允许／拒绝、并存审批和混合提问的模拟。审批／提问换标记时约 0.18 秒交叠，身体不重播出场；允许或拒绝都只结算对应审批，不推断成功或失败。两份样片共用控制器、手势、符号笔画和样式。**体验确认适用于当前局部样片；没有连接真实 Harness 请求，也不会授权工具或发送决定。**

当前[主线页](art-workflow/whale-little-deep-v3/work-study.html)已改为指定会话的脱敏结构回放：完整保留 655 条事件、59 个步骤、109 次工具调用及一次真实审批；另保留 7 段公开文字的起止时间，不导出任何文字内容。默认 8 倍速约 75.8 秒，可切换原速／16／32 倍。原 20 秒编排移到[固定分镜对照](art-workflow/whale-little-deep-v3/work-fixed.html)。

用户此前指出中间事件没有明显区分，且快速反复潜入、浮出，观感“很鬼畜”。旧版默认 8 倍时有 85 次身体切换、42 段潜入思考，0.28 秒保持不足以解决观看问题。随后将短思考、工具工作、文字输出改为完整鲸鱼的凝神、低头划鳍、展开回应；普通姿态保留约 1.4 秒，工具短间隙合并。当前默认回放没有潜入切换，用户认为节奏改善但失去潜水、变化不足；集中工作段的潜水正在重新分镜。

事实仍即时更新，身体以同一个 Actor 从当前形状、位置与速度承接，旧目标不排队补播。历史审批只在实际决定事件退出；原会话没有正式提问，附加模拟 `?`／`!` 单独标记和结算，不改原始结构。当前回放只读取本地投影，不执行工具、模型或审批操作。

此前 4 秒屏幕节拍候选已被最新要求取代，不作为当前规则。持续 thinking 不能证明真实长考，也可能涵盖网络等待。当前只读已到达事实，源时间计量与身体／笔画动画独立；后续事件改变不影响相同已发生前缀的表现。

按用户指定顺序，先完成连续承接的机制与浏览器检查，再制作[目标完成候选](storyboards/little-deep-completion-v0.md)。默认“先看连续承接”保留 seq 654 的 completed 事实，在该边界停住；选择“加入目标完成候选”才按完整目标身份演一次轻收势 → 开心喷水 → 安静陪伴。中途 seq 338 的 goal/change 不触发庆祝，新请求或新工作可取消未播放的后续动作。

局部 `?`／`!` 与当前工作／生活样片的通过不代表旧事件回放、目标完成候选或正式产品已通过。当前段落表演作为基线；生活交互、隐身等后续增强。异常分支、正式 Host 接入、复杂空闲生活和持续抚摸仍分别展开。

## 整体工作分镜进度

| 场景／层次 | 当前状态 | 尚缺内容 |
| --- | --- | --- |
| 集中工作／生活对照 | 分镜、24 秒连续样片与当前整体观感已获用户确认，作为表演基线 | 生活交互、隐身等后续增强，以及真实模式接入 |
| 普通工作与回复 | 已有真实结构回放、重复工作循环、过程文字阶段及同源承接抽样，待用户体验 | 整段循环与短促切换的观感、正式事件接入 |
| 提问 `?` | 分镜、连续样片、结算退场与基本交互已确认 | 正式请求事件适配 |
| 审批 `!` | 分镜、连续样片及当前交接表现已确认 | 正式审批事件适配 |
| 目标完成 | 已有按共享 completed 及目标版本触发的可选候选，待用户体验 | 起势、喷水和落定节奏，以及真实宿主验证 |
| 异常与停止 | 已有担忧／阻塞等基础动作，尚未逐类分镜 | 工具局部失败、回合失败、阻塞、输出上限、中断和用户停止的不同承接 |
| 交互与整体串联 | 已有两段已确认手势样片；主线已串入两类请求，支持暂停、定位与隐藏恢复 | 主线整段节奏评审、持续抚摸及全工作周期的真实竞争与恢复 |
| 产品接入 | 尚未开始 | Harness 真实事件、API 2、原生窗口及对应产品验证 |

原互动页的“完整体验”用于浏览已有动作；当前主线另按工作语义编排，尚待整段评审。制作流程已复用身体、笔画、请求控制器及同源采样；目标完成已有独立候选，异常分支仍未逐类制作。

旧藏尾表演撤掉了尾柄旁新增小头，改为原本鲸鱼缩身试探；该版仍待体验确认。现有 `pet-soft` 仍是一次性舒服眯眼，没有持续抚摸与松手余韵。旧版材料从[历史归档](../archive/README.md)追溯，不作为后续任务。

## 固定造型

- 保留蓝色、白腹、额顶缺口和用户选定的 **B 大小眼基准**，保留原生眨眼与渐变表情。
- 弯弯白斑不是选定的眼型；额外腹鳍与尾柄旁新增头部均不加回。
- 完整鲸鱼与思考尾巴使用同一实心尾鳍轮廓，短弯尾柄连接，参考官方 `FishLogo.tsx`；连接比例仍需体验判断。
- 思考尾巴保留明显左右扫摆、展开及侧转收窄，不能退回轻微晃动。
- 当前侧倾作用于整只鲸鱼，没有独立头部关节、正脸造型或全方向制作能力。

## 本地预览

在仓库根目录运行：

```bash
python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow
```

当前结构回放：`http://127.0.0.1:4187/whale-little-deep-v3/work-study.html`。可重播、暂停、拖进度、点真实事件定位，切速度或是否加入目标完成候选；切配置从头预演，换色保留姿态。附加模拟请求单独标记；定位／重播清除模拟，历史审批仍由原事件结算。页面隐藏暂停源时间和动作，完成候选恢复时保留一次动作进度。

本轮集中工作／生活样片：`http://127.0.0.1:4187/whale-little-deep-v3/work-life-study.html`。默认含 ?／! 分镜打断，可切不插入请求，暂停／重播／定位承接节点、手动插入与结算模拟请求，改变等待期间最新工作意图，以及观察生活退让与重新开始。24 秒事件示例结束后继续当前动作循环，不自动重播工作开场。

现场只读观察：运行 [watch-little-deep-session.mjs](../../scripts/watch-little-deep-session.mjs) 后访问 `http://127.0.0.1:4188/whale-little-deep-v3/live-study.html`。使用 Node `--experimental-transform-types`，指定一个 `--source <session.v4.jsonl.zstd>`、对应 `--session <id>` 和新的 `--output <artifact-directory>`；默认端口 4188。仅监听 loopback，HTTP 只提供读取，不发送答复／审批或修改源会话。日志不能覆盖实时流与进程状态；legacy 阻塞提问的区间观察单独标记。

原固定编排对照：`http://127.0.0.1:4187/whale-little-deep-v3/work-fixed.html`，保留无需介入及普通回复／继续思考片尾。

已确认的审批样片：`http://127.0.0.1:4187/whale-little-deep-v3/approval-study.html`。可试允许／拒绝、新审批、插入提问、决定已发送及后台会话审批；下方三张关键帧来自同一控制器。轻触或 Enter 回应，拖动只拉伸，Escape 取消。页面隐藏停止推进，恢复按最新事实呈现，不补播旧出场。

已确认的提问交接：`http://127.0.0.1:4187/whale-little-deep-v3/request-study.html`，保留答复／取消、跨回合、重复同步和后台会话检查，也可插入审批作混合对照。

出场与关键帧：`http://127.0.0.1:4187/whale-little-deep-v3/storyboard.html#preview`，保留重播、暂停、进度定位及配色／符号对照。

原互动原型位于同目录的 `index.html`，用于藏尾、触碰和拉伸等分镜外体验；不是当前工作事件接入。服务状态以现场检查为准，结束后在启动终端按 Ctrl-C。

## 文件入口

| 任务 | 入口 |
| --- | --- |
| 当前集中工作／生活分镜与样片 | [分镜](storyboards/little-deep-work-life-v0.md)、[连续对照页](art-workflow/whale-little-deep-v3/work-life-study.html) |
| 段落持续、请求暂停续接、生活退让 | [segment-performance.js](art-workflow/whale-little-deep-v3/segment-performance.js)、[work-life-performance.js](art-workflow/whale-little-deep-v3/work-life-performance.js)、[查看脚本](art-workflow/whale-little-deep-v3/work-life-study.js) |
| 复用制作步骤和分镜格式 | [角色产出工作流](character-production-workflow.md) |
| 当前意图、时序、能力与待评审项 | [普通工作主线](storyboards/little-deep-mainline-v0.md)、[审批分镜](storyboards/little-deep-approval-v0.md)、[提问分镜](storyboards/little-deep-work-v0.md) |
| 当前结构回放与事实／身体承接 | [session-replay.js](art-workflow/whale-little-deep-v3/session-replay.js)、[work-loop.js](art-workflow/whale-little-deep-v3/work-loop.js)、[session-study.js](art-workflow/whale-little-deep-v3/session-study.js) |
| 主线三种持续工作表演 | [work-activities.js](art-workflow/whale-little-deep-v3/work-activities.js)，原互动与已确认请求动作保持各自来源 |
| 当前表演分层、库缺口、工作／生活 | [表演语法讨论稿](storyboards/little-deep-behavior-grammar-v0.md) |
| 进行中日志观察 | [只读观察器](../../scripts/watch-little-deep-session.mjs)、[现场页](art-workflow/whale-little-deep-v3/live-study.html)、[现场脚本](art-workflow/whale-little-deep-v3/live-study.js) |
| 结构再生成与旧固定对照 | [提取脚本](../../scripts/prepare-little-deep-session.mjs)、[work-performance.js](art-workflow/whale-little-deep-v3/work-performance.js)、[work-study.js](art-workflow/whale-little-deep-v3/work-study.js) |
| 连续表演控制与样片查看 | [storyboard-performance.js](art-workflow/whale-little-deep-v3/storyboard-performance.js)、[storyboard.js](art-workflow/whale-little-deep-v3/storyboard.js) |
| 请求结算、打断与交互接管 | [request-performance.js](art-workflow/whale-little-deep-v3/request-performance.js)、[request-study.js](art-workflow/whale-little-deep-v3/request-study.js)；共用[符号笔画](art-workflow/whale-little-deep-v3/storyboard-symbol.js) |
| 角色、尾巴和分镜外交互 | [原型说明](art-workflow/whale-little-deep-v3/README.md)、[character.js](art-workflow/whale-little-deep-v3/character.js)、[harness-tail.js](art-workflow/whale-little-deep-v3/harness-tail.js)、[app.js](art-workflow/whale-little-deep-v3/app.js) |
| 上游接口与来源 | [Livelings 来源入口](art-workflow/vendor/livelings/README.md)、[Harness 来源](art-workflow/whale-little-deep-v3/reference/harness/source.json) |

```bash
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs tests/little-deep-storyboard.mjs tests/little-deep-requests.mjs tests/little-deep-approval.mjs tests/little-deep-mainline.mjs tests/little-deep-replay.mjs tests/little-deep-completion.mjs tests/little-deep-work-rhythm.mjs tests/little-deep-work-life.mjs
node --experimental-transform-types --test tests/little-deep-live.mjs
```

检查覆盖实际引擎的尾鳍轮廓、藏尾交接、独立请求身份、混合标记、交互竞争，以及主线同一实例跨段、确定性采样、两类请求的继续动作、普通回复与目标仍继续片尾、隐藏及减少动态机制。提问与审批的体验确认来自用户反馈；主线体验、长期表现、物理设备及产品宿主分别记录，正式接入仍未开始。
