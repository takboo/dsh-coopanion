# DSH 角色包 v1

插件 v0.2.0 引入独立的 MIT 动画引擎和纯数据角色包。设计参考桌宠项目将宿主交互与角色绘制分开的方式，未复制 Coopanion 的引擎实现。v0.2.1 另外提供使用上游拆件贴图适配的 [DeepSeek 大肥鱼角色包](https://github.com/takboo/dsh-coopanion/blob/main/characters/deepseek-whale/README.md)。本规范与 Coopanion 的 `figure.json` 接口不同，不能直接导入它的形象包。

## 导入和切换

右键桌宠 → **角色与动画** → **导入角色包**，选择 `.dshpet` 或 `.zip`。预览角色、查看作者和许可后，点击 **使用角色**。导入同一 id 会更新本地角色包，点击使用后应用更新。删除正在使用的自定义角色会恢复内置小鲸。

Desktop 将角色包和选择保存在桌宠自己的 Electron `userData/characters` 中，独立于 Harness 会话、模型配置和 API Key。完整退出再打开后恢复选择。浏览器演示使用该浏览器的 IndexedDB；浏览器数据不会自动迁移到 Desktop。

[Release](https://github.com/takboo/dsh-coopanion/releases) 附带 `paper-star.dshpet`，可直接导入体验序列帧动画。仓库的 `examples/star` 和 `examples/portrait` 分别是序列帧与立绘模板；内置小鲸的 `web/characters/whale/character.json` 是分层关键帧示例。

Release 还附带 `deepseek-whale.dshpet`。它使用 Coopanion 的 DeepSeek 原配色贴图和本项目编写的关键帧，支持全部 10 个状态动作。素材的署名、来源和权利声明保存在随包 `README.md` / `LICENSE` 中，不能将素材许可理解为引擎的 MIT 许可。

## 文件结构

`.dshpet` 是 ZIP 文件，清单必须位于压缩包根目录。不要把外层角色目录一起压入包中。

```text
character.json
assets/
  portrait.png
README.md         # 可选
LICENSE           # 可选
```

角色包只包含 JSON、PNG / 静态 WebP，以及可选的说明和许可文本。脚本、HTML、SVG、外部图片地址、APNG 和动态 WebP 不属于 v1；动画由引擎按清单播放。立绘没有自动拆件功能，复杂表情需要相应素材或图层。

## 最小立绘包

```json
{
  "format": "dsh-character",
  "formatVersion": 1,
  "id": "my-character",
  "name": "我的角色",
  "author": "你的名字",
  "license": "填写素材的实际许可",
  "description": "角色介绍",
  "canvas": { "width": 256, "height": 256 },
  "renderer": { "type": "image", "image": "assets/portrait.png" }
}
```

id 以小写字母开头，只包含小写字母、数字和 `-`，最长 48 字符；`whale` 留给内置小鲸。名称、作者和许可必填。引擎的 MIT 许可不改变作者对角色素材的许可。

`canvas` 定义逻辑坐标，绘制时缩放到桌宠大小；高宽比必须在 0.25–2 之间。立绘填满画布，建议使用透明背景。可选 `motion` 控制整体动作，默认值如下；设为 0 可关闭对应效果：

```json
"motion": { "breathe": 0.015, "bob": 2, "walkBounce": 3, "happyBounce": 8 }
```

`breathe` 是纵向缩放幅度，其余值为逻辑像素。系统开启减少动态效果时，整体呼吸、浮动和时间动画停止，角色仍响应状态切换、拖动和用户消息。

## 序列帧图集

将相同大小的帧按行排列在一张图片中，帧号从 0 开始，由左向右、由上向下。

```json
"renderer": {
  "type": "spritesheet",
  "image": "assets/atlas.png",
  "frameWidth": 128,
  "frameHeight": 128,
  "columns": 8,
  "rows": 1,
  "animations": {
    "idle": { "frames": [0, 1, 0, 0], "fps": 2 },
    "walk": { "frames": [2, 3], "fps": 8 },
    "happy": { "frames": [4, 5], "fps": 6 },
    "sleeping": { "frames": [6], "fps": 1 },
    "poke": { "frames": [4, 5], "fps": 6, "loop": false }
  }
}
```

图片尺寸必须等于 `frameWidth × columns` 和 `frameHeight × rows`。`idle` 必填，其余动作可省略；`loop` 默认 true，false 会保持最后一帧。每个动画最多 256 帧，fps 为 1–60。

## 分层关键帧

`layers` 的顺序就是绘制顺序，先背景后前景。每个图层有独立图片、大小、位置和枢轴，也可通过 `parent` 指定父图层；移动、缩放和旋转会随父图层变换。位置以父图层的局部坐标为基准，没有 parent 时以画布为基准。

```json
"renderer": {
  "type": "layers",
  "layers": [
    { "id": "body", "image": "assets/body.png", "width": 256, "height": 256 },
    { "id": "hand", "parent": "body", "image": "assets/hand.png", "x": 160, "y": 100,
      "width": 50, "height": 80, "pivotX": 0.5, "pivotY": 0.1 }
  ],
  "animations": {
    "idle": { "durationMs": 2000, "tracks": [] },
    "happy": {
      "durationMs": 1000,
      "tracks": [{ "layer": "hand", "property": "rotation", "keys": [
        { "at": 0, "value": 0 },
        { "at": 0.5, "value": -30, "easing": "smooth" },
        { "at": 1, "value": 0, "easing": "smooth" }
      ] }]
    }
  }
}
```

`pivotX`、`pivotY` 是图片内 0–1 的比例，默认中心。`rotation` 单位为度，默认 0；`scaleX`、`scaleY` 默认 1；`opacity` 默认 1。动画轨道控制 `x`、`y`、`rotation`、`scaleX`、`scaleY` 或 `opacity`，数值是属性的绝对值。未被当前动作控制的属性使用图层默认值。

`at` 是动画时长中的 0–1 进度，必须严格递增。插值由右侧关键帧的 `easing` 决定：`linear` 为线性，`smooth` 为平滑曲线。动画结束后，loop 为 false 时保持最后姿态。每包最多 32 图层，每个动画最多 64 轨道，每个轨道最多 64 关键帧；父子关系不能成环。

## 动作与 Harness 状态

| 动作 | 触发 |
|---|---|
| idle | 默认陪伴 |
| thinking / working / waiting | 思考、工具执行、等待确认 |
| happy / error | 完成、出错 |
| sleeping | 用户让桌宠休息 |
| walk | 桌宠闲时走动 |
| dragged | 用户拖动 |
| poke | 用户点击，持续约 700 ms |

优先级为拖动、睡眠、点击、走动、任务状态。未定义的动作回退到 idle，气泡和状态提示仍显示实际任务状态。切换角色、导入素材和点击互动不主动向模型发送消息；明确发送聊天时才使用已有的 Harness 会话。

## 制作与检查

```bash
npm ci
npm run build
npm run character:pack -- examples/star paper-star.dshpet
# 自己制作的目录
npm run character:pack -- /path/to/my-character my-character.dshpet
```

打包命令读取清单引用的素材，检查格式、图集和图层，再生成角色包。也可手动 ZIP 打包；导入时会执行同样的校验，图片在预览阶段解码后才可使用。[JSON Schema](character.schema.json) 可用于编辑器补全；图集尺寸、父子关系、轨道引用和关键帧顺序由运行时进一步校验。

限制：压缩包及文件解压总量不超过 32 MiB，单文件不超过 16 MiB，最多 128 项；清单不超过 256 KiB。图片单边不超过 4096，总像素数不超过 16 Mi 像素。导入不会将 ZIP 中的路径直接解压到文件系统。

v1 支持立绘、序列帧和分层关键帧，不包含网格变形、Live2D / VRM 运行时、音效、换装和角色商店。这些能力可在后续规范版本加入，现有包仍按其 formatVersion 校验。
