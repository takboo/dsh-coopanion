# `src/` 源码目录说明

本目录包含 Coopanion 插件的 Host（Node／Cordis）、Browser Client（DSH Web 设置与通知集成）及角色包校验源码；编译产物输出到 `dist/`（由 [`scripts/build.mjs`](../scripts/build.mjs) 生成）。

## 顶层模块（Host 与共享逻辑）

| 文件 | 职责 |
|---|---|
| [`index.ts`](index.ts) | Cordis 插件主入口，挂载设置、会话／通知路由、桌宠桥接与生命周期 |
| [`bridge.ts`](bridge.ts) | Host 与原生 Electron 桌宠子进程间的 IPC 桥接与状态推送 |
| [`model.ts`](model.ts) | 桌宠状态机、情绪／流式口型、会话快照与结果收件箱模型 |
| [`completion.ts`](completion.ts) | 共享任务完成语义判定（目标投影与会话事件），区分接受回执与任务完成 |
| [`chat.ts`](chat.ts) | 从桌宠面板续接 Harness 会话、查询历史会话与发送提示词 |
| [`controls.ts`](controls.ts) | 桌宠启停、显示／隐藏、有限重启与运行时失败状态编排 |
| [`desktop-lifecycle.ts`](desktop-lifecycle.ts) | Host 与原生进程的共享生命周期契约及可恢复错误类型 |
| [`electron-runtime.ts`](electron-runtime.ts) | Electron 首次准备、运行时定位与脱敏安装失败分类 |
| [`figure-server.ts`](figure-server.ts) | 仅监听 `127.0.0.1` 的本地角色静态资源、角色包与陪伴数据服务 |
| [`character-store.ts`](character-store.ts) | 社区角色包（ZIP）安全解包、校验、持久化与列表管理 |
| [`companion-store.ts`](companion-store.ts) | 自主陪伴状态、邀请与关系存档的持久化读写 |
| [`notification-contract.ts`](notification-contract.ts) | Host 与各视图共享的 N0 通知协议、偏好与回执 Zod 契约 |
| [`notification-broker.ts`](notification-broker.ts) | 聚合任务通知、审批／提问待办、去重与多端投递认领 |
| [`diagnostics.ts`](diagnostics.ts) | 仅本地访问的诊断状态与采样 HTTP 接口及元数据落盘 |

## `src/client/`（DSH Web Client 模块）

| 文件 | 职责 |
|---|---|
| [`client/index.ts`](client/index.ts) | DSH 浏览器端插件注册入口，挂载设置页、样式、语言同步与系统通知 |
| [`client/Settings.tsx`](client/Settings.tsx) | Harness **Settings → 桌宠** React 设置面板与运行时状态／重试界面 |
| [`client/settings.css`](client/settings.css) | 设置面板样式表（内联注入到 DSH Web 页面） |
| [`client/styles.d.ts`](client/styles.d.ts) | `*.css` 文本导入的 TypeScript 模块声明 |
| [`client/locales.ts`](client/locales.ts) | 设置面板中／英文界面文案字典 |
| [`client/locale-sync.ts`](client/locale-sync.ts) | 监听 Harness 当前语言并同步给桌宠运行时的退避同步器 |
| [`client/notification-client.ts`](client/notification-client.ts) | 通过已鉴权 DSH Connection 订阅通知状态并回传投递／交互回执 |
| [`client/notification-copy.ts`](client/notification-copy.ts) | 系统通知标题与正文的多语言文案构造 |
| [`client/system-notifications.ts`](client/system-notifications.ts) | 浏览器／桌面系统通知发送与点击聚焦回执封装 |

## `src/upstream/`（上游角色包协议）

| 文件 | 职责 |
|---|---|
| [`upstream/packs.ts`](upstream/packs.ts) | API 2 角色包 `figure.json` 清单校验与安全路径解析 |
