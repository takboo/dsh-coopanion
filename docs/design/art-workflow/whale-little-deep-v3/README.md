# 小湛原型模块与检查

当前观看入口、已通过范围和下一步统一见[设计入口](../../README.md)，具体表演见[工作／生活分镜](../../storyboards/little-deep-work-life-v0.md)。本目录为独立纯代码浏览器原型。

## 模块与页面

| 范围 | 文件与入口 |
| --- | --- |
| 当前工作／生活段落 | [segment-performance.js](segment-performance.js) 编排持续段和请求续点；[work-life-performance.js](work-life-performance.js) 提供模拟 cue；[work-life-study.html](work-life-study.html) 为连续对照 |
| 已确认的请求 | [request-performance.js](request-performance.js) 处理完整身份与交接；[storyboard-performance.js](storyboard-performance.js) 处理身体时序；[storyboard-symbol.js](storyboard-symbol.js) 绘笔画 |
| 请求局部复查 | [出场](storyboard.html#preview)、[提问交接](request-study.html)、[审批交接](approval-study.html)，后两页共用手势脚本与样式 |
| 会话机制对照 | [会话观察说明](../../session-observation.md) 说明固定结构回放、进行中只读观察及旧固定分镜；这些页未采用当前段落策略 |
| 造型与动作素材 | [character.js](character.js)、[harness-tail.js](harness-tail.js)；[原动作页](index.html) 与 [app.js](app.js) 供能力查阅；[小尺寸对照](size-sheet.html) 供轮廓比较 |

运行命令集中在[本地预览](../../README.md#本地预览)。切换配色和尺寸保留 Actor；原动作页的“完整体验”仅遍历素材库，不等于完整工作流程。声音默认关闭，手动开启后使用低音量合成音。系统减少动态偏好交给引擎 calm。

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

这是旧动作素材，未被当前工作／生活样片的整体确认覆盖；生活交互与藏身需按新分镜验证。

## 直接互动与交接

- 靠近驱动视线。轻戳吐泡泡，连续两次双眨，三次藏尾巴；藏着时优先试探回应。按下睡眠中的角色会唤醒。
- 按住约 420 毫秒触发原生 purr，经角色适配为一次性舒服眯眼；藏着时改为试探回应。没有原生毛绒 `petting` 效果。按钮提供相同动作，便于触屏与键盘。
- 拉动只拉伸当前轮廓，松手无抛掷，恢复原持续状态；不代表产品位置拖放。取消指针不算轻戳。
- 手动切状态取消按住／拉伸和演示，不重置弹簧位置。一次动作结束回原持续状态，完成／出错则回待机。

主体验的 `interactive:false` 关闭引擎默认手势，由 `app.js` 适配鲸鱼手势。直接嵌入原生组件时，其默认手势包含抛掷与按住毛绒效果，不能推断与主体验相同。

## 轮廓与来源

`whaleBody()` 的身体与 `harness-tail.js` 共用 48 个尾巴轮廓点，身体另分配采样点，避免重采样磨圆尾鳍。完整鲸鱼只弯尾柄，尾鳍整体旋转；思考时的侧转收窄属于有意动作。静止轮廓或测试对齐不代表用户已认可比例与连接。

官方卷起双叶来自固定提交的 `FishLogo.tsx`，配本地短弯尾柄。`RunningWhaleTail.tsx` 和 APNG 仅作动作参考；当前矢量运动是本地适配，并非 GIF 逐帧复刻。[源码、MIT 与来源摘要](reference/harness/source.json)、[官方 logo 参考](reference/deepseek-logo-20261028-source.json)和[早期用户参考](reference/source.json)保留。参考图不由运行页加载。

引擎与工作台保留 [Livelings 原始字节与许可](../vendor/livelings/README.md)，页面署名 Livelings by MakerJackie；不修改第三方源码。默认眨眼与偶发双眨沿用原生机制。

## 检查

在仓库根目录执行：

```bash
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs tests/little-deep-storyboard.mjs tests/little-deep-requests.mjs tests/little-deep-approval.mjs tests/little-deep-mainline.mjs tests/little-deep-replay.mjs tests/little-deep-completion.mjs tests/little-deep-work-rhythm.mjs tests/little-deep-work-life.mjs
node --experimental-transform-types --test tests/little-deep-live.mjs
```

检查覆盖真实引擎轮廓、请求身份与手势、旧机制回放、双时钟、当前段落续点／相位、最新意图和生活退让。浏览器画面、用户体验、系统偏好实机及产品宿主各自验证；用户确认范围统一从设计入口读取。

旧版固定证据见[证据索引](../../../evidence/2026-10-28-little-deep/README.md)；工作主线过程稿与当前本机验证位置见[本轮归档](../../../archive/2026-10-29-work-mainline/README.md)；眼型及早期造型见[历史索引](../../../archive/README.md)。原始证据和许可按来源保留字节。

## 网页嵌入

```html
<script type="module">
  import {registerCharacter} from '../vendor/livelings/workspace/livelings.js';
  import littleDeep from './character.js';
  registerCharacter(littleDeep);
</script>
<live-ling character="little-deep-v3" state="idle" style="width:240px;height:240px"></live-ling>
```

这是网页嵌入示例，不是 Coopanion API 2 角色包。需要主体验的无抛掷、无毛绒和演示交接时，保留 `app.js` 的适配。
