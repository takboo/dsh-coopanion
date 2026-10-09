# 小鲸 · dsh-coopanion

给 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) 加一只桌面小鲸鱼。它会陪你工作，在任务完成或需要确认时提醒你；双击小鲸，可以向已打开的 Harness 会话发送消息。

灵感来自 [Coopanion](https://github.com/Pal-AI-Lab/Coopanion)。本项目的动画引擎独立实现，内置小鲸素材原创，代码使用 MIT 许可。另提供使用 Coopanion 拆件贴图适配的 **DeepSeek 大肥鱼** 角色包；素材署名与权利声明见 [角色包说明](characters/deepseek-whale/README.md)。

## 功能

- 独立动画引擎：立绘、序列帧图集、分层父子变换和关键帧插值。
- `.dshpet` 角色包导入、动画预览、切换、删除与重启后保存；角色规范和示例见下文。
- 透明、无边框、置顶桌宠；空白区域点击穿透。
- 点击互动、拖动移动、闲时走动、休息、显示 / 隐藏。
- Harness 原生 **Settings → 桌宠** 页面：运行状态、启动 / 重启 / 关闭、显示 / 隐藏、角色管理，以及实时保存的偏好设置。桌宠关闭后仍能从此页打开。
- 思考、工具工作、等待确认、完成和出错的表情与气泡。
- 完成、出错和审批提醒；支持系统通知和桌宠通知卡片。
- 会话选择与聊天；输入通过 `Agent.followup()` 进入 Harness 的持久会话，使用其模型、工具和现有权限。

审批提示会引导你回到 Harness，桌宠不代替宿主作出审批。小鲸不自动向模型发送点击、拖动等互动，也不单独收集 API Key。

## 安装到 Desktop

**v0.3.1 支持 DSH 0.2.0-rc.2 和 0.2.1-alpha.1**。v0.1.0 要求较新的 SDK，会被 0.2.0-rc.2 的安装检查拒绝；使用 rc.2 时请下载修正版。接口尚未稳定，其他版本未声明兼容。

1. 从 [Releases](https://github.com/takboo/dsh-coopanion/releases) 下载 `dsh-coopanion-0.3.1.tgz`，记下绝对路径。
2. 打开 Harness 的侧边栏 **插件** 页，安装该压缩包路径，并启用 `dsh-coopanion`。
3. 完全退出再重新打开 Harness。首次启用时，Electron 44 自动从 GitHub 官方发行源下载并校验桌宠运行时，需要联网；下载较大，启动可能稍慢。
4. 打开一个会话，双击小鲸聊天。如本机必须使用代理，可先按下方开发步骤预装 Electron，或通过 `electronPath` 指定已安装的独立运行时。

也可使用 Desktop 自带的 `dsh` 命令。先启动 Desktop 一次初始化 profile，完全退出应用，然后执行：

```bash
dsh plugin --profile desktop add /absolute/path/dsh-coopanion-0.3.1.tgz
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
npm run character:pack -- examples/star paper-star.dshpet
npm run character:pack -- characters/deepseek-whale deepseek-whale.dshpet
npm run dev             # 浏览器演示，事件和回复为模拟数据
npm run demo            # 真实 Electron 窗口，事件为模拟数据
```

云环境已准备 Node.js、npm、Electron 和一个放在 `/workspace/.cache/xvfb` 的虚拟显示运行时。运行测试：

```bash
export npm_config_cache=/workspace/.cache/npm
export electron_config_cache=/workspace/.cache/electron
export NODE_USE_ENV_PROXY=1
npm run test:ui         # 使用 CHROMIUM_PATH 或系统 Chromium
XVFB_PATH=/workspace/.cache/xvfb/usr/bin/Xvfb npm run test:desktop
npm pack
node scripts/check-package.mjs
XVFB_PATH=/workspace/.cache/xvfb/usr/bin/Xvfb npm run test:install
```

桌面测试会在缺少 DISPLAY 时启动 Xvfb，并在结束后关闭它；有桌面的机器无需 XVFB_PATH。CI 下载 Playwright Chromium 并执行同样的检查。窗口测试仅在虚拟显示中使用测试沙箱设置，普通插件启动保持渲染器 sandbox、contextIsolation，关闭 Node integration。

`test:desktop` 验证真实 Electron 窗口、启动握手、双向 IPC 聊天、宿主回复、通知卡片，以及角色导入、完整进程重启后的保存和删除。浏览器测试覆盖三种渲染方式、实际画布像素、动画播放、减少动态效果和错误角色包。`test:install` 在临时目录安装官方发布的 DSH，使用它的 `dsh plugin add` 安装实际 `.tgz`，检查兼容校验、bundle 激活、真实 profile loader、桌宠窗口、自定义角色导入、会话事件通知和正常关闭；再通过官方前端打开原生设置页，验证显示 / 隐藏、关闭后重开、角色管理、尺寸即时应用、深色主题、中英文即时切换、自动语言选择，以及完整宿主重启后的配置与自动启动开关。测试不使用版本豁免。默认测试 0.2.0-rc.2，`DSH_TEST_VERSION=0.2.1-alpha.1` 测试另一支持版本。测试 profile 组合官方 base / web bundles，并挂载会话事件观察器，不运行模型请求。桌面端使用相同的安装服务与 profile loader；macOS / Windows 的桌面安装页、实机窗口和系统通知，以及真实模型聊天仍需验收。

## 自定义角色

右键桌宠 → **角色与动画**，导入 `.dshpet` / `.zip` 后预览并点击 **使用角色**。Release 附带 `paper-star.dshpet` 和 **`deepseek-whale.dshpet`（DeepSeek 大肥鱼）**；选择会在重启后保留。已有 v0.2.0 插件也能直接导入大肥鱼角色包。

大肥鱼使用 Coopanion 的 DeepSeek 原配色拆件贴图，动作由本项目重新编写，支持眨眼、摆尾、挥手、走路、坐姿睡眠和任务表情。素材署名、权利说明、适配范围与重建方法见 [角色包说明](https://github.com/takboo/dsh-coopanion/blob/main/characters/deepseek-whale/README.md)。

角色采用纯数据包，包含 `character.json` 和 PNG / 静态 WebP 素材。支持立绘、序列帧和分层关键帧，不执行角色作者提供的脚本。角色名称用于桌宠展示，聊天沿用已有 Harness 会话的模型与配置。

制作自己的角色可复制 `examples/portrait` 或 `examples/star`，填写名称、作者和实际素材许可，替换图片后打包：

```bash
npm run build
npm run character:pack -- examples/star paper-star.dshpet
```

完整字段、动作映射、分层规则、大小限制及 JSON Schema 见 [角色包规范](docs/characters.md)。内置小鲸也是分层角色包；v1 尚不包含网格变形、Live2D / VRM、音效、换装或商店。

## 配置

打开 **Settings（设置）→ 桌宠**（英文界面为 **Settings → Desktop pet**）。页面沿用 DSH 的按钮、开关、字号、圆角和主题颜色，支持中英文与浅色 / 深色模式。菜单、按钮、状态、说明、保存反馈和数字校验提示都接入 DSH 本地化服务。

语言跟随 Harness 的界面设置，在 **Settings → General → Language** 切换中文 / English 后即时更新；没有固定语言偏好时，使用 Harness 启动时读取的系统语言，普通 Web 客户端使用浏览器语言，中英文以外的语言回退到英文。更改操作系统语言后重新打开 Harness 即可应用。插件不单独保存语言偏好。

- **启动桌宠 / 显示桌宠 / 隐藏桌宠 / 重启 / 关闭桌宠**：关闭的是独立桌宠进程，配置页面持续可用；启动失败也可在此查看原因并重试。
- **随 Harness 启动**：控制下次启动的行为，关闭此开关不会立即关闭当前桌宠。
- **闲时走动、任务通知、角色尺寸、气泡时长**：由 DSH 原生配置服务保存到当前 profile，立即生效。数值输入按 Enter 或离开输入框保存。
- **管理角色**：打开角色与动画面板；桌宠关闭时会先启动。角色选择和导入仍保存在桌宠的独立数据目录中。

也可以在 profile 的 `cordis.patch.yml` 中覆盖该插件条目：

```yaml
- id: dsh-coopanion
  config:
    autoStart: true
    size: 150
    roam: true
    notifications: true
    bubbleDurationMs: 12000
    # electronPath: /absolute/path/to/electron
```

`size` 范围 90–240；`bubbleDurationMs` 范围 2000–60000。`electronPath` 可指定已安装的独立 Electron 可执行文件；不要填写 Harness 的打包可执行文件。通过文件覆盖时配置字段需要完整覆盖。内存中的休息和气泡静音设置在重启后恢复配置默认值。设置页仅在连接本机 Harness 时提供配置写入和桌宠控制。

## CI 与发布

main 的 push、PR 和手动运行执行类型检查、插件测试、浏览器交互测试、Electron 桌面测试、压缩包检查，并在两个支持的 DSH 版本中安装和加载同一压缩包。推送与 `package.json.version` 一致的 `v*` 标签时，只有全部测试及安装矩阵成功后才创建 GitHub Release，附带插件 `.tgz`、`paper-star.dshpet`、`deepseek-whale.dshpet` 和 `SHA256SUMS`；不自动发布到 npm。

```bash
git tag v0.3.1
git push origin v0.3.1
```

插件本身没有遥测或额外联网 API；模型请求与权限管理由 Harness 负责。Electron 首次准备时从官方发行源下载运行时并执行校验。Node 24 的代理下载可通过 `NODE_USE_ENV_PROXY=1` 使用现有 HTTP(S) 代理变量，TLS 与校验保持开启。
