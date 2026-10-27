# Livelings 原始工作区与来源

此目录仅保留作者分发的运行时、工作台、示例与参考原文。当前角色和续做状态从[设计入口](../../../README.md)进入。

- `workspace/`：从作者 skill ZIP 复制的八个原始文件；源码字节按 [source.json](upstream/source.json)核对。当前小湛使用其中的引擎和 studio，未修改第三方代码。
- `SKILL.md`、`reference/` 和 `templates/`：作者 skill 的原目录结构与字节；摘要见 [skill-files.json](upstream/skill-files.json)。
- `upstream/`：许可与下载来源。代码许可见 [MIT](upstream/LICENSE)，附带角色及示例条款见[角色许可](upstream/LICENSE-CHARACTERS.md)。署名 Livelings by MakerJackie。

需要查角色 API 时读取 [api.md](reference/api.md)；需要按作者 skill 设计新角色时再读取 [SKILL.md](SKILL.md)和 [design.md](reference/design.md)。这些原文描述上游能力和工作流，不是本项目当前阶段或已验收结果。

普通搜索屏蔽本目录，显式检索使用 `rg --no-ignore docs/design/art-workflow/vendor/livelings`。`source.json` 中的 workspace 路径相对本目录的 `workspace/`；记录的仓库提交仅作上下文，不代表 ZIP 的可重复构建身份。
