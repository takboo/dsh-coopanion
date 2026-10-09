# DeepSeek 大肥鱼 · DSH 角色包

Coopanion 的 DeepSeek 原配色鲸鱼女仆，是 dsh-coopanion 的内置默认形象，适配本项目独立实现的动画引擎。

素材来自 [Pal-AI-Lab/Coopanion](https://github.com/Pal-AI-Lab/Coopanion/tree/d7b1a0026fed3eb1975a6e0387527d806192cdbf/packages/cortico-world-desktop-pet/web/whale)。原设：溟月（上善无形）；女仆装二创参考：ZipZipPipe；拆件贴图由 Pal-AI-Lab 使用 OpenAI 图像模型生成。

## 使用

安装 dsh-coopanion 后会直接使用大肥鱼，无需再导入角色包。旧版本保存的内置小鲸选择会自动迁移到大肥鱼；用户明确选择的其他自定义角色仍会保留。

包含 idle、thinking、working、waiting、happy、error、sleeping、walk、dragged、poke 共 10 个动作。眨眼、摆尾、呆毛和鲸鳍轻摆、挥手、走路、坐姿睡眠均由本项目的关键帧实现；减少动态效果设置仍生效。

这是静态拆件和表情贴图的适配，未移植上游网格变形、物理模拟、完整动作系统或其他七种配色。原版动画与本包的动作幅度和细节有所不同。

![10 个动作的绘制预览](https://raw.githubusercontent.com/takboo/dsh-coopanion/main/docs/images/deepseek-actions.png)

## 来源与许可

见随包 `LICENSE`。应用引擎与新写的动画适配使用 MIT；上游贴图保留其来源和权利声明，不因打包而获得本项目的 MIT 授权。DeepSeek 标志属于相应权利人，本包不代表其认可或官方关联。

## 重建

源贴图的提交和 SHA-256 校验记录在 `source.json`，生成脚本只下载并校验 PNG，不加载上游 JavaScript、模型或动画引擎。原始身体贴图直接复制；表情拆件合成为透明图层，以符合角色包 v1 的图层上限。

```bash
npm ci
npm run build
npx playwright-core install chromium
npm run character:deepseek
npm run character:sync
```

可用 `CHROMIUM_PATH` 指定浏览器，`DSH_CHARACTER_CACHE` 指定经过校验的源贴图缓存根目录。生成 PNG 的压缩字节可能随浏览器版本变化，源贴图校验值不变。
