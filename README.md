# DeepSeek 大肥鱼 · dsh-coopanion

给 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) 加一只桌面伙伴。她会陪你工作，在任务完成、出错或需要确认时提醒你；双击角色，可以向已打开的 Harness 会话发送消息。

**v0.4.1 使用 Coopanion 的原生动画与角色运行时，组合程序采用 AGPL-3.0-or-later。** 大肥鱼的网格变形、弹簧动作、动态五官、物理拖拽和八套配色直接复用上游固定版本。角色贴图保留独立权利声明，见 [第三方声明](THIRD_PARTY_NOTICES.md) 和 [上游版本记录](web/upstream/UPSTREAM.md)。

## 功能

- 原生 WebGL 网格动画、眨眼与视线、动态嘴部、头发 / 鳍 / 尾巴的弹簧动作。
- 上游动作和表情：走路、跑步、跳跃、挥手、鞠躬、跳舞、坐下、睡眠等；拖拽、抛掷与落地由同一物理系统处理。
- 描边对话气泡，逐字显示、标点停顿、嘴部同步和合成音效；菜单可关闭音效。这是角色音效，不是 TTS。
- `figure.json` API 2 ZIP 角色包导入、动画预览、配色 / 多轴换装、切换、删除；角色和搭配在重启后保留。
- 透明、无边框、置顶桌宠；空白区域点击穿透。点击互动、双击聊天、右键菜单、闲时活动、休息和显示 / 隐藏。
- 角色周围不显示常驻按钮、会话气泡或名称标签；在聊天面板中点击当前会话可切换对话。
- Harness 原生 **Settings → 桌宠** 页面：运行状态、启动 / 重启 / 关闭、显示 / 隐藏、角色管理及实时保存的偏好设置。
- 实时思考 / 回复 / 工具工作 / 等待确认 / 完成 / 出错动画；新任务自动唤醒休息中的角色，思考标记持续显示，流式回复逐字续写而不重播。完成状态 2.5 秒后回到待机。
- 会话以真实提问、项目路径、时间和有效短编号区分，支持搜索及键盘切换；旧会话从公开历史恢复提问。
- 菜单与聊天使用角色风格的描边卡片，颜色跟随换装；摸头、叫醒、拖拽等互动使用上游身体事件。
- macOS 状态栏同步当前角色 / 配色、会话、任务状态、休息、显示 / 隐藏和音效；走动、提醒开关与 Harness 设置共用持久偏好。
- 聊天输入通过 `Agent.followup()` 进入 Harness 的持久会话，使用其现有模型、工具和权限。互动和换装不会自动发起模型请求。
- 菜单提供 **源码 · AGPL**，包含对应源代码、上游运行时、构建脚本和依赖锁文件。

审批提示引导你回到 Harness；桌宠不作出审批，也不单独收集 API Key。当前对话决定角色展示的状态及聊天消息的去向，其他对话有重要事件时仍会提醒。

角色脚本在 `sandbox="allow-scripts"` 的 opaque-origin iframe 中运行，只通过受控消息协议与宿主交互；没有 Node、Electron 桥、外部网络连接或顶层导航权限。本地资源服务只监听 `127.0.0.1`，桌面实例使用随机路径，API 写入要求可信页面来源。

## 破坏式更新

v0.4.0 移除了旧 Canvas 关键帧引擎、`dsh-character` v1 协议、`.dshpet` 包、旧 schema 和转换工具。旧角色不能直接加载，也不提供旧引擎兼容模式；需要重新制作或导入 API 2 包。

桌面版改用独立数据目录 `figures-v2`，旧角色选择恢复为内置大肥鱼。旧 `characters` 数据不会被读取；不再需要时可自行删除。Harness 的会话与配置不受角色数据重置影响。

## 安装到 Desktop

支持 **DSH 0.2.0-rc.2 和 0.2.1-alpha.1**；其他版本未声明兼容。

