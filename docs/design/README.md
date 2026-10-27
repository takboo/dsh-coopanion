# 小湛与 Livelings 当前设计入口

2026-10-27：用户决定保留当前方向，下一轮继续打磨小湛。当前交付是可体验的纯代码角色原型；造型、DeepSeek 辨识度与长期鲜活感仍由用户实际反馈判断。

## 分支与产品边界

| 项目 | 当前状态 |
| --- | --- |
| 续做分支 | `codex/little-deep-livelings` |
| 基线 | main `41bd49a433234e1a06ffac3c6b6acaf2979845c1` |
| 原型制作检查点 | `25b8523`：前两轮；`179594b`：第三轮完整互动 |
| 生活感分支 | `codex/aliveness-foundation`，查阅时为 `20d51b9`；只读参考过，未合并到本分支 |
| 已接入范围 | 独立浏览器体验页、角色定义和作者动作工作台 |
| 产品接入 | Harness、API 2、NPC／原生窗口仍沿 main 原实现；小湛尚未接入 |

本分支承接 main 上的原型提交，不包含旧生活感路线的默认装配。若后续任务涉及复用该分支的能力，应先读取该分支的接手入口和复用清单，再按实际需要选择模块。

## 当前资料与源码

| 需要做什么 | 从哪里开始 |
| --- | --- |
| 理解用户目标、已选组合与开放问题 | [设计白板](companion-art-whiteboard.md) |
| 查看当前角色、动作与手势说明 | [小湛当前原型](art-workflow/whale-little-deep-v3/README.md) |
| 修改造型、配色和动作 | [character.js](art-workflow/whale-little-deep-v3/character.js) |
| 修改体验控制、动作交接和演示 | [app.js](art-workflow/whale-little-deep-v3/app.js) |
| 查引擎 API、来源与许可 | [Livelings 来源入口](art-workflow/vendor/livelings/README.md)，按需显式读取 |
| 追溯前两轮方案或旧研讨 | [历史归档](../archive/2026-10-27-whale-studies/README.md) |
| 核对固定浏览器观察与整理结果 | [证据索引](../evidence/2026-10-27-little-deep/README.md) |

## 本地预览

从仓库根目录运行：

```bash
python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow
```

启动后打开 `http://127.0.0.1:4187/whale-little-deep-v3/`。页面内有当前动作工作台与小尺寸对照入口。预览结束后在启动终端按 Ctrl-C 结束服务；端口占用和本机进程状态以现场检查为准。

## 下一轮接手

先读取用户最新反馈和设计白板，在当前原型目录继续迭代。重点观察白腹、额顶缺口、尾柄与分叉尾鳍的辨识度，以及眨眼、藏尾巴、探头和动作打断的观感。用户已经选定主体，不再把前两轮候选当作待选队列。

原型语法、资源路径和浏览器观察分别记录；它们不代替美术认可。若范围转为正式角色接入，再进入 [API 2 角色契约](../characters.md)和相关产品测试，沿用共享完成语义及身体拥有权。当前没有启动 Blender、全方向制作或其他 AI 角色的实施队列。
