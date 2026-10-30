# 小湛当前设计与接手

更新于 2026-10-30。本分支 `codex/little-deep-api2` 在已确认的 `codex/little-deep-livelings` 表演基线上制作实验性 API 2 接入；状态传递、角色包及虚拟机验证按下文记录。现有大肥鱼及旧角色继续兼容。`codex/aliveness-foundation` 是另一条未合并路线。

## 当前基线与下一步

**观看入口：[集中工作／生活连续对照](art-workflow/whale-little-deep-v3/work-life-study.html)。** 工作收鳍潜入，密集工具与短思考保持尾巴段，汇报和请求时浮出；生活保留完整鲸鱼，舒展、探看、露腹、追泡泡与休息。两段同机位、同配色、同尺度，24 秒示例结束后继续循环。

用户已确认 `?`、`!` 的出场、结算退场与基本交互，并于 2026-10-29 对工作／生活样片反馈“整体观感可以”。这些作为当前表演基线；连续观看能区分工作与生活，汇报与安静生活的个别静态姿态仍接近。

**当前成果：已修复所有角色的统一投掷入口，以及小湛的掉落、工作触摸和朝向，并提供工具执行及角色 UI 皮肤候选。** [0.0.2 分镜](storyboards/little-deep-api2-feedback-v1.md)与[本轮验证](little-deep-feedback-validation.md)为当前入口，新观感待用户确认。首轮[API 2 记录](little-deep-api2-validation.md)保留原事件链范围，不能用来结算本轮体验。

新 session 的工作表演曾绑定旧的聊天目标，现已将表演来源与发送目标分开，选中会话空闲时自动呈现正在工作的会话；0.0.2 角色包保持原字节。复现、验证及安装范围见[新会话工作状态修复](little-deep-session-source-validation.md)。2026-10-30 用户新建真实 session 后确认开工潜水、工具段及 `?`、`!` 工作续接正常，见[实机体验记录](little-deep-real-session-acceptance.md)。此前手动选中测试会话的记录不覆盖这条普通使用路径。

当前源码已 rebase 到 `origin/main` 的 `5468414`（v0.4.15），保留本分支全部 13 个开发提交。组合后的聊天、小湛与原生生命周期回归见[主分支同步记录](little-deep-session-source-validation.md#2026-10-30-主分支同步)。实机体验记录仍对应此前安装的固定包，不能当作此次组合源码已经重新实机验收。

**生活续做候选：[生活交互分镜](storyboards/little-deep-life-touch-v0.md)与[16 秒连续样片](art-workflow/whale-little-deep-v3/life-touch-study.html)。** 已制作靠近、轻触、持续抚摸与松手余韵，支持手动体验及请求／工作接管，尚待观看反馈。生活交互反馈及藏身／隐身分镜安排在本轮接入之后，其触发和表现待后续确认。已通过的工作／请求基线保留；异常／停止、目标完成和产品接入分别推进。

| 范围 | 状态与权威说明 |
| --- | --- |
| 集中工作、生活与请求续接 | [当前分镜](storyboards/little-deep-work-life-v0.md)，整体样片已确认 |
| 提问 `?`、审批 `!` | [提问](storyboards/little-deep-work-v0.md)、[审批](storyboards/little-deep-approval-v0.md)，局部样片已确认 |
| 目标完成 | [独立候选](storyboards/little-deep-completion-v0.md)，尚未获体验确认，未串入当前工作／生活页 |
| 真实会话结构、双时钟、请求身份 | [会话观察说明](session-observation.md)，机制参照，使用旧表面动作 |
| 生活交互 | [新候选](storyboards/little-deep-life-touch-v0.md)，分镜与连续样片已制作，尚待观看 |
| 藏身／隐身、异常与停止 | 待分镜；原动作库中的实现不等于新场景已确认 |
| 宿主状态扩展、API 2、原生窗口 | 新会话来源修复的[自动化与安装](little-deep-session-source-validation.md)、[真实 session 体验确认](little-deep-real-session-acceptance.md)已分别记录；此前 0.0.2 交互与 UI 见[反馈记录](little-deep-feedback-validation.md)，其他体验范围继续分别确认 |
| NPC 自主策略 | 首轮未接入；生活表演不自动启用日常调度 |

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
| 生活交互候选与模拟输入 | [life-touch-performance.js](art-workflow/whale-little-deep-v3/life-touch-performance.js)、[life-touch-film.js](art-workflow/whale-little-deep-v3/life-touch-film.js)，可选生活表演接管不改默认工作段 |
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

产品事实来源为 [PetModel](../../src/model.ts)、[请求 Broker](../../src/notification-broker.ts)和[完成判断](../../src/completion.ts)。浏览器样片不发答复或审批；实验包只消费最小状态，正式请求与决定由 Harness 拥有。自动化、浏览器画面、用户体验和产品宿主结果分别记录；检查入口集中在[原型说明](art-workflow/whale-little-deep-v3/README.md#检查)。

被取代的过程稿、旧潜水映射和分镜沿革从[历史索引](../archive/README.md)按需读取；其中的“当前”和“下一步”仅属于快照时间。固定证据、第三方许可和原始素材保留原字节。当前执行范围以用户最新要求为准。