1. 下载对应 [Release](https://github.com/takboo/dsh-coopanion/releases) 的 `.tgz`，或按下面步骤构建 `dsh-coopanion-0.4.1.tgz`。本分支的修改不代表该版本已经发布。
2. 在 Harness 侧边栏 **插件** 页安装压缩包的绝对路径，启用 `dsh-coopanion`。
3. 完全退出再重新打开 Harness。首次启动时会下载并校验 Electron 44 运行时。
4. 打开一段 Harness 会话，双击角色聊天，或从 **Settings → 桌宠** 管理角色。

也可使用 Desktop 自带的 CLI。先启动 Desktop 一次初始化 profile，完全退出应用，再执行：

```bash
dsh plugin --profile desktop add /absolute/path/dsh-coopanion-0.4.1.tgz
```

npm 安装的 dsh 不能管理 Desktop 所拥有的 profile。Desktop 完全退出后执行包管理命令，再重新打开应用。

## 开发与验证

需要 Node.js 24。Electron 支持 Windows、macOS、Linux；Linux 的窗口测试需要 X11 / XWayland 或 Xvfb。原生网格需要 Chromium 的 WebGL 支持。

```bash
npm ci
npm run setup:electron
npm run typecheck
npm test
npm run build
npm run character:pack -- examples/star paper-star.zip
npm run test:ui
npm run test:desktop
npm pack
node scripts/check-package.mjs
npm run test:install
```

依赖锁使用 `npm-shrinkwrap.json`，随安装包及源码下载提供；`npm ci` 可以直接使用它。

`npm run dev` 打开浏览器演示服务（默认 `http://127.0.0.1:4173`），`npm run demo` 启动桌面演示。演示中的任务事件是模拟的。浏览器预览和桌面版使用同一个 API 2 存储与沙箱运行时。

浏览器测试检查实际 WebGL 动画、逐字说话与嘴部同步、拖拽 / 落地、会话、聊天、换装、包导入、重启保存及脚本隔离。桌面测试验证真实 Electron 窗口、IPC、流式回复、休息唤醒、状态栏投影和角色数据；CI 同时运行 Linux 和 macOS 原生窗口测试。安装测试使用官方 DSH profile loader 安装实际 `.tgz`，检查任务事件、会话导航、设置页、配置持久化和重启；`DSH_TEST_VERSION=0.2.1-alpha.1` 测试另一支持版本。

窗口测试只在虚拟显示中使用测试沙箱参数与软件 WebGL。普通安装保留 Chromium sandbox、contextIsolation，关闭 Node integration。macOS / Windows 的实机窗口、系统通知和真实模型聊天仍需验收。

## 新角色

右键角色 → **角色与动画** → **导入角色包**，选择包含 `figure.json` 的 API 2 ZIP。预览、试播动作、选择配色或搭配，再点击 **使用角色**。删除正在使用的自定义角色会恢复内置大肥鱼。

`examples/star` 是基于上游 `kit.createBody()` 的最小 SVG 角色，具备共享动作、表情、说话和拖拽。复制目录、修改 id 和素材后打包：

```bash
npm run character:pack -- examples/star paper-star.zip
```

完整工厂接口、资源规则、动作映射及换装说明见 [角色对接文档](docs/characters.md)。内置大肥鱼的 `web/upstream/whale/figure.json` / `model.json` / `figure.js` 展示网格角色的完整实现。内置角色的 id 为 `whale`。

## 配置与会话

**Settings → 桌宠** 沿用 Harness 的主题、中英文与系统语言设置。可控制随 Harness 启动、闲时活动、任务通知、角色尺寸（90–240）和气泡时长（2–60 秒）；数值按 Enter 或离开输入框保存。

```yaml
- id: dsh-coopanion
  config:
    autoStart: true
    size: 180
    roam: true
    notifications: true
    bubbleDurationMs: 12000
    # electronPath: /absolute/path/to/electron
```

气泡时长从逐字显示完成后计时，进行中的任务提示保持显示。减少动态效果时禁用闲时活动与逐字显示，保留直接拖动及落地。

桌宠仅展示已加载的顶层会话，忽略子代理；新会话自动成为当前对话。未加载的历史会话需先在 Harness 中打开。桌面版通过公开的 `dsh://open` 协议唤回 Harness。多个本机客户端同时连接时，返回请求由首先领取的客户端处理。

## CI 与发布

CI 执行类型检查、单元测试、浏览器交互、Electron 窗口、压缩包检查，以及两个 DSH 版本的实际安装测试。推送与 `package.json.version` 一致的 `v*` 标签且全部检查通过后，创建 GitHub Release，附带插件 `.tgz`、`paper-star.zip` 和校验值；不自动发布到 npm。

插件没有遥测或独立模型 API。上游代码和角色资源已固定在仓库中，不在启动时在线拉取。Electron 首次准备仍从官方发行源下载并校验；Node 24 可用 `NODE_USE_ENV_PROXY=1` 沿用已有代理变量。
