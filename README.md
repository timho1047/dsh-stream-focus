# dsh-stream-focus

[English](README.en.md) | 中文 | [Landing page](https://timho1047.github.io/dsh-stream-focus/)

在 DSH 内置的四档工作步骤展示模式上增强运行中的思考/工具展示。

## 各模式行为

| 模式 | 插件增强 |
|---|---|
| Compact / Standard | 自动展开当前过程组，形成限高、贴底、保持高度的运行窗口；切换行时自动收起旧窗口。 |
| Detailed | 当前轮次在官方容器内平铺，不伪造组级窗口；自动展开当前思考/工具行，并收起旧的自动展开行。 |
| Verbose | 平铺显示，自动展开当前思考/工具行，但不自动收起旧行，尊重“永远展开”的语义。 |

四档共享：思考正文逐字平滑、普通正文行级渐隐、新段落/列表/代码块淡入、自动操作不抢焦点。

- 思考流式输出时，自动展开当前思考行；官方过程组本身成为限高、内部自动贴底的窗口。
- 思考正文按 animation frame 平滑揭示；窗口内部滚动跟随使用官方 process scroll，插件不重复写 `scrollTop`，避免两套跟随互相抢滚动。
- 过程组首次自动展开时用约 180ms 的透明度淡入，窗口直接以真实高度出现，不再先折叠再展开。
- 运行中的窗口禁止横向溢出，并关闭过程组自带的上下渐隐遮罩，避免横向滚动条间歇出现、纵向滚动条被遮罩成半虚化。原生滚动条 thumb 在活动窗口内隐藏，右侧改用一条高度平滑过渡的 3px 进度线，避免内容按行增长时 thumb 一跳一跳地缩小。
- 活动窗口保持已经出现过的最大高度；思考切换到工具时只滚动内部内容，不再让外层会话因窗口变矮而回滚。
- 窗口底部有一层 16px 的轻渐隐，滚动跟随也更柔和，新行从底部淡入而不是硬切。
- 普通助手正文流式输出时，在消息根部加 20px 的底部行渐隐；输出结束后立即移除。
- 思考与普通正文中新出现的段落、列表、代码块会做一次 600ms ease-in 的透明度淡入（无位移）；逐字揭示会避开组合音标和 ZWJ emoji 边界。
- 普通正文增长和行展开/收起动画期间，会持续压住外层会话尾部，避免页面滞后一帧。
- 工具行自动展开不再以外层会话是否刚好贴底为前提；窗口展开期间会同步压住外层尾部，避免页面滞后一帧。
- 不添加自定义背景、边框、圆角或内边距，窗口外观完全沿用官方过程组。
- 自动展开时临时屏蔽标题按钮的 `focus()`；鼠标点击标题后也会移走焦点，不留下焦点环。键盘聚焦保持官方的可访问焦点行为。
- 思考结束、工具开始后，先收起刚才的思考窗，再展开当前工具行；切换前冻结窗口高度，外层总高度不变，上方内容不会下坠或被顶回。展开/收起带约 180ms 的高度和透明度过渡。并行工具会一起展开，包括独立的 Bash 行（`data-sample="bash"`）。
- 下一次思考开始时，自动收起上一批自动展开的思考/工具窗口，只保留新的思考窗。
- 手动打开的窗口不会被自动收起；手动关掉的组或行不会被强行重开。
- 外层会话离开底部时不主动滚动；窗口内部的滚动与贴底由官方 process scroll 负责。若没有读者手势、过渡前窗口在底部而过渡后官方 follow 意外丢失，插件会做一次单次自愈：滚回窗口底部并派发 `scrollend` 重新激活 follow。
- 一轮结束或卸载插件后，恢复官方展示。

## 演示

30fps、720p 的四档 MP4 演示（每段 12 秒）。GitHub README 不支持内嵌视频，点击封面会打开对应模式的 GitHub Pages 播放页。

| Compact | Standard |
|---|---|
| [![Compact](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/compact.jpg)](https://timho1047.github.io/dsh-stream-focus/#compact) | [![Standard](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/standard.jpg)](https://timho1047.github.io/dsh-stream-focus/#standard) |
| **Detailed** | **Verbose** |
| [![Detailed](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/detailed.jpg)](https://timho1047.github.io/dsh-stream-focus/#detailed) | [![Verbose](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/verbose.jpg)](https://timho1047.github.io/dsh-stream-focus/#verbose) |

[打开全部演示](https://timho1047.github.io/dsh-stream-focus/)

## 边界

- 纯客户端展示增强：不写 Session、不发网络请求、不接触凭据、不注册模型工具。
- 零设置、零持久化。插件面板里启用/禁用就是总开关。
- 过程组的展开/折叠读取官方 Chat 的语义 DOM 标记来驱动；思考正文通过官方 `conversation.chat.reasoning.body` Slot 和 `conversation.chat.reasoning.content` Factory 包装，不复制 Markdown 渲染器。窗口高度与样式由插件维护；内部滚动跟随使用官方 process scroll，插件不重复写 `scrollTop`。官方改这些属性或 Slot 契约时，这里需要同步更新。
- 仅对正在运行的轮次生效；历史轮次保持各模式自己的官方折叠方式。

## 安装

```bash
dsh plugin --profile web add dsh-stream-focus
```

安装后刷新浏览器页面，四档模式下都会生效。

## 已知限制

- 依赖 ui-chat 的语义 DOM（`data-chat-group-key`、`data-variant="think"`、`data-tool`、`data-sample="bash"`、`data-disclosure-row`、`data-chat-running`、`data-chat-following-tail`）。上游属性改名时插件会静默不生效，需要跟进。
- 只有 Compact / Standard 有官方过程组，窗口高度沿用其 `min(400px, 50vh)`；Detailed / Verbose 保持官方平铺结构，不添加组级限高。
- 插件自动切换行时，思考和工具行的展开/收起使用约 180ms 的高度 + 透明度过渡；手动点击行仍沿用官方即时切换。过程组首次出现使用 180ms 透明度淡入。
- 字符平滑会带来约 100ms 的视觉延迟；流式期间显示的是思考原文的可见前缀，结束后立即切回完整文本。复制正在流式输出的内容时会得到当前可见前缀。
- 普通助手正文没有官方 Content Factory，因此采用行级底部渐隐，而不是逐字 pacing；真正的逐字平滑需要官方增加一个正文 Factory。

## 致谢

本插件的开发受到 [dsh-streamfold](https://github.com/rezon-aki/dsh-streamfold) 的启发。感谢 [@rezon-aki](https://github.com/rezon-aki) 的探索与实现。

## 开发

```bash
pnpm install
pnpm run verify   # typecheck + build + 51 个测试
```

- `src/client/decision.ts`：纯状态机，决定本轮窗口应该打开/关闭哪些行。
- `src/client/conductor.ts`：Compact / Standard 的过程组窗口、贴底与滚动缓动。
- `src/client/flat-rows.ts`：Detailed / Verbose 的平铺行自动展开。
- `src/client/mode-policy.ts`：四档模式解析与 conductor 选择。
- `src/client/paced-body.tsx`：替换 reasoning Body Slot，通过官方 Content Factory 平滑揭示思考正文。
- `src/client/normal-smoothing.ts`：普通正文行级渐隐与新块淡入。
- `src/client/pacing.ts`：字符揭示与滚动缓动的纯数学。
- `tests/`：模式策略、状态机、节奏计算、jsdom 交互测试。
