# 发布流程

发布使用仓库固定工具链和 `npm-shrinkwrap.json`。npm 包为 `@takboo/dsh-coopanion`，公开发布；配置 id 和设置 namespace 为 `dsh-coopanion`。分发保留 AGPL 对应源码、构建脚本、锁文件及第三方声明；历史证据和临时交接内容不进入安装包。

## 准备发布

1. 完成实现、测试与当前文档，按[开发指南](development.md)运行相关检查。
2. 增加 `package.json` 和 shrinkwrap 的版本，在 `docs/release-notes.md` 顶部新增对应 `# v<版本>` 节；同步首页与使用指南的精确安装版本。
3. 执行 `npm run verify:metadata`，提交并将发布提交合入 main，等待 main CI 通过。
4. 对实际发布提交创建新的稳定标签并推送：

```bash
git tag v<实际版本> <发布提交>
git push origin v<实际版本>
```

稳定标签首次推送后，main 上的 `release.yml` 会以 `mode=verify` 执行完整验证。也可从 Actions 在 main 手动派发验证。等待验证通过并下载该运行的 `desktop-pet`，用其中的版本包完成对应的桌面验收。记录验证运行编号、包的 SHA-256 和验收结果，再在 main 派发发布。

```bash
gh workflow run release.yml --ref main -f tag="$RELEASE_TAG" -f mode=publish \
  -f verified-run="$VERIFIED_RUN" -f verified-sha256="$VERIFIED_SHA256"
```

发布任务从指定的成功验证运行取回原始附件，复核标签、构建提交和所填摘要。验证报告和产物保留七天，过期后需要重新验证并验收新运行的包。

## 自动检查与同包分发

CI 在 Linux、macOS、Windows 上运行元数据、类型、单元、浏览器、键盘辅助进程及真实 Electron 窗口检查；宿主安装矩阵按三平台与 `package.json#engines.dsh` 的精确版本列表组合生成，实际配置以 [.github/workflows/ci.yml](../.github/workflows/ci.yml) 为准。Linux 窗口检查由 Xvfb + Openbox 提供隔离显示，原生桌面步骤保留进程日志并设置六分钟上限。

发布验证标签是 `origin/main` 的祖先、包与 shrinkwrap 版本一致且当前发布说明存在，然后检出不可变提交并重新执行完整 CI。PR 或 main 的先前测试结果不能代替标签上的发布检查。

Linux 构建并打包一次，成为规范产物。`npm pack` 产生的 `takboo-dsh-coopanion-<版本>.tgz` 只重命名为 `dsh-coopanion-<版本>.tgz`；固定别名通过复制获得。完整宿主安装矩阵、npm 和 Release 都消费这份压缩包，发布使用 `--ignore-scripts`，不会再次构建。

`verification.json` 绑定完整源码提交、版本、SHA-256 与 npm SHA-512 integrity；`dist/build-info.json` 记录产品输入摘要。生成正式报告要求干净、已提交的 checkout。构建摘要不代替完整 `.tgz` 的身份。

发布顺序为 **完整 CI → 本轮要求的额外宿主验收 → npm → GitHub Release**。npm job 使用 Trusted Publisher OIDC；Release job 独立拥有内容写权限。发布前再次核对标签没有移动。fork、其他分支、移动／删除标签和预发布标签不进入稳定版验证与发布流程。

Release 附件包括：

- `dsh-coopanion-<版本>.tgz` 与相同字节的 `dsh-coopanion.tgz`。
- 示例角色 `paper-star.zip`。
- `SHA256SUMS`、`verification.json` 与仅当前版本的 `release-notes.md`。

`docs/release-notes.md` 是 Release 正文源；工作流提取当前版本节，不能只上传附件而省略正文。固定包名供市场的 `latest/download/dsh-coopanion.tgz` 使用。

发布完成后，核对本地附件与 GitHub Release 的 SHA-256。确认字节一致的本地副本可以清理，需要复验时从固定版本的 Release 下载。独有的原始验收报告、日志与尚未发布的候选证据单独保留。

## 失败与重跑

检查失败时先保留对应 job 的日志与 artifact，核对失败断言、运行环境及规范包身份，再决定修复或复验。对失败检查复验时沿用规范包、原断言及原期限，并保留首轮失败与后续结果；复验通过单独记账，不能据此宣称根因已修复。

npm 上传后可能异步处理。发布后的 `--require-published` 对 404 每十秒重试、最多五分钟；不同字节占用版本、其他 HTTP 错误或超时均失败。上传前的版本检查只查询一次。

npm 成功但 Release 附档失败时，优先在 artifact 的七天保留期内重跑失败 job。重跑 publish 仅在 npm integrity 与规范包完全相同时跳过上传；字节冲突必须增加版本。已发布标签、包和原始报告保持不可变，不能本地重打包替换。

OIDC 认证失败时核对实际 Trusted Publisher 绑定和 job 日志。认证修复后仍沿用同一规范包；本地构建和安装成功分别记录，不能代替发布成功。

## 发布后核验

核对 npm 版本和 `latest`、Release 正文、版本包、固定别名、`verification.json` 及 `SHA256SUMS`。下载字节应与通过安装矩阵的规范包相同。新的核验使用独立记录并绑定本次提交和包摘要；结论更新本页“最近一次发布核验”，链接对应 Release 与运行记录。

