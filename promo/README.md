# dsh-stream-focus 宣传片

本目录包含 B站宣传片成片、封面、上传文案，以及可编辑的 Remotion 源码。

## 最终交付物

全部在 [`final/`](final/)：

- `dsh-stream-focus-promo-58s.mp4`：1920×1080，30fps，58 秒，H.264 + AAC
- `dsh-stream-focus-cover-1146.png`：B站 1146×717 封面上传图
- `dsh-stream-focus-cover-1920.png`：封面母版
- `dsh-stream-focus-endcard.png`：片尾品牌画面
- `dsh-stream-focus.srt`：与旁白对应的中文字幕
- `bilibili.md`：标题、简介、标签、分区和上传设置

成片与封面的画面均来自本项目真实运行录屏。配乐为原创合成，旁白由 Mimo TTS 生成。

## 修改视频

Remotion 工程在 [`remotion/`](remotion/)：

```bash
cd promo/remotion
npm install
npm run sync-assets
npm run dev
```

成片渲染：

```bash
npm run render:full
ffmpeg -i out/dsh-stream-focus-promo.mp4 \
  -c:v copy \
  -af "afade=t=out:st=55.0:d=3.0,loudnorm=I=-16:TP=-1.5:LRA=9" \
  -c:a aac -b:a 192k -movflags +faststart \
  ../final/dsh-stream-focus-promo-58s.mp4
```

`public/demo/` 从 `docs/demo/` 同步，不提交重复的演示视频。Mimo API key 不在仓库中；重新生成旁白时从本地 `.scratch/mimo.key` 读取。

## 发布

B站建议上传 `final/dsh-stream-focus-promo-58s.mp4`，封面使用 `final/dsh-stream-focus-cover-1146.png`，字幕上传 `final/dsh-stream-focus.srt`。具体标题、简介和标签见 `final/bilibili.md`。
