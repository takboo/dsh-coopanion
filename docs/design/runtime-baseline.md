# 小湛实机基线与验证索引

2026-10-30。当前任务见[设计入口](README.md)。本页区分已安装事实、用户体验与历史验证，不替代 package.json 的源码版本。

## 已确认的固定实机基线

| 项目 | 固定身份 |
| --- | --- |
| 插件 | 0.4.15 rebase 开发版；打包源码 ec91d1966b4b76181752f721bb01a8c1743fa354 |
| 插件 tgz SHA-256 | df7b1405b1a6acbaea0a583d511f33edd332fc448d61c7380e317786b8383064 |
| productDigest | e47a688fba3b1ac04d7a9bd7bc980cddca684ab65bc5e8c12fc37a86f4699f8a |
| 角色 | Little Deep Experimental 0.0.2，原 ZIP 未改 |
| 角色 ZIP SHA-256 | 472e0b31f8d778ff4acfb76074d40d8c002cb54074a78f65280890b17a5bd61f |
| 实机宿主 | DSH Desktop 0.2.1-rc.3 |
| 用户确认 | 重新安装后用户反馈“测试通过”，限本轮工作流程；未提供新的 session ID，不补造新日志验证 |

本轮目标完成只是独立浏览器候选，尚未进入上述实机包。原包没有目标完成庆祝、完整生活抚摸分镜或隐身。当前 UI／交互候选的体验范围分别确认。

本机安装固定资料为 artifacts/little-deep-rebase-install-20261030-gckze668/，用户后续确认在 artifacts/little-deep-rebase-acceptance-20261030-9l51svt5/。这些忽略目录不保证在其他 checkout 存在；固定 TGZ 路径是实际 Desktop profile 的 file 依赖，不能移动或删除。

## 历史证据入口

下列日期性记录在原路径保留原字节及相对链接，普通搜索屏蔽；其中的旧“当前／下一步／待测试”按当时包和日期解释。当前状态只从本页和设计入口读取。

| 记录 | 适用范围 |
| --- | --- |
| [首次 API 2 接入](little-deep-api2-validation.md) | 早期包、实际模型与 VM 的首轮机制，不覆盖后续反馈修复 |
| [0.0.2 交互反馈修复](little-deep-feedback-validation.md) | 共享投掷、身体交互、方向与 UI 候选；其中工具映射已更新 |
| [新会话状态来源、rebase 与安装](little-deep-session-source-validation.md) | 旧聊天／表演来源分离及当前固定包的完整来路 |
| [指定真实 session 体验](little-deep-real-session-acceptance.md) | session-65a3… 的两次问答与 allowed-once 审批；属于 rebase 前固定包 |
| [旧会话观察工具](session-observation.md) | 历史结构／双时钟观察，用旧表面动作，不承担新样片或实机接入 |

历史原始证据与许可分别按[证据说明](../evidence/README.md)和[归档索引](../archive/README.md)进入。测试、安装成功、用户体验及正式发布互不代替。开发分支同步以实际 Git 远程记录为准，npm／Release 发布单独核验。
