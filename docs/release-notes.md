修复小鲸插件在 DeepSeek Harness **0.2.0-rc.2** 中安装时被拒绝的问题，同时支持 **0.2.1-alpha.1**。

- SDK peer 依赖明确覆盖这两个经过验证的宿主版本；不需要开启版本豁免。
- 以 rc.2 的已发布 SDK 执行类型检查和插件测试。
- CI 增加两个已发布 DSH 宿主的真实安装矩阵，验证 `.tgz` 安装、bundle 激活、profile loader、Electron 窗口、会话事件通知和正常关闭。安装矩阵通过后才能发布。
- 保留桌宠互动、拖动、会话聊天和任务通知功能。

下载 `dsh-coopanion-0.1.1.tgz` 后，在 Harness 插件页安装该文件的绝对路径。此前安装失败的用户直接安装修正版；如果已经装有旧版，先卸载旧版再安装。安装后重新打开 Harness；首次启用时会从 Electron 官方发行源下载并校验桌宠运行时，需要联网。详细操作见仓库 README。

自动化验证在 Linux 的已发布 DSH CLI / profile loader、Chromium、Xvfb 和 Electron 上执行，使用实际会话服务的测试事件，不调用模型 API。macOS、Windows 的桌面安装页、实机窗口、系统通知和真实模型聊天仍需验证。
