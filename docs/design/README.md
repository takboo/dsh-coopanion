# 小湛当前设计与接手

更新于 2026-10-30，分支 `codex/little-deep-api2`。本页维护当前任务与用户确认范围；产品契约从 [docs 索引](../README.md)读取，历史快照里的“当前／下一步”按当时版本解释。

## 当前任务：目标完成主线待复看

**[当前观看：回复结束／目标完成连续对照](art-workflow/whale-little-deep-v3/completion-study.html)**，配套[分镜 v2](storyboards/little-deep-completion-v2.md)。提交 `0559885` 将已通过的喷水与虹光接回 16 秒主线：普通回复轻收势，真正完成才跃起喷水；提供 300／150 px 大小切换与五条新工作、?、! 打断路线。

30 项机制、7 组浏览器检查通过；抽取前后 634 个采样确认独立效果的身体、水滴与虹光数值一致。**当前待用户复看主线区分、打断和续接**，尚未接入宿主或更新实机包。完成来源在宿主空闲时的切换仍是产品接入需要核对的边界，见分镜 v2。

## 已确认范围

| 范围 | 确认与边界 |
| --- | --- |
| 工作主线与 ?／! | rebase 后插件 0.4.15 + Little Deep 0.0.2，宿主 DSH Desktop 0.2.1-rc.3，用户反馈工作流程测试通过；固定包与证据见[实机基线](runtime-baseline.md) |
| 工作身体 | 集中开场潜水；工具／复核保持完整的专注身体，以眼神、前倾和划鳍区分；不按沉默秒数判断长考，不为每次工具往返潜浮。见[工作反馈分镜](storyboards/little-deep-api2-feedback-v1.md) |
| 独立喷水与庆祝 | 用户对 `3c2f1ad` 的[独立样片](art-workflow/whale-little-deep-v3/reference-celebration-study.html)反馈“这版效果可以了”；水色、虹光造型与出退节奏通过，见[效果分镜](storyboards/little-deep-reference-celebration-v0.md) |
| 工作／生活视觉方向 | 工作有明确任务与专注姿态；生活保持完整鲸鱼，舒展、探看和休息。早期工作／生活样片的工具段一直留尾巴，属于旧映射，不能覆盖当前 readable 策略 |
| 拖拽与请求 | 实机工作流程包括请求结算后的续接；拖拽释放采用全角色共享语义。其他交互／皮肤细节不由工作流程测试一并结算 |

独立效果采用用户选择的 Bloop 动作参考：弹性细喷流、自由水滴、跃起翻回与回落水花，保留小湛造型。水为灰蓝边缘、偏白水芯；虹光由喷发带出，落散后淡退，末端透明收散。旧六滴布局、固定停留和水柱参数已被取代，历史过程从[评审归档](../archive/2026-10-30-spray-completion-review/README.md)读取。

## 待评审与后续范围

| 范围 | 状态 |
| --- | --- |
| 目标完成主线 | v2 分镜与连续样片已实现，等待本轮主线承接反馈；共享完成判断和真实来源送达在产品接入时验证 |
| 生活交互 | [分镜](storyboards/little-deep-life-touch-v0.md)及[样片](art-workflow/whale-little-deep-v3/life-touch-study.html)已制作，待单独反馈 |
| 异常／停止、藏身／隐身 | 待分镜；素材库已有动作不代表对应场景通过 |
| 角色 UI 皮肤及其他交互 | 已有实现与机制记录，审美和操作反馈分别确认 |
| NPC 自主策略 | 本轮表演未接入；生活表演不自动启用日常调度 |

## 固定造型与制作流程

保留蓝色、白腹、额顶缺口、B 大小眼和原生眨眼；完整鲸鱼与思考尾巴共用实心尾鳍、短弯尾柄。侧倾作用于整只鲸鱼，没有独立头关节或全方向造型。额外腹鳍、尾柄旁的小头和弯弯白斑眼型已舍弃。

按[角色产出工作流](character-production-workflow.md)执行：能力核对 → 同源分镜／关键帧 → 连续样片 → 用户反馈 → 产品接入。普通回复与真正目标完成由 [src/completion.ts](../../src/completion.ts) 共享判断；符号和动画不结算真实请求。源码与检查入口集中在[原型模块说明](art-workflow/whale-little-deep-v3/README.md)，角色构建与兼容边界见[API 2 包说明](../../examples/little-deep/README.md)。

## 本地预览与追溯

仓库根目录运行 `python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow`，已有同源服务时复用。当前主线地址为 `http://127.0.0.1:4187/whale-little-deep-v3/completion-study.html`；独立效果页作为已确认基准保留。

[本机资料与保留规则](workspace-maintenance.md)列出当前报告及不可误删的资料。历史方案从[归档索引](../archive/README.md)显式进入；日期性验证保持原路径与原字节，从[基线索引](runtime-baseline.md)读取。测试、视觉确认、安装、实机和正式发布分别记录。
