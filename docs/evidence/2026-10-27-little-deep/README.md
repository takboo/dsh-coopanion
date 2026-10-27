# 小湛原型固定观察与整理证据

这些文件保存 2026-10-27 的独立浏览器原型观察。当前任务和美术状态从[设计入口](../../design/README.md)读取，不从截图、旧报告或测试数量推定用户接受。

| 文件 | 来源与边界 |
| --- | --- |
| `whale-tail-thinking.png` | 第一轮临时工作区的尾巴截图，没有固定源码身份；只作历史视觉参考 |
| `whale-livelings-review.json` 与对应 PNG | 第二轮固定提交 `25b8523`，源码文件摘要、浏览器观察和截图身份以原报告为准 |
| `little-deep-v3-review.json` 与对应 PNG | 第三轮固定提交 `179594b`；记录独立浏览器、动作工作台、直接互动与完整演示观察 |
| `original-files.json` | 上述五份原始文件迁入仓库时的 SHA-256；文件保持原字节 |
| `cleanup-verification.json` | 本次目录与来源整理后的资源、链接、源码范围和浏览器加载核验；绑定实际源码提交 |

原报告通过 CUA 使用 Codex 内置浏览器，未暴露浏览器引擎版本，不将 `package.json` 中的 Electron 版本冒充本次宿主身份。引擎分发 ZIP 摘要与原文件清单保留在[上游来源](../../design/art-workflow/vendor/livelings/upstream/source.json)。

没有正式插件包、Harness 会话、NPC／原生窗口、物理设备、长期资源或发布验收；声音的听感未评价。整理只更新资源路径和入口，不改写旧报告中的路径、提交和观察结论。
