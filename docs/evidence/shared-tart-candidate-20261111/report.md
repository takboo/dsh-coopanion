# Coopanion 共享 Tart 候选包验证

2026-11-11（Asia/Shanghai）。本轮验收覆盖 npm DSH Host 和由它启动的原生 Electron 窗口，止于本地候选阶段。正式分发沿用[发布流程](../../releasing.md#准备发布)。

## 执行入口与基座

```bash
env -u DSH_ENGINEERING_CHECKOUT -u DSH_TART_HOME \
  bash docs/tools/verify-tart-candidate.sh artifacts/tart-candidate-20261111
```

- checkout 与 Tart 存储均来自本机配置（`checkoutSource=config tartHomeSource=config`）。入口核对 origin、tag `v0.1.0-rc.3` 和完整提交 `5178a049eddcf03778125be1db3ae523621f2fc3`。
- 两个工具从锁定提交导出。实际执行文件的 SHA-256 与该提交中的 Git blob 摘要一致。

| 工具 | SHA-256 |
| --- | --- |
| `scripts/lab.sh` | `43613df45733773128d2956ef2e4dd2f1b06d8b0c502019f12d26da65f8e1339` |
| `scripts/run-tart.sh` | `f391065ef4295fb48dbe2da05579064932c687e13b0cd58e689eddca6395948d` |

## 候选包与运行环境

| 项目 | 实测 |
| --- | --- |
| 候选包 | `@takboo/dsh-coopanion@0.4.22`，`dsh-coopanion-0.4.22.tgz` |
| 源码 | 干净提交 `c190a41e02987bf877e5bc0749d6bc2821efbec7` |
| tarball SHA-256 | `1fea3fd30a420b1166d0130716a2845e2372f335b0bf98a2b3000bc9e4e4909d` |
| tarball integrity | `sha512-5V8sAmOnIWI8aB94mW5afDI13MzUvDldAb8iVmQhuIQZxOGJWrI/KwjOqLSjRULIw+ZgCH9aDACEj9heI0j9wg==` |
| Tart 宿主 | macOS 27.2（26B123），ARM64，Tart 2.41.1 |
| 实验室与基线 | `shared-tart`，`dsh-sequoia-arm64-base-eee659985b01` |
| OCI 镜像 | `ghcr.io/cirruslabs/macos-sequoia-base@sha256:eee659985b01e4df2a6c0754bd8d25e54969933c43fdcd4edef8bea337b3d354` |
| 来宾 | `dsh-job-20261111T020413-17506`，macOS 15.7.7（24G720），ARM64 |
| npm DSH Host | `@deepseek-ai/dsh@0.2.2-rc.1`，`sha512-ijR9UEVYkG15Q/Q79JzvzLBzQOQfc63VLr9n6flpwHPhr5IKn2UxthnSoto/P9l7qGd7pPvI1Ra6TW7LH3oKpg==` |
| 来宾运行时 | Node 24.21.0，npm 11.19.1，Electron 44.7.0，Chromium 156.0.8078.4（Playwright revision 1248） |

入口从该源码构建一次候选包，并生成包校验文件和示例角色。npm registry 上同版本的 `dist.integrity` 与本地候选值不同。历史分发包的身份见[正式 0.4.22 核验](../../releasing.md#v0422)。

同一来宾在已登录 GUI 会话中执行。输入共享的写入探针返回 `EPERM`。来宾核对 `SHA256SUMS`、`verification.json`、Git HEAD 及包内 `dist/build-info.json` 的提交与 `dirty=false`，并将 npm DSH tarball 的 SHA-512 与项目目标、安装锁比对，同时确认实际安装版本和 CLI 入口字节。

## 安装断言与回收

- **npm DSH Host**在空 profile 中执行真实 `dsh plugin add`，自动启用 bundle 且没有兼容豁免。随后通过实际 profile Loader 启动，完成宿主契约、设置和偏好写入检查，Host 最终退出码为 0。
- **Coopanion Electron**打开可连接的原生桌宠窗口，关闭后通过 DSH 设置页重新打开。浏览器设置检查使用同一来宾内的 Chromium。
- `npm run test:install` 通过，阶段为 `admitted`、`host-contracts`、`web-settings-and-native-window`。来宾输出的断言如下。

```json
{
  "installed": true,
  "profileLoader": true,
  "nativeWindow": true,
  "closeAndRelaunch": true,
  "cleanShutdown": true,
  "riskExemption": false
}
```

runner 返回 `0`，记录 `guestReclaimed=dsh-job-20261111T020413-17506`。收尾复核显示该克隆和任务锁均已消失，实验室状态为 `ready=true busy=false`。

## 聚焦检查

- 配置预检 11 项通过，覆盖三层优先级、空值、无效目录、多行配置、origin 不符、tag 缺失和 SHA 不符。错误用例在生成结果目录或启动来宾之前退出。
- shell 与 Node 入口语法检查、`npm run verify:metadata`、10 项 `tests/release-checks.mjs`、候选包结构及 `SHA256SUMS` 检查通过。
- [0.4.21 历史报告](../shared-tart-install-20261110/report.md)中的个人目录替换为中性标识。原基座、包身份及试跑结果均保留。
