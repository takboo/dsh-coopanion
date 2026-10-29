# 小湛浏览器互动原型

当前分支、已选方案、最新用户反馈与下一步统一见[设计入口](../../README.md)。本目录是独立的纯代码角色体验，未接入 Harness、API 2、NPC 或原生窗口。

本轮先看[集中工作／生活连续对照](work-life-study.html)及[新分镜](../../storyboards/little-deep-work-life-v0.md)：同机位、同造型、同尺度的 24 秒示例。工作恢复收鳍潜入，工具／短思考在尾巴段内承接；生活保留完整鲸鱼，舒展、探看、露腹、追泡泡和休息。可遮住分镜文字比较，六张关键姿态由同一控制器按时间采样。

`segment-performance.js` 以明确工作／生活意图编排持续段落；`work-life-performance.js` 仅提供分镜模拟 cue。?／! 沿用已确认控制器，等待保留工作续点与扫摆相位，结算采用最新阶段；进入生活的旧计划可被工作取消，返回生活重新安排。查看页支持暂停、定位、换色、手动请求、改变最新工作意图及生活退让。用户已确认当前整体样片“整体观感可以”；生活交互、隐身等后续增强。尚未把此段落策略写入现场日志页或正式产品。

另保留[结构回放](work-study.html)，按[主线分镜](../../storyboards/little-deep-mainline-v0.md)读取用户指定会话的 655 条脱敏事件与公开文字阶段时刻。原会话有 59 步、109 次工具调用和一次审批，没有正式提问；模拟请求单独标记，不改原始结构。该对照采用完整鲸鱼的凝神、低头划鳍、展开回应，普通姿态约 1.4 秒，短工具间隙合并；本轮潜水段落独立评审，尚未替换这份事件对照。默认 8 倍速，支持 1／8／16／32 倍、暂停、重播与事件／进度定位。

连续承接检查后已另做[目标完成候选](../../storyboards/little-deep-completion-v0.md)：仅当共享 completed 关联完整目标版本时，轻收势、开心喷水一次、回到陪伴。默认仍先看连续承接，可从“查看阶段”选择加入收尾候选。新主线及收尾均待体验确认，尚未接入真实 Host。

回放推进在 `session-replay.js`，可重复状态与完成控制在 `work-loop.js`，三种主线工作姿态在 `work-activities.js`，查看页为 `session-study.js`。当前已拆分源时间与动画时间，撤销固定 4 秒自动潜水；计时不能凭空确认长考。用户认为节奏改善，但潜水消失且变化不足，下一轮按[工作与生活表演语法](../../storyboards/little-deep-behavior-grammar-v0.md)先收敛段落设计。结构由 `scripts/prepare-little-deep-session.mjs` 复用 Model／Broker／CompletionTracker 只读生成；不包含正文、工具参数／输出或推理内容。[旧固定分镜](work-fixed.html)及原控制器继续保留作对照。

`live-study.html` 由 `scripts/watch-little-deep-session.mjs` 在独立 loopback 端口提供，读取一个指定会话的日志增量。事实时钟独立推进，动画使用自身 dt；页面没有答复、审批或模拟按钮。legacy 阻塞提问按真实工具区间观察，和公开 timed-question 投影分别标记。它不能读取实时模型增量，也不能从日志未结束推断 Agent 仍在运行；正式 Host 接入仍未完成。

