# 小湛当前设计与接手

更新于 2026-10-30。当前分支 `codex/little-deep-api2`；产品契约从 [docs 索引](../README.md)读取。这里是唯一当前设计入口，历史记录里的“当前／下一步”不作为执行指令。

## 当前任务：目标完成分支

**[当前观看：参考版喷水与完成庆祝](art-workflow/whale-little-deep-v3/reference-celebration-study.html)**，配套[分镜](storyboards/little-deep-reference-celebration-v0.md)。完成庆祝约 2.85 秒，单独喷水约 2.40 秒；正常与实际尺寸同步。

用户选择 Bloop 演示的喷水与庆祝作为主要表演参考，要求保留小湛原造型重新制作。当前采用弹性细喷流、自然升落的水滴、跃起与倾斜、彩虹和回落水花；不再以旧六滴位置与 0.6 秒停留约束动作。原 character.js、物理参数、尾鳍及方向保持，正常 300 px／实际 150 px 同步，单次结束不循环。当前等待观看反馈，尚未更新目标完成主线、实机插件或角色包。

最新反馈要求水色与蓝色身体协调，彩虹更大、更清楚，并体现“喷雾受光形成彩虹”的视觉关系。本轮改为灰蓝水缘、偏白水芯；彩虹由本地喷发触发，按参考的弹簧显隐，持续到水花散去后收尾。外半径约增 36%，保留清楚的光谱色并让末端透明收散。身体动作和水滴轨迹与上版相同，等待复看。

此前的[静帧](art-workflow/whale-little-deep-v3/spout-shape-study.html)与[慢喷水短片](art-workflow/whale-little-deep-v3/spout-motion-study.html)保留作已被本轮方向取代的历史对照。用户曾确认六滴静态轮廓，不能把这个旧确认扩大为当前动作约束或连续节奏通过。

此前的[回复结束／目标完成连续样片](art-workflow/whale-little-deep-v3/completion-study.html)及[分镜 v1](storyboards/little-deep-completion-v1.md)保留，用于追溯普通回复／真正完成与新工作、?、! 的打断机制，喷水造型已被本轮反馈要求复做。

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
| 目标完成 | 当前评审[参考版喷水与庆祝](storyboards/little-deep-reference-celebration-v0.md)；确认后再回完成主线 |
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
| 当前喷水与庆祝短片 | [reference-celebration.js](art-workflow/whale-little-deep-v3/reference-celebration.js) 编排压力喷流、自由水滴与整次庆祝；[查看页](art-workflow/whale-little-deep-v3/reference-celebration-study.html)提供同步尺寸 |
| 动作参考来源 | [Bloop 来源记录](art-workflow/whale-little-deep-v3/reference/bloop-20261030-source.json)，用户提供的原文与实际观看范围 |
| 上一版喷水 | [completion-spout.js](art-workflow/whale-little-deep-v3/completion-spout.js)，原样保留；柱身与节奏待按本轮静帧重做 |
| 完成消费、收势与取消 | [completion-performance.js](art-workflow/whale-little-deep-v3/completion-performance.js) |
| 完成样片与同源关键帧 | [completion-film.js](art-workflow/whale-little-deep-v3/completion-film.js)、[completion-study.js](art-workflow/whale-little-deep-v3/completion-study.js) |
| 请求身体、完整身份与笔画 | [request-performance.js](art-workflow/whale-little-deep-v3/request-performance.js)、[storyboard-performance.js](art-workflow/whale-little-deep-v3/storyboard-performance.js)、[storyboard-symbol.js](art-workflow/whale-little-deep-v3/storyboard-symbol.js) |
| API 2、能力、来源和检查 | [角色包说明](../../examples/little-deep/README.md)、[原型模块说明](art-workflow/whale-little-deep-v3/README.md) |

## 本地预览与追溯

仓库根目录运行 `python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow`，已有同源服务时复用。当前页为 `http://127.0.0.1:4187/whale-little-deep-v3/reference-celebration-study.html`。

[本轮整理与验证](workspace-maintenance.md)说明生成物、证据、备份和环境的处理；历史方案从[归档索引](../archive/README.md)显式进入。旧验证摘要保留原路径并屏蔽普通搜索，以保持历史相对链接与原字节；只由[验证索引](runtime-baseline.md)读取。固定报告、原始证据及第三方许可不改写。
