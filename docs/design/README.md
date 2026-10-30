# 小湛当前设计与接手

更新于 2026-10-30。当前分支 `codex/little-deep-api2`；产品契约从 [docs 索引](../README.md)读取。这里是唯一当前设计入口，历史记录里的“当前／下一步”不作为执行指令。

## 当前任务：目标完成分支

**[打开回复结束／目标完成连续样片](art-workflow/whale-little-deep-v3/completion-study.html)**，配套[分镜 v1](storyboards/little-deep-completion-v1.md)。同机位双画面对照普通回复结束与真正目标完成，可插入新工作、?、!，并选择喷水前、庆祝中、收尾时打断。

本轮是独立浏览器候选。用户反馈初版水花不够显著，当前已参考 Livelings Celebrate 改为喷柱顶起、扇形展开及两侧落散，待复看；没有更新实机插件或角色包。重点看区分是否清楚、庆祝是否适度、打断及退出是否自然。观看后再决定角色包接入。

## 已通过的实机基线

插件为 rebase 后的 **0.4.15**，角色为 **0.0.2**，宿主 DSH Desktop 0.2.1-rc.3。用户已反馈工作流程测试通过。版本与产物摘要、已确认范围和旧验证入口统一见[基线与验证索引](runtime-baseline.md)。

- 初次集中工作潜入；工具执行／复核保持完整专注身体，以视线、前倾、划鳍区分，避免频繁潜浮。不用沉默秒数判断长考。
- 表演来源可跟随新工作的 session，聊天发送目标保持独立。
- ?、! 的出场、结算退场及工作续接已通过；拖拽释放使用全角色共享语义。
- 生活保持完整鲸鱼的舒展、探看与休息。更完整的生活抚摸、藏身／隐身及异常／停止仍需各自分镜和确认。

[早期工作／生活样片](art-workflow/whale-little-deep-v3/work-life-study.html)保留已确认的视觉方向；其工具段一直留尾巴，属于旧映射，不能覆盖实机 0.0.2。新的完成样片采用 readable 工作段，与当前工具段保持一致。

## 场景状态

| 范围 | 当前状态 |
| --- | --- |
| 工作主线与 ?／! | 0.4.15 + 0.0.2 实机工作流程通过；[工作反馈分镜](storyboards/little-deep-api2-feedback-v1.md)记录当前工具身体 |
| 目标完成 | [v1 分镜](storyboards/little-deep-completion-v1.md)与连续样片，当前待观看候选 |
| 生活交互 | [生活分镜](storyboards/little-deep-life-touch-v0.md)与[样片](art-workflow/whale-little-deep-v3/life-touch-study.html)已制作，待单独反馈 |
| 异常／停止、藏身／隐身 | 待分镜；素材库已有动作不代表新场景通过 |
| 角色 UI 皮肤、其他交互细节 | 实现与机制验证已有记录，不把工作流程测试扩大为全部审美验收 |
| NPC 自主策略 | 本轮未接入；生活表演不自动启用日常调度 |

## 固定造型与制作流程

蓝色、白腹、额顶缺口、B 大小眼与原生眨眼保留；完整鲸鱼和思考尾巴共用实心尾鳍及短弯尾柄。侧倾作用于整只鲸鱼，没有独立头关节或全方向造型。额外腹鳍、尾柄旁新增小头及弯弯白斑眼型已舍弃。

按[角色产出工作流](character-production-workflow.md)执行：能力核对 → 分镜及同源关键帧 → 连续样片 → 用户反馈 → 产品接入。普通回复与真正目标完成由共享判断区分；符号、触碰或动画均不能结算真实请求。

| 当前实现 | 入口 |
| --- | --- |
| 工作／生活段落 | [segment-performance.js](art-workflow/whale-little-deep-v3/segment-performance.js)；实机使用 readable 策略 |
| 喷水表现 | [completion-spout.js](art-workflow/whale-little-deep-v3/completion-spout.js)，局部喷柱与可取消扇形水花 |
| 完成消费、收势与取消 | [completion-performance.js](art-workflow/whale-little-deep-v3/completion-performance.js) |
| 完成样片与同源关键帧 | [completion-film.js](art-workflow/whale-little-deep-v3/completion-film.js)、[completion-study.js](art-workflow/whale-little-deep-v3/completion-study.js) |
| 请求身体、完整身份与笔画 | [request-performance.js](art-workflow/whale-little-deep-v3/request-performance.js)、[storyboard-performance.js](art-workflow/whale-little-deep-v3/storyboard-performance.js)、[storyboard-symbol.js](art-workflow/whale-little-deep-v3/storyboard-symbol.js) |
| API 2、能力、来源和检查 | [角色包说明](../../examples/little-deep/README.md)、[原型模块说明](art-workflow/whale-little-deep-v3/README.md) |

## 本地预览与追溯

仓库根目录运行 `python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow`，已有同源服务时复用。当前页为 `http://127.0.0.1:4187/whale-little-deep-v3/completion-study.html`。

[本轮整理与验证](workspace-maintenance.md)说明生成物、证据、备份和环境的处理；历史方案从[归档索引](../archive/README.md)显式进入。旧验证摘要保留原路径并屏蔽普通搜索，以保持历史相对链接与原字节；只由[验证索引](runtime-baseline.md)读取。固定报告、原始证据及第三方许可不改写。
