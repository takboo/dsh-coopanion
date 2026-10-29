# macOS 隔离测试机

用于 Electron、原生交互和实际 Harness 安装测试。VM 结果与物理多屏、真实键盘、长期资源和用户体验分别结算。

## 已有环境与操作

`scripts/macos-vm.sh` 复用仓库既有的项目专属 Tart 控制入口，只管理 `.local/macos-vm/tart` 下的 `dsh-macos15-test`／`dsh-macos15-base`。该目录含持久磁盘和 SSH 身份；`.cache/tools/tart/2.40.1/tart.app` 是已准备的运行时，使用前核对。创建时的 `.local/macos-vm/provisioning.json` 不是实时状态。

```bash
bash scripts/macos-vm.sh status
bash scripts/macos-vm.sh start
bash scripts/macos-vm.sh exec 'sw_vers'
bash scripts/macos-vm.sh stop
```

start 前要求宿主至少 60 GiB 空闲且本项目没有运行中的 VM；默认测试机，以默认 NAT 运行，关闭宿主窗口、目录、剪贴板、音频和 USB 共享。SSH 使用专用 key 和严格 known_hosts，不转发 Agent。已有测试机正在运行时先核对其进程和工作区，不重启或覆盖已有测试。只有本轮启动的实例才默认在结束后停机。

## 每轮测试

1. 核对实际来宾 OS、Node／npm、旧 checkout 状态和锁摘要。为当前工作另建 `~/dsh-testing/little-deep-api2-<date>.<unique>`，不覆盖旧 checkout。
2. 只传明确选择的源码与构建产物，排除宿主配置、凭证、业务文件和 node_modules。记录源提交／未提交文件摘要、插件 tgz 和角色 ZIP 摘要。相同产物用于安装与实测。
3. 按当前锁准备来宾依赖；浏览器和 Electron 使用已核对的实际版本，原生操作串行。使用独立 DSH_HOME／profile 和桌宠数据目录，保持正常角色沙箱。
4. 回归包括 Model、状态扩展、既有角色、`test:inbox-ui`，再测实验包导入、原生尺寸／命中、请求进出与工作续接。受控 IPC、实际安装、真实 provider 模型调用分别标识。
5. 本轮临时 provider 凭证只进入测试进程环境，profile 保存环境变量名引用，不保存密钥；凭证不进入源码、命令输出、报告和截图。完成后结束本轮进程，不改宿主既有凭证。原始会话留在隔离目录，不复制正文／推理到报告。
6. 结果取回新的 artifacts 子目录，报告实际包、宿主、源码身份和缺口。清理只针对本轮可重建临时文件；保留旧 VM、密钥、唯一证据和用户数据。

当前入口见[设计接手](design/README.md)，实验角色见[包说明](../examples/little-deep/README.md)。临时模型用于验证真实事件路径，不改变共享完成语义或向角色沙箱传递凭证。

首轮安装、受控原生场景与真实模型结果见[API 2 接入记录](design/little-deep-api2-validation.md)。
