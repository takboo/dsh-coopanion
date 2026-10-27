# 2026 年 10 月鲸鱼探索归档

当前方向见[设计入口](../../design/README.md)。本目录只解释前两轮方案和旧讨论；原型代码保存在固定 Git 历史中，不再作为工作区中的并行入口。

| 材料 | 固定来源 | 当时结果 |
| --- | --- | --- |
| 第一轮团团／游游／尾尾 | `25b8523` 的 `docs/design/art-workflow/whale-code-prototype-v1/` | 用户认可互动思路，认为造型不讨喜 |
| 第二轮小湛／奶泡／墨鲸 | `25b8523` 的 `docs/design/art-workflow/whale-livelings-prototype-v2/` | 用户选取小湛颜色、奶泡藏尾巴与墨鲸眨眼 |
| 第三轮整理前源码 | `179594b` 的 `docs/design/art-workflow/whale-little-deep-v3/` | 已制作完整独立体验，继续沿此方向；不代表最终美术验收 |

例如读取旧源码可用 `git show 25b8523:docs/design/art-workflow/whale-code-prototype-v1/index.html`。需要完整复现时使用该固定提交的隔离 checkout，避免把历史文件覆盖回当前工作区。

## 原始快照与路径

`snapshots/` 保留整理前白板和前两轮 README 原字节。里面的相对链接、localhost 地址、分支名和“待选”叙述属于原提交，不是当前可用入口或待执行指令。当前共用引擎已独立到 `docs/design/art-workflow/vendor/livelings/`，原字节与来源许可保留。

[manifest.json](manifest.json)记录退休文件的原路径、固定提交和 SHA-256，以及未跟踪的旧生活感工作台生成文件的处理。该生成文件原本已被生活感分支忽略，当前移到本机忽略缓存 `.cache/doc-cleanup-20261027/`，不混入本分支源码。

原始截图与浏览器观察迁入[证据目录](../../evidence/2026-10-27-little-deep/README.md)，不把历史报告改写为整理后版本验证。
