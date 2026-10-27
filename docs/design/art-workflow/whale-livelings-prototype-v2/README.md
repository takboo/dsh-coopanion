# Livelings 鲸鱼造型草案

用户对第一轮的反馈是：思路对了，当前主要问题转为形象不讨喜，要求尝试 Livelings skill 重做。第一轮保留供对照，不把互动方向的认可解释为美术验收。

本轮实际读取作者的 [SKILL.md](upstream/SKILL.md)、[设计指南](upstream/design.md)、[API](upstream/api.md)与模板，复制作者分发的原始 workspace，并使用其中的 `createMascot`、`Actor`、96 点轮廓、弹簧、视线与触碰交互。没有全局安装 skill。

按 skill 的“Concepts before code”流程，本页是三个可互动的造型概念草案，供用户先挑选轮廓。尚未把全部概念制作成拥有 4–6 个独有动作的完整角色；选择后再细化完整表演。现有通用状态、基础互动与一项招牌动作足够用于本轮比较。

| 草案 | 形象 | 招牌动作与状态意图 |
| --- | --- | --- |
| 小湛 | 蓝色短身鲸，白色眼睛，尾巴融入整体轮廓 | 思考憋泡泡，工作时细碎划水，完成喷水，出错吐一粒小泡，休息放松尾巴 |
| 奶泡 | 奶白的小鲸，蓝尾巴，深色眼睛 | 思考／触碰时变成尾巴书签，工作缓慢摆动，完成探出来，出错缩一下，休息闭眼 |
| 墨鲸 | 更扁长的深蓝轮廓，浅色眼睛 | 像笔锋的尾巴，思考轻摆，工作稍快，完成甩尾，出错下垂，休息慢下来 |

造型、名称和动作均为待选草案，不是已通过的产品角色。本页没有接入 API 2、模型、NPC 或原生窗口。

## 启动

从仓库根目录运行：

```bash
python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow
```

打开 `http://127.0.0.1:4187/whale-livelings-prototype-v2/`。

底栏或左右方向键切换对照／单独观察。可轻戳、按住抚摸、拖动；按钮体验工作状态，配色切换为各自本色／晴蓝／奶白／薄荷。每个草案的“动作工作台”进入作者原有的十六格工作台，提供通用动作观察和导出。

## 来源与许可

- 引擎和 workspace 来源：作者提供的 `https://livelings.makerjackie.com/livelings-skill.zip`，于 2026-10-27 下载。原始文件摘要和下载包摘要见 [source.json](upstream/source.json)。新增角色不包含在该原始 workspace 文件清单中。
- workspace 与复制的 skill／设计／API 文档保持原字节；本次鲸鱼草案另存于 `livelings/characters/whale-concepts.js`。
- 引擎代码采用 [MIT](upstream/LICENSE)；引擎中附带的原有角色及示例采用[独立角色许可](upstream/LICENSE-CHARACTERS.md)，保留署名 Livelings by MakerJackie。
- 本次鲸鱼代码按项目 AGPL-3.0-or-later 提供，曲线为新绘制，不是对某个现有吉祥物的描摹。
- [上一轮原型](../whale-code-prototype-v1/README.md)与[研讨白板](../../companion-art-whiteboard.md)保留讨论背景。