安装入口使用精确 `@takboo/dsh-coopanion@<版本>`。pnpm 的发布时间保护可能使裸包名暂时解析为旧版，详情页显示新版不证明安装了新版；检查隔离 profile 中的精确版本安装及实际日志。原因与操作见[使用指南](usage.md#安装版本与发布时间保护)。

## 最近一次发布核验

### v0.4.22

2026-11-10 发布 [v0.4.22](https://github.com/takboo/dsh-coopanion/releases/tag/v0.4.22)，源码为 `ca3bab64ab1751dfbb4841c05c3e9e843738be83`，包含恢复抛掷的 `a7db69b`。规范包 SHA-256 为 `37835e5088b086988557bddff0caa3e2dfbd35fcbe3c1433801739be69999b49`。npm `latest` 为 `0.4.22`，npm tarball、Release 版本包、固定别名和 latest 下载与规范包逐字节一致。[verification.json](https://github.com/takboo/dsh-coopanion/releases/download/v0.4.22/verification.json)

[main CI](https://github.com/takboo/dsh-coopanion/actions/runs/42778829622) 和[标签验证](https://github.com/takboo/dsh-coopanion/actions/runs/42781603647) 均通过三平台测试和 21 组同包宿主安装。[OIDC 发布](https://github.com/takboo/dsh-coopanion/actions/runs/42784594550) 使用标签验证的原始产物。固定 Linux 容器通过准入、Web 行为、卸载和完整收件箱回归。macOS 15.7.7 ARM64 Tart 来宾使用 DSH `0.2.2-rc.1` 通过同包安装、原生窗口打开与重开、正常退出，来宾已回收。抛掷用例使用受控 Chromium 指针输入，物理设备上的手势体验仍待实测。

### v0.4.20

2026-11-09 发布 [v0.4.20](https://github.com/takboo/dsh-coopanion/releases/tag/v0.4.20)，发布源码为 `5febec8cfe35b4b106ab1587157b2f2574136564`，规范包 SHA-256 为 `4591faa7c1164b944ab844bc62cd83bb3cfa10b0ed86b63a5c47e528952cc0c0`。核验时 npm `latest` 为 `0.4.20`，DSH `0.2.2-rc.1` 从 npm 安装精确版本通过。npm tarball、Release 版本包、固定别名及 latest 下载与规范包逐字节一致。[verification.json](https://github.com/takboo/dsh-coopanion/releases/download/v0.4.20/verification.json)

[main CI](https://github.com/takboo/dsh-coopanion/actions/runs/42603391595) 通过。发布验证完成七版宿主、三平台共 21 组同包安装，OIDC 发布复用该运行的规范包。[发布验证](https://github.com/takboo/dsh-coopanion/actions/runs/42606722518) · [OIDC 发布](https://github.com/takboo/dsh-coopanion/actions/runs/42609601652)

固定基座 `5fe3e92c64d4dfbbcfd3926fb52c347b10cc641e` 的 Linux 容器验证了 DSH `0.2.2-rc.1` 安装、设置和卸载，以及 `0.2.1-rc.4` 拒绝且无残留。Coopanion 收件箱测试同样在 Linux 容器通过。官方 Windows Desktop `0.2.2-rc.1` 的两个隔离 profile 分别验证了插件管理器安装后的真实桌宠窗口，以及冷下载中点击关闭后安装器和连接退出、Host 保持可用。正式复测覆盖隔离 VM 的交互会话。详细身份、检查范围和市场快照见[补充核验记录](https://github.com/takboo/dsh-coopanion/releases/download/v0.4.20/additional-verification.json)。

### v0.4.19

2026-11-05 已发布 [v0.4.19](https://github.com/takboo/dsh-coopanion/releases/tag/v0.4.19)，核验时 npm `latest` 为 `0.4.19`。发布提交为 `28ed7679fe28fabff3f2b2d0fa48e69d85d05a55`，规范包 SHA-256 为 `7f5d0cc83823c25985a99ec30741662e64f17b6185b2fa5dc40ac863d2559ba1`；npm tarball、Release 版本包、固定别名和当时的 latest 下载字节一致。固定身份见该 Release 的 [verification.json](https://github.com/takboo/dsh-coopanion/releases/download/v0.4.19/verification.json)，详细范围见[补充核验记录](https://github.com/takboo/dsh-coopanion/releases/download/v0.4.19/additional-verification.json)。

[main CI](https://github.com/takboo/dsh-coopanion/actions/runs/41995247279) 和[标签发布流程](https://github.com/takboo/dsh-coopanion/actions/runs/41998629966) 最终通过七版宿主、三平台共 21 组同包安装。首轮标签检查在 DSH `0.2.1-rc.5` 上分别出现 Linux 重启后陪伴模式不符和 Windows Host 退出超时，另有 Windows／DSH `0.2.1-rc.3` 原生窗口未就绪；三项在同源同包、原断言与原期限下复验通过，根因尚未确认，原始失败保留。

隔离 macOS 15.7.7 ARM64 VM 预检完成单元、收件箱与原生桌面验证，正式规范包在普通 npm rc.1 Host 上的实际安装通过；匹配的官方签名 Desktop／ASAR 12 阶段检查也通过，报告仍保留 `partial` 范围。原生 Desktop shell、系统通知中心、真实账号模型、物理多屏及长期体验未据此验收。

## 社区市场

市场从社区目录读取条目，npm 发布本身不完成收录。仓库维护的条目为 [takboo__dsh-coopanion.yml](market/takboo__dsh-coopanion.yml)，使用固定 Release 下载地址；投稿按[社区贡献规范](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)核对，不修改生成文件。

新增版本继续维护 npm metadata、稳定标签、Release 正文与固定下载别名，无需重复提交目录条目。目录构建、版本探测和市场修改记录可能异步更新；若报告市场状态，应核对实际在线结果，不能从 npm 发布或目录 PR 推断已同步。
