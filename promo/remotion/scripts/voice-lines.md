# Voiceover source

Mimo TTS call used for the final film:

- Base URL: `https://api.xiaomimimo.com/v1`
- Model: `mimo-v2.5-tts`
- Voice: `冰糖`
- Format: WAV, 24 kHz mono, trimmed to remove leading/trailing silence
- Key: read from the local `.scratch/mimo.key`; never commit the key

Style instruction:

> 温柔、清晰、克制的科技纪录片女声，成年女性，声音干净有质感，语速中等偏慢，句间留白，不播音腔，不夸张煽情。

Lines:

1. 流式输出，本来应该像呼吸一样自然。
2. 可当内容不断变高，窗口开始跳动，视线也被打断。
3. 我们没有让模型更快，只是让每一次出现，都落在它该在的位置。
4. 字符以六百毫秒淡入，不是突然砸在屏幕上。
5. 滚动跟随，交给 DSH 自己；窗口稳定，进度线轻轻收束。
6. 紧凑、标准、详细、逐字。四种模式，同一个节奏。
7. 不替换 Markdown，不接管渲染，零设置，纯客户端。
8. 安装，也只需要一行命令。
9. 思考、工具、切换，都不再打断你的阅读。
10. DSH Stream Focus，让思考，流动起来。