当前工作行为按 [STORYBOARD 分镜](../../storyboards/little-deep-work-v0.md)续做。[出场样片](storyboard.html#preview)是约 1.5 秒的“疑问浮现”，用户已确认这版出场节奏：收势、神态和侧倾交叠，左侧头前逐笔描画符号，随后放松等待；不强求对视。支持重播、暂停、进度定位及配色／符号对照，三张关键姿态从同一表演采样。减少动态时关闭颤动，页面隐藏时暂停推进。时序控制在 `storyboard-performance.js`，页面在 `storyboard.js`，共用笔画在 `storyboard-symbol.js`。

[回应与交接](request-study.html)已获得用户体验确认：提问结算后约 0.36 秒淡出当前笔画，身体立即继续工作、思考或待机；轻触与拖动接管当前姿态，松手采用最新请求事实。模拟面板可试并存提问、重复同步、continued、提示开关、发送已接收与后台会话；这些都不自行结算提问。

[审批样片](approval-study.html)对应[审批分镜](../../storyboards/little-deep-approval-v0.md)，已按同一流程复做并获用户确认。沿用 1.5 秒身体动作，感叹号约 0.8 秒内成形、轻颤减弱。允许和拒绝都仅结算对应审批，后续状态独立选择；混合请求换类型时短交叠标记、不重演身体出场。三张关键帧由同一控制器采样。用户确认“?和!通过了”，当前表演作为基线保留。

两页共用 `request-performance.js` 控制器、`request-study.js` 手势与模拟输入、`storyboard-symbol.js` 笔画及 `request-study.css` 样式。当前尚未连接真实 Harness，不会发送答复、授权工具或提交决定；持续抚摸尚未实现。

## 运行与观察

启动命令见[本地预览](../../README.md#本地预览)。主体验为本目录的 `index.html`；[小尺寸对照](size-sheet.html)展示 32／64／128 像素附近的日光、夜色轮廓。页面内可打开作者动作工作台，两者共用 `character.js`。

默认使用已选 B 大小眼，配 Deep 蓝、初版小湛蓝、奶白和夜游四套配色。修改配色、背景和尺寸不重建 Actor。声音默认关闭，可手动开启低音量合成音；系统减少动态偏好交给引擎 `calm`。

“走一遍完整体验”依次演示七种持续状态、完成／出错、六种招牌动作、抚摸和眨眼，最后回到待机。任意手动动作或角色按下会停止演示；页面隐藏时停止演示并暂停推进，不后台补播。

## 状态与动作

| 类型 | 动作 | 表现 |
| --- | --- | --- |
| 持续 | idle | 安静漂浮、原生眨眼、低幅摆尾 |
| 持续 | thinking | 身体变为实心尾巴，三秒一轮明显左右扫摆、展开／侧转收窄，偶发泡泡 |
| 持续 | working | 身体探出来，认真划动 |
| 持续 | waiting | 安静停留，减少动作 |
| 持续 | blocked | 收尾、担忧神态，等用户帮助 |
| 持续 | listening | 柔和神态，身体轻轻晃动 |
| 持续 | sleep | 闭眼、降低漂浮、尾巴慢下来 |
| 一次 | done / error | 开心喷水并落定／缓一缓，吐一粒泡泡 |
| 招牌 | peek-tail | 看你、缩身收鳍、藏下去、停尾观察，再舒展开 |
| 招牌 | spout / tail-wave | 抬头喷水／看你后摆尾招呼 |
| 招牌 | dive | 潜下去，带泡泡回来 |
| 招牌 | belly-show / bubble-ring | 侧身展开白腹／吹泡泡圈 |
| 补充 | blink-soft / pet-soft | 双眨／一次性舒服眯眼 |
| 补充 | peek-out / tail-settle | 缩身试探后返回原状态／轻轻收尾 |

## 藏尾巴与试探回应

`peek-tail` 约 6.2 秒：先看你 → 缩身收鳍 → 藏下去 → 留尾巴摆动 → 停尾 → 缩着身子观察 → 放心舒展开。观察阶段复用原本鲸鱼轮廓、白腹和眼睛位置，保持约 82% 大小及收鳍姿态；不生成单独头部。

藏着时轻戳或点“出来看看”，触发约 4.2 秒的回应：先停尾，再缩身探出来。原来在思考时会缩回去继续想，其他持续状态则舒展开并返回原状态。连续触碰不会重播开场，准备阶段也不会因每次轻戳而重置。眼睛在身体与五官位置稳定后再显现。切状态立即打断，不使用延迟回调补播旧动作。

这是等待用户反馈的表演实现，持续抚摸和松手余韵尚未改动。

## 直接互动与交接

- 靠近驱动视线。轻戳吐泡泡，连续两次双眨，三次藏尾巴；藏着时优先试探回应。按下睡眠中的角色会唤醒。
- 按住约 420 毫秒触发原生 purr，经角色适配为一次性舒服眯眼；藏着时改为试探回应。没有原生毛绒 `petting` 效果。按钮提供相同动作，便于触屏与键盘。
- 拉动只拉伸当前轮廓，松手无抛掷，恢复原持续状态；不代表产品位置拖放。取消指针不算轻戳。
- 手动切状态取消按住／拉伸和演示，不重置弹簧位置。一次动作结束回原持续状态，完成／出错则回待机。

主体验的 `interactive:false` 关闭引擎默认手势，由 `app.js` 适配鲸鱼手势。直接嵌入原生组件时，其默认手势包含抛掷与按住毛绒效果，不能推断与主体验相同。

## 轮廓、来源与检查

`whaleBody()` 的身体与 `harness-tail.js` 共用 48 个尾巴轮廓点，身体另分配采样点，避免重采样磨圆尾鳍。完整鲸鱼只弯尾柄，尾鳍整体旋转；思考时的侧转收窄属于有意动作。静止轮廓或测试对齐不代表用户已认可比例与连接。

官方卷起双叶来自固定提交的 `FishLogo.tsx`，配本地短弯尾柄。`RunningWhaleTail.tsx` 和 APNG 仅作动作参考；当前矢量运动是本地适配，并非 GIF 逐帧复刻。[源码、MIT 与来源摘要](reference/harness/source.json)、[官方 logo 参考](reference/deepseek-logo-20261028-source.json)和[早期用户参考](reference/source.json)保留。参考图不由运行页加载。

引擎与工作台保留 [Livelings 原始字节与许可](../vendor/livelings/README.md)，页面署名 Livelings by MakerJackie；不修改第三方源码。默认眨眼与偶发双眨沿用原生机制。

```bash
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs tests/little-deep-storyboard.mjs tests/little-deep-requests.mjs tests/little-deep-approval.mjs tests/little-deep-mainline.mjs tests/little-deep-replay.mjs tests/little-deep-completion.mjs tests/little-deep-work-rhythm.mjs tests/little-deep-work-life.mjs
node --experimental-transform-types --test tests/little-deep-live.mjs
```

测试检查真实引擎的轮廓平滑、刚性尾鳍、藏尾分段、独立请求结算、混合标记、手势，以及主线连续性、帧还原、请求退出、两个片尾、隐藏和减少动态模拟。另用浏览器观察主线查看控制及原样片手势；提问与审批的体验确认来自用户反馈，主线、宿主安装、跨平台原生与长期资源仍分别验收。

各次固定验证及其源码摘要见[证据索引](../../../evidence/2026-10-28-little-deep/README.md)。旧眼型对照与迭代过程见[历史归档](../../../archive/2026-10-28-little-deep/README.md)，不作为待选任务。

## 原生网页嵌入

```html
<script type="module">
  import {registerCharacter} from '../vendor/livelings/workspace/livelings.js';
  import littleDeep from './character.js';
  registerCharacter(littleDeep);
</script>
<live-ling character="little-deep-v3" state="idle" style="width:240px;height:240px"></live-ling>
```

这是网页嵌入示例，不是 Coopanion API 2 角色包。需要主体验的无抛掷、无毛绒和演示交接时，保留 `app.js` 的适配。
