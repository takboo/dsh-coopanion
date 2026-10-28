# 小湛浏览器互动原型

当前分支、已选方案、最新用户反馈与下一步统一见[设计入口](../../README.md)。本目录是独立的纯代码角色体验，未接入 Harness、API 2、NPC 或原生窗口。

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
| 持续 | waiting | 安静看向用户，减少动作 |
| 持续 | blocked | 收尾、担忧神态，等用户帮助 |
| 持续 | listening | 柔和视线，轻微点头 |
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
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs
```

测试检查真实引擎的轮廓平滑、刚性尾鳍、分段准备、五官显现、重复触碰、上下文恢复、多阶段打断和减少动态模拟。另用浏览器观察主体验与动作工作台；这些检查不代表用户认可、宿主安装、跨平台原生或长期资源验收。

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
