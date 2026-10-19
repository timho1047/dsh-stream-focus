# dsh-stream-focus 宣传片 · B站发布包

## 文件

- `dsh-stream-focus-promo-58s.mp4`：1920×1080，30fps，H.264 + AAC，约 58 秒
- `dsh-stream-focus-cover-1146.png`：B站推荐 16:9 封面上传尺寸
- `dsh-stream-focus-cover-1920.png`：1920×1080 母版
- `dsh-stream-focus-endcard.png`：片尾品牌画面
- `dsh-stream-focus.srt`：与视频旁白对应的字幕文件

## 标题候选

1. 流式输出，不该打断思考｜DSH 插件 dsh-stream-focus
2. 我给 DSH 做了一个流式输出插件：让模型思考不再跳动
3. 让 AI 的思考像呼吸一样自然｜开源 DSH 插件

推荐第 1 个：前半句是钩子，后半句带产品名，适合搜索与推荐流。

## 简介

流式输出本来应该像呼吸一样自然，而不是在每一次换行时重新寻找视线。

这是我为 DeepSeek Harness 开发的客户端插件 dsh-stream-focus：
- 字符级 CSS Highlight 淡入，不插入 span，不替换 Markdown
- 思考、工具和模式切换保持稳定，不打断阅读
- Compact / Standard / Detailed / Verbose 四档模式
- 零设置、零持久化、纯客户端、开源 MIT

视频里的四档画面都是真实运行录屏，没有用假 UI。

时间轴：
00:00 流式输出，本该自然
00:06 窗口跳动的问题
00:12 Standard 真实运行画面
00:23 机制：不接管渲染
00:30 四档模式真实画面
00:36 零设置、开源、安装
00:44 品牌与 CTA

GitHub:
https://github.com/timho1047/dsh-stream-focus

npm:
https://www.npmjs.com/package/dsh-stream-focus

安装：
dsh plugin --profile web add dsh-stream-focus

音乐为原创合成配乐；旁白使用 Mimo TTS；视频由 Remotion 渲染。

## 标签

AI、DeepSeek、DSH、DeepSeek Harness、AI编程、开源、插件、前端开发、流式输出、效率工具、独立开发、Remotion

## 上传设置

- 类型：自制
- 分区：科技 → 计算机技术
- 封面：`dsh-stream-focus-cover-1146.png`
- 字幕：上传 `dsh-stream-focus.srt`，或关闭自动字幕（画面已烧录中文字幕）
- 清晰度：上传原片，保留 1080p / 30fps
- 简介：可直接使用上方文本，按 B站简介长度限制删减标签链接

## 版权说明

- 视频素材来自本项目自己的运行录屏
- 配乐为本次原创合成，不使用第三方音乐
- 旁白由 Mimo TTS 生成
- Remotion 使用场景为个人开源项目；发布前确认 Remotion 官方许可证仍然适用
