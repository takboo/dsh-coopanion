# 小湛当前设计与接手

更新于 2026-10-29。本分支 `codex/little-deep-livelings` 制作独立浏览器角色原型。Harness、API 2、NPC 和原生窗口尚未接入；产品文档描述现有大肥鱼插件。`codex/aliveness-foundation` 是另一条未合并路线。

## 当前基线与下一步

**观看入口：[集中工作／生活连续对照](art-workflow/whale-little-deep-v3/work-life-study.html)。** 工作收鳍潜入，密集工具与短思考保持尾巴段，汇报和请求时浮出；生活保留完整鲸鱼，舒展、探看、露腹、追泡泡与休息。两段同机位、同配色、同尺度，24 秒示例结束后继续循环。

用户已确认 `?`、`!` 的出场、结算退场与基本交互，并于 2026-10-29 对工作／生活样片反馈“整体观感可以”。这些作为当前表演基线；连续观看能区分工作与生活，汇报与安静生活的个别静态姿态仍接近。

**下一步：按分镜 → 连续样片 → 观看反馈，增强生活交互、藏身与恢复。** 具体触发、藏身程度及回到生活的方式尚待制作；保持已通过的工作段和请求表演。异常／停止、目标完成候选与正式产品接入分别推进。

| 范围 | 状态与权威说明 |
| --- | --- |
| 集中工作、生活与请求续接 | [当前分镜](storyboards/little-deep-work-life-v0.md)，整体样片已确认 |
| 提问 `?`、审批 `!` | [提问](storyboards/little-deep-work-v0.md)、[审批](storyboards/little-deep-approval-v0.md)，局部样片已确认 |
| 目标完成 | [独立候选](storyboards/little-deep-completion-v0.md)，尚未获体验确认，未串入当前工作／生活页 |
| 真实会话结构、双时钟、请求身份 | [会话观察说明](session-observation.md)，机制参照，使用旧表面动作 |
| 生活交互／藏身、异常与停止 | 待分镜；原动作库中的实现不等于新场景已确认 |
| Harness、API 2、NPC、原生窗口 | 尚未接入，不由浏览器样片或日志回放结算 |

## 固定造型

- 蓝色、白腹、额顶缺口、**B 大小眼基准**及原生眨眼保留；神态渐变不强求对视。
- 完整鲸鱼与思考尾巴共用实心尾鳍，短弯尾柄连接；扫摆、展开与侧转收窄保留。
- 额外腹鳍、尾柄旁新增小头及弯弯白斑眼型已舍弃。
- 侧倾作用于整只鲸鱼；没有独立头关节、正脸或全方向造型。

## 制作与实现入口

先按[角色产出工作流](character-production-workflow.md)核对能力、画分镜和同源关键姿态，再用连续样片评审。事件 → 意图 → 持续表演分层；潜水表示集中工作，不以固定秒数判断长考。请求保留完整身份，等待冻结工作续点，退出接最新阶段；新工作取消旧生活计划。

| 修改目标 | 源码 |
| --- | --- |
| 当前工作／生活持续编排 | [segment-performance.js](art-workflow/whale-little-deep-v3/segment-performance.js) |
| 24 秒分镜 cue 与查看控制 | [work-life-performance.js](art-workflow/whale-little-deep-v3/work-life-performance.js)、[work-life-study.js](art-workflow/whale-little-deep-v3/work-life-study.js) |
| 已确认请求身体、笔画与身份交接 | [request-performance.js](art-workflow/whale-little-deep-v3/request-performance.js)、[storyboard-performance.js](art-workflow/whale-little-deep-v3/storyboard-performance.js)、[storyboard-symbol.js](art-workflow/whale-little-deep-v3/storyboard-symbol.js) |
| 造型、尾巴、原动作素材与检查命令 | [原型说明](art-workflow/whale-little-deep-v3/README.md) |

## 本地预览

在仓库根目录运行，已有服务时复用：

```bash
python3 -m http.server 4187 --bind 127.0.0.1 --directory docs/design/art-workflow
```

打开 `http://127.0.0.1:4187/whale-little-deep-v3/work-life-study.html`。可暂停、重播、定位、遮住文字，手动插入／结算模拟请求，改变等待期间的最新工作阶段，观察生活退让与重排。所有 cue 均为分镜模拟。

[提问交接](art-workflow/whale-little-deep-v3/request-study.html)、[审批交接](art-workflow/whale-little-deep-v3/approval-study.html)用于复查已确认局部表演。[原动作页](art-workflow/whale-little-deep-v3/index.html)用于查能力，旧藏尾和一次性抚摸仍须单独评审。旧回放与观察工具按[会话观察说明](session-observation.md)使用。

## 资料边界

产品事实来源为 [PetModel](../../src/model.ts)、[请求 Broker](../../src/notification-broker.ts)和[完成判断](../../src/completion.ts)。浏览器样片不发答复或审批。自动化、浏览器画面、用户体验和产品宿主结果分别记录；检查入口集中在[原型说明](art-workflow/whale-little-deep-v3/README.md#检查)。

被取代的过程稿、旧潜水映射和分镜沿革从[历史索引](../archive/README.md)按需读取；其中的“当前”和“下一步”仅属于快照时间。固定证据、第三方许可和原始素材保留原字节。当前执行范围以用户最新要求为准。
