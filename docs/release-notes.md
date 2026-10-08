小鲸的第一个可安装版本：DeepSeek Harness 的桌面伙伴插件。

- 原创蓝色小鲸，透明置顶、空白区域鼠标穿透、拖动、点击互动、休息和走动开关。
- 订阅 Harness 的任务、工具、回复和审批事件；任务完成、失败和等待确认时提醒用户。
- 在桌宠中选择已打开的会话发送消息，模型回复显示在气泡里；使用 Harness 已配置的模型。
- 独立 Electron 桌宠进程，卸载插件时关闭；无需修改 Harness 源码。

下载 `dsh-coopanion-0.1.0.tgz` 后，在 Harness 插件页安装该文件的绝对路径。安装后重新打开 Harness；首次启用时会从 Electron 官方发行源下载并校验桌宠运行时，需要联网。详细操作见仓库 README。

适配接口：DeepSeek Harness 0.2.1-alpha.1。自动化测试在 Linux 的 Chromium / Xvfb / Electron 上执行；macOS、Windows 的实机置顶、托盘和系统通知仍需验证。系统通知的显示还受操作系统通知设置影响。
