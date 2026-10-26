# Changelog

所有重要变更都记录在这里；每个版本中文版在上，英文版在下。

All notable changes are documented here. Each release has Chinese first, English below. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-10-26

### 中文

#### 变更

- 架构整理：follow intent/修复集中到 `FollowSteward`，DOM 语义契约集中到 `LiveTranscript`，行 ownership/click 集中到 `RowDisclosureController`，进度线抽成 `ProcessProgress`。
- 自动 disclosure 在支持 `interpolate-size` 的浏览器中改用 CSS `0 → auto` 尺寸过渡，减少 JS 每帧写 height；不支持时保留 WAAPI 回退。

### English

#### Changed

- Architecture cleanup: follow intent/repair now lives in `FollowSteward`, the semantic DOM contract in `LiveTranscript`, row ownership/click policy in `RowDisclosureController`, and the progress line in `ProcessProgress`.
- Automatic disclosures now use a native CSS `0 → auto` size transition where `interpolate-size` is supported, reducing per-frame JS height writes; browsers without support keep the WAAPI fallback.

## [0.1.2] - 2026-10-19

### 中文

#### 新增

- 思考正文与普通正文新增 CSS Custom Highlight 字符级淡入，使用 Range 标记字素，不插入 span、不修改 Markdown DOM。
- 思考揭示速度按实际帧时间归一化，60Hz 与 120Hz 下保持接近的追平时间。

#### 变更

- 活动窗口的自定义进度线改用 rAF 时间常数缓动，避免高频换行时反复重置 CSS transition。
- 重新录制四档演示，完整保留居中输入框和开场思考，并在模型完成后停止。

#### 修复

- Detailed / Verbose 的外层会话 follow 在自动行切换和工具展开动画结束后重新计时并做单次重挂，避免布局变化被误判为读者滚动。
- 当内容在原生 smooth follow 结束前继续增长时，在 `scrollend` 后以及内容增长后的延迟窗口内做单次重挂，避免 follow intent 被误判为读者滚动，并覆盖浏览器不触发 `scrollend` 的情况。

### English

#### Added

- Character-level fading for reasoning and normal prose through the CSS Custom Highlight API, using grapheme ranges without DOM spans or Markdown changes.
- Reasoning reveal speed is normalized by elapsed frame time, keeping catch-up latency consistent at 60Hz and 120Hz.

#### Changed

- The active-window progress line now eases with an rAF time constant instead of repeatedly restarting a CSS transition on every line change.
- Re-recorded all four demos with the centered composer and full opening reasoning, stopping when the model finishes.

#### Fixed

- Added a delayed one-shot outer-transcript re-anchor that restarts after automatic row and tool-expansion motion in Detailed / Verbose, so layout changes are not mistaken for reader scrolling.
- When content grows again before native smooth follow ends, re-anchor once after `scrollend` and after a short growth-settle window, covering browsers that do not emit a usable `scrollend`.

## [0.1.1] - 2026-10-19

### 中文

#### 新增

- Qwen 风格淡入：新流式到达的段落、列表和代码块以 `opacity 0 → 1`、`600ms ease-in` 淡入，无位移。
- 活动过程窗口右侧新增 3px 平滑进度线，替代原生滚动条 thumb；后者在内容按行增长时高度会闪烁。
- 新增中英双语项目落地页，包含 GitHub Pages 上的 30fps 模式演示。

#### 变更

- 思考结束时先收起旧行，等收起完成后再展开工具行，不再同时改变两行高度。
- 行与行切换前冻结活动窗口高度，确保外层会话的 floor 不变。
- 窗口内部滚动与贴底改用 DSH 官方 `useProcessScroll`；插件不再维护第二套竞争的 `scrollTop` 循环。

#### 修复

- 修复 Think 块折叠时上方内容下坠、工具块展开时又被顶回的问题。
- 移除重复的 follow 循环，避免工具展开卡顿或底部跟随中断。
- 当切换前窗口在底部、无读者手势且 follow 因内容增长/scrollend 竞态丢失时，重新激活官方 process follow。
- 改善落地页文字对比度。

### English

#### Added

- Qwen-style fade for newly streamed paragraphs, lists, and code blocks: opacity `0 → 1` over `600ms ease-in`, without movement.
- Smooth 3px progress line in the active process window, replacing the native scrollbar thumb whose height flickered as content grew by line.
- Bilingual project landing page with 30fps mode demos on GitHub Pages.

#### Changed

- When thinking ends, close the old row first and open the tool row after the close completes, instead of changing both heights at the same time.
- Freeze the active window height before a row-to-row transition so the outer transcript floor does not move.
- Inner window scrolling and bottom-following now use DSH's official `useProcessScroll`; the plugin no longer writes a second, competing `scrollTop` loop.

#### Fixed

- Content above the window no longer drops when the Think block collapses or gets pushed back when the tool block expands.
- Removed duplicate follow loops that could stutter during tool expansion or interrupt bottom-following.
- Re-arm official process follow after a transition when the window was at the bottom, no reader gesture occurred, and follow was lost to the content-growth/scrollend race.
- Improved landing page text contrast.

## [0.1.0] - 2026-10-19

### 中文

#### 新增

- 首次发布 `dsh-stream-focus`。
- 支持 DSH 全部四种工作步骤展示模式：Compact / Standard 自动展开带高度上限的过程窗口，并保持高度高水位和外层尾部守卫；Detailed / Verbose 自动展开当前平铺过程行。
- 自动展开当前思考行和工具行，包括独立的 Bash 行。
- 思考正文按动画帧逐字揭示，并保持 grapheme 边界安全。
- 普通助手正文行级渐隐，新块淡入。
- 自动 disclosure 使用约 180ms 高度 + 透明度过渡。
- 自动点击不抢焦点、尊重手动选择、保持原生窗口外观、抑制横向滚动条，并提供 reduced-motion 回退。
- 零设置、不写 Session、不发网络请求、不注册模型工具。
- 提供 npm 包、MIT 许可证和 GitHub Pages 项目页。

### English

#### Added

- Initial release of `dsh-stream-focus`.
- Support for all four DSH Work details modes: Compact / Standard auto-open a capped process window with height high-water and outer-tail guarding; Detailed / Verbose automatically expand current flat process rows.
- Automatic expansion of the current reasoning and tool row, including standalone Bash rows.
- Character-paced reasoning reveal with animation-frame catch-up and grapheme-safe boundaries.
- Line-level fade for normal assistant prose and fade-in for new blocks.
- ~180ms height + opacity transitions for automatic row disclosures.
- Focus-safe automatic clicks, manual-choice preservation, native window chrome, horizontal scrollbar suppression, and reduced-motion fallbacks.
- Zero settings, no Session writes, no network requests, and no model tools.
- npm package, MIT license, and GitHub Pages project page.

[0.1.3]: https://github.com/timho1047/dsh-stream-focus/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/timho1047/dsh-stream-focus/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/timho1047/dsh-stream-focus/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/timho1047/dsh-stream-focus/releases/tag/v0.1.0
