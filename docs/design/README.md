# 小湛当前设计与接手

更新于 2026-10-28。当前工作在 `codex/little-deep-livelings`：独立浏览器角色原型，尚未接入 Harness、API 2、NPC 或原生窗口。产品契约仍描述现有大肥鱼插件。`codex/aliveness-foundation` 是另一条生活感路线，未合并到本分支。

## 从这里继续

当前停在藏尾巴表演的体验调整：用户认为尾柄旁额外长出的小头很奇怪，已撤掉。现在用原本鲸鱼的头、白腹和眼睛位置，在较小、收鳍的姿态中试探，再舒展开；思考中回应后回去想。**这版修改尚未得到用户体验确认。**

下一次先体验并收敛这段表演的造型和节奏，再做持续抚摸与松手余韵。后者尚未实现；现有 `pet-soft` 仍是一次性的舒服眯眼。不要把自动化通过或用户选定眼型解释为整套动作、美术或产品验收。

## 已确定的设计约束

- 保留小湛主体、蓝色、白腹、额顶缺口，眼型采用用户看过动态后选定的 **B 大小眼**；原生眨眼与表情继续保留。
- C 的弯弯白斑不是本轮选定的眼睛方向，A／C 仅作历史对照。额外腹鳍和尾柄旁新增头部均不加回。
- 完整鲸鱼与纯尾巴使用同一套实心尾鳍轮廓，不能中空。尾柄采用短弯连接，尾鳍参考官方 `FishLogo.tsx`；比例自然与否仍需实际观察。
- 思考尾巴保留用户 GIF 要求的明显左右扫摆、展开和侧转收窄，不收回到轻微晃动。
- 交互顺序为眼睛选择 → 藏尾巴表演 → 抚摸余韵。其他 AI 角色、Blender、全方向制作与正式产品接入未开始。

## 本地预览

在仓库根目录运行：

```bash
python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow
```

打开 `http://127.0.0.1:4187/whale-little-deep-v3/`。先点“藏进尾巴”看整段，再选“想事情”并轻戳尾巴，体验回应后继续思考。手动切状态可打断，页面隐藏时不补播。服务是否仍运行以现场检查为准；预览结束后在启动终端按 Ctrl-C。

## 文件与验证入口

| 需要做什么 | 入口 |
| --- | --- |
| 查看动作、手势、运行限制 | [原型说明](art-workflow/whale-little-deep-v3/README.md) |
| 调整造型、表情和动作时序 | [character.js](art-workflow/whale-little-deep-v3/character.js) |
| 调整共用尾鳍、短弯尾柄与思考摆动 | [harness-tail.js](art-workflow/whale-little-deep-v3/harness-tail.js) |
| 调整手势、演示和状态交接 | [app.js](art-workflow/whale-little-deep-v3/app.js) |
| 检查尾巴轮廓与动作交接 | [轮廓测试](../../tests/little-deep-tail.mjs)、[表演测试](../../tests/little-deep-performance.mjs) |
| 查上游运行时与工作台 | [Livelings 来源入口](art-workflow/vendor/livelings/README.md)；第三方原文按需读取 |
| 查官方参考、源码与许可 | [Harness 来源](art-workflow/whale-little-deep-v3/reference/harness/source.json)、[第三方声明](../../THIRD_PARTY_NOTICES.md) |
| 追溯旧候选与本轮决定 | [历史归档](../archive/README.md) |
| 核对每次固定验证的源码身份 | [10 月 28 日证据索引](../evidence/2026-10-28-little-deep/README.md) |

```bash
node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs
```

这些检查覆盖引擎实际平滑后的尾鳍轮廓、摆尾长度保持、分段准备、重复触碰、状态交接、打断及减少动态的节点模拟。浏览器系统偏好、长期鲜活感、物理设备和用户审美分别验证。原生十六格工作台沿用上游布局，窄侧栏部分摆尾帧可能裁边，判断完整轮廓以主体验和小尺寸页为主。

若以后范围转为产品接入，再读取 [API 2 角色契约](../characters.md)和对应产品测试。旧讨论与旧证据不安排当前任务。
