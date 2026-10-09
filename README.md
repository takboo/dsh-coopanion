# 小鲸 · dsh-coopanion

给 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) 加一只桌面小鲸鱼。它会陪你工作，在任务完成或需要确认时提醒你；双击小鲸，可以向已打开的 Harness 会话发送消息。

灵感来自 [Coopanion](https://github.com/Pal-AI-Lab/Coopanion)。本项目使用原创 SVG 图形和独立实现，没有复制 Coopanion 的代码或角色素材，沿用本仓库的 MIT 许可。

## 功能

- 透明、无边框、置顶桌宠；空白区域点击穿透。
- 点击互动、拖动移动、闲时走动、休息、显示 / 隐藏。
- 思考、工具工作、等待确认、完成和出错的表情与气泡。
- 完成、出错和审批提醒；支持系统通知和桌宠通知卡片。
- 会话选择与聊天；输入通过 `Agent.followup()` 进入 Harness 的持久会话，使用其模型、工具和现有权限。

审批提示会引导你回到 Harness，桌宠不代替宿主作出审批。小鲸不自动向模型发送点击、拖动等互动，也不单独收集 API Key。

## 安装到 Desktop

**v0.1.1 支持 DSH 0.2.0-rc.2 和 0.2.1-alpha.1**。v0.1.0 要求较新的 SDK，会被 0.2.0-rc.2 的安装检查拒绝；使用 rc.2 时请下载修正版。接口尚未稳定，其他版本未声明兼容。

1. 从 [Releases](https://github.com/takboo/dsh-coopanion/releases) 下载 `dsh-coopanion-0.1.1.tgz`，记下绝对路径。
2. 打开 Harness 的侧边栏 **插件** 页，安装该压缩包路径，并启用 `dsh-coopanion`。
3. 完全退出再重新打开 Harness。首次启用时，Electron 44 自动从 GitHub 官方发行源下载并校验桌宠运行时，需要联网；下载较大，启动可能稍慢。
4. 打开一个会话，双击小鲸聊天。如本机必须使用代理，可先按下方开发步骤预装 Electron，或通过 `electronPath` 指定已安装的独立运行时。

也可使用 Desktop 自带的 `dsh` 命令。先启动 Desktop 一次初始化 profile，完全退出应用，然后执行：

```bash
dsh plugin --profile desktop add /absolute/path/dsh-coopanion-0.1.1.tgz
```

此处需要 Desktop 自带的 CLI；npm 安装的 dsh 不能管理 Desktop 所拥有的 profile。Desktop 完全退出后执行包管理命令，再重新打开应用。

## 开发与验证

需要 Node.js 24、Git。Electron 支持 Windows、macOS、Linux；Linux 本机桌宠需要 X11 / XWayland 显示环境。

```bash
npm ci
npm run setup:electron  # 下载并校验 Electron，后续启动无需重复下载
npm run typecheck
npm test
npm run build
npm run dev             # 浏览器演示，事件和回复为模拟数据
npm run demo            # 真实 Electron 窗口，事件为模拟数据
```

云环境已准备 Node.js、npm、Electron 和一个放在 `/workspace/.cache/xvfb` 的虚拟显示运行时。运行测试：

```bash
npm run test:ui         # 使用 CHROMIUM_PATH 或系统 Chromium
XVFB_PATH=/workspace/.cache/xvfb/usr/bin/Xvfb npm run test:desktop
npm pack
node scripts/check-package.mjs
XVFB_PATH=/workspace/.cache/xvfb/usr/bin/Xvfb npm run test:install
```

桌面测试会在缺少 DISPLAY 时启动 Xvfb，并在结束后关闭它；有桌面的机器无需 XVFB_PATH。CI 下载 Playwright Chromium 并执行同样的检查。窗口测试仅在虚拟显示中使用测试沙箱设置，普通插件启动保持渲染器 sandbox、contextIsolation，关闭 Node integration。

`test:desktop` 验证真实 Electron 窗口、启动握手、双向 IPC 聊天、宿主回复和通知卡片。`test:install` 在临时目录安装官方发布的 DSH，使用它的 `dsh plugin add` 安装实际 `.tgz`，检查兼容校验、bundle 激活、真实 profile loader、桌宠窗口、会话事件通知和正常关闭；不使用版本豁免。默认测试 0.2.0-rc.2，`DSH_TEST_VERSION=0.2.1-alpha.1` 测试另一支持版本。测试 overlay 挂载实际会话服务与 agent registry，不运行模型请求。桌面端使用相同的安装服务与 profile loader；macOS / Windows 的桌面安装页、实机窗口和系统通知，以及真实模型聊天仍需验收。

## 配置

在 profile 的 `cordis.patch.yml` 中覆盖该插件条目：

```yaml
- id: dsh-coopanion
  config:
    size: 150
    roam: true
    notifications: true
    bubbleDurationMs: 12000
    # electronPath: /absolute/path/to/electron
```

`size` 范围 90–240；`bubbleDurationMs` 范围 2000–60000。`electronPath` 可指定已安装的独立 Electron 可执行文件；不要填写 Harness 的打包可执行文件。配置字段需要完整覆盖。内存中的休息、走动和气泡静音设置在重启后恢复配置默认值。

## CI 与发布

main 的 push、PR 和手动运行执行类型检查、插件测试、浏览器交互测试、Electron 桌面测试、压缩包检查，并在两个支持的 DSH 版本中安装和加载同一压缩包。推送与 `package.json.version` 一致的 `v*` 标签时，只有全部测试及安装矩阵成功后才创建 GitHub Release，附带插件 `.tgz` 和 `SHA256SUMS`；不自动发布到 npm。

```bash
git tag v0.1.1
git push origin v0.1.1
```

插件本身没有遥测或额外联网 API；模型请求与权限管理由 Harness 负责。Electron 首次准备时从官方发行源下载运行时并执行校验。Node 24 的代理下载可通过 `NODE_USE_ENV_PROXY=1` 使用现有 HTTP(S) 代理变量，TLS 与校验保持开启。
