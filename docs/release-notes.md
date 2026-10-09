新增 **DeepSeek 大肥鱼角色包**，使用 Coopanion 的 DeepSeek 原配色拆件贴图，适配本项目独立实现的动画引擎。

- Release 附带 `deepseek-whale.dshpet`：31 个图层、全部 10 个 Harness 动作，支持眨眼、摆尾、呆毛 / 鲸鳍摆动、挥手、走路、坐姿睡眠和任务表情。
- 素材保留 Pal-AI-Lab、溟月（上善无形）、ZipZipPipe 的署名和上游权利声明。应用及新写的适配代码保持 MIT，素材不因此被重新授权。
- 动画使用本项目新编写的关键帧，未移植 Coopanion 的 JavaScript、模型、网格变形或物理模拟；动作细节与原版有差异，只包含 DeepSeek 原配色。
- 保留桌宠互动、会话聊天及任务通知，支持 DSH **0.2.0-rc.2 / 0.2.1-alpha.1**。

已有插件 v0.2.0 时可以直接导入角色包。右键桌宠 → **角色与动画** → **导入角色包**，选择 `deepseek-whale.dshpet`，预览后点击 **使用角色**。

首次安装插件时下载 `dsh-coopanion-0.2.1.tgz`，在 Harness 插件页安装并重启。首次运行仍需从官方源下载并校验 Electron。

类型检查、单元测试、浏览器画布与交互测试、真实 Electron 导入和重启保存测试，以及两个已发布 DSH 宿主的安装与角色加载矩阵，通过后才发布。Linux 云端验证不调用模型 API；Windows/macOS 实机界面、系统通知和真实模型对话仍需验收。

角色来源、权利声明、适配范围及重建方式见 [大肥鱼角色包说明](https://github.com/takboo/dsh-coopanion/blob/main/characters/deepseek-whale/README.md)。通用格式见 [角色包规范](https://github.com/takboo/dsh-coopanion/blob/main/docs/characters.md)。
