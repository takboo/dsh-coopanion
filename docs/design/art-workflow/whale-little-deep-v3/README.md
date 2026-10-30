# 小湛原型模块与检查

当前任务、用户确认范围和下一步统一见[设计入口](../../README.md)。本目录是代码表演原型；已通过的工作／请求控制器由[实验性 API 2 包](../../../../examples/little-deep/README.md)复用，当前完成庆祝尚未进入实机包。

## 当前模块

| 范围 | 入口与边界 |
| --- | --- |
| 完成主线与分镜 | [completion-study.html](completion-study.html)、[分镜 v2](../../storyboards/little-deep-completion-v2.md)；16 秒、五条打断路线、300／150 px 切换，主线承接待复看 |
| 已确认的独立效果 | [reference-celebration-study.html](reference-celebration-study.html)、[分镜](../../storyboards/little-deep-reference-celebration-v0.md)；水色、虹光造型与出退节奏通过 |
| 共用庆祝编排 | [reference-celebration.js](reference-celebration.js) 的 createReferenceScore 只控制调用方当前 Actor；独立页和完成主线共用 |
| 完成消费与取消 | [completion-performance.js](completion-performance.js) 消费明确分类和完整目标身份；[completion-film.js](completion-film.js) 提供模拟 cue |
| 工作／生活段落 | [segment-performance.js](segment-performance.js)；实机及完成样片选 readable，工具段保持完整身体；早期集中段样片只作视觉参考 |
| 请求与笔画 | [request-performance.js](request-performance.js)、[storyboard-performance.js](storyboard-performance.js)、[storyboard-symbol.js](storyboard-symbol.js)；已确认身体与完整身份交接 |
| 生活交互候选 | [life-touch-study.html](life-touch-study.html)、[分镜](../../storyboards/little-deep-life-touch-v0.md)；独立交互样片待单独反馈 |
| 角色与来源 | [character.js](character.js)、[harness-tail.js](harness-tail.js)、[来源记录](reference/bloop-20261030-source.json)；原造型与固定引擎保留 |

本地启动命令见[本地预览与追溯](../../README.md#本地预览与追溯)。配色和尺寸切换保留当前进度；隐藏冻结表演，减少动态遵循 calm。页面按钮只操作模拟事实，不提交真实提问或审批。

## 按改动验证

完成主线及已确认效果使用 `node --test tests/little-deep-completion.mjs tests/little-deep-reference-celebration.mjs tests/little-deep-work-life.mjs`。浏览器分别运行 `tests/little-deep-completion-ui.mjs`、`tests/little-deep-reference-celebration-ui.mjs`，设置已核对的 CHROMIUM_PATH、新的 DSH_TEST_ARTIFACTS，并复用同源静态服务。

请求控制器的改动另跑 `node --test tests/little-deep-storyboard.mjs tests/little-deep-requests.mjs tests/little-deep-approval.mjs`；角色形体／素材改动另跑 `node --test tests/little-deep-tail.mjs tests/little-deep-performance.mjs`；生活交互候选使用 `tests/little-deep-life-touch.mjs`。产品接入和原生验证从[开发指南](../../../development.md)选择对应检查，浏览器通过不代替实机或用户观感。

## 历史与素材能力

被取代的水柱、静帧、六滴慢喷水及旧模块长版见[评审归档](../../../archive/2026-10-30-spray-completion-review/README.md)。旧完成机制、会话结构回放及观察器从[基线与历史验证索引](../../runtime-baseline.md)显式进入，不作为默认回归路线。

[原动作页](index.html)与 [app.js](app.js)展示素材能力；其“完整体验”、直接手势、done 和藏尾动作不代表当前产品工作流。产品拖放／投掷、宿主 step 时钟和真实状态以 API 2 包及共享宿主契约为准。更完整的生活交互、隐身、异常／停止分别评审。

官方尾巴及 logo 来源见 [Harness 来源](reference/harness/source.json)、[logo 记录](reference/deepseek-logo-20261028-source.json)。[Livelings 上游原文与许可](../vendor/livelings/README.md)保持原字节，按需显式读取。眼型与早期造型从[历史索引](../../../archive/README.md)追溯。
