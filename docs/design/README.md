# 小湛当前设计与接手

更新于 2026-10-28。当前分支为 `codex/little-deep-livelings`，是基于 main 的独立浏览器角色原型；尚未接入 Harness、API 2、NPC 或原生窗口。产品契约描述现有大肥鱼插件。另一条 `codex/aliveness-foundation` 生活感路线未合并。

## 当前方案与下一步

采用 **STORYBOARD 分镜优先**，制作过程同时形成可复用的角色工作流。接手先读[制作流程](character-production-workflow.md)，再读[当前工作分镜](storyboards/little-deep-work-v0.md)。

当前是约 **1.5 秒的“疑问浮现”出场**：稍微一怔，收势与神态变化同时开始；侧倾时左侧头前逐笔画出问号，再放松进入持续等待。保留无底牌笔画、弯钩后落点和自身轻颤。**本段不以“看向我／与用户对视”为验收目标。**

用户认为前版睁眼更像“产生一个疑问”，且整体过长，已同意按短版先做一轮。当前实现已完成，**短版尚未得到用户体验确认**。下一次先体验短版的可读性、描画速度和余韵，再决定是否调整；之后补真实结算退场与交互接管，再复做审批场景。复杂空闲生活与持续抚摸后续再做。

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

当前样片：`http://127.0.0.1:4187/whale-little-deep-v3/storyboard.html#preview`。支持重播、暂停、进度定位及配色／符号对照。页面隐藏暂停推进，恢复后不补播。

原互动原型位于同目录的 `index.html`，用于藏尾、触碰和拉伸等分镜外体验；不是当前工作事件接入。服务状态以现场检查为准，结束后在启动终端按 Ctrl-C。

## 文件入口

| 任务 | 入口 |
| --- | --- |
| 复用制作步骤和分镜格式 | [角色产出工作流](character-production-workflow.md) |
| 当前意图、时序、能力与待评审项 | [工作分镜](storyboards/little-deep-work-v0.md) |
| 连续表演控制与样片查看 | [storyboard-performance.js](art-workflow/whale-little-deep-v3/storyboard-performance.js)、[storyboard.js](art-workflow/whale-little-deep-v3/storyboard.js) |
| 角色、尾巴和分镜外交互 | [原型说明](art-workflow/whale-little-deep-v3/README.md)、[character.js](art-workflow/whale-little-deep-v3/character.js)、[harness-tail.js](art-workflow/whale-little-deep-v3/harness-tail.js)、[app.js](art-workflow/whale-little-deep-v3/app.js) |
| 上游接口与来源 | [Livelings 来源入口](art-workflow/vendor/livelings/README.md)、[Harness 来源](art-workflow/whale-little-deep-v3/reference/harness/source.json) |

```bash
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs tests/little-deep-storyboard.mjs
```

检查覆盖实际引擎的尾鳍轮廓、藏尾交接、重复触碰、短版表演连续、进度还原与减少动态机制。浏览器系统偏好、用户审美、长期体验、物理设备及产品宿主分别验证。测试通过不代表用户已认可动画或正式接入完成。
