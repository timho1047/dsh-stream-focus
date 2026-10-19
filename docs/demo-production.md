# 演示视频制作流程

本文记录 `docs/demo/` 四段模式演示的录制、裁剪、转码、页面同步和发布流程。目标是让另一个 agent 能在不重新设计流程的情况下更新 demo。

## 产出

```text
docs/demo/compact.mp4
docs/demo/compact.jpg
docs/demo/standard.mp4
docs/demo/standard.jpg
docs/demo/detailed.mp4
docs/demo/detailed.jpg
docs/demo/verbose.mp4
docs/demo/verbose.jpg
```

当前标准：

- 四档各一段，模式分别为 Compact、Standard、Detailed、Verbose
- `1080×778`，30fps，无音频
- 从空会话的居中输入框开始录制
- 完整包含开场思考
- 模型输出完成后约 1.5 秒停止，不留静止长尾
- 封面取思考阶段画面，不能只截工具结果

## 前置条件

- macOS
- DSH Web 跑在 `http://127.0.0.1:3080`
- 插件以本地 link 或已发布版本启用
- 四档 Work details 可切换
- `screencapture`、`ffmpeg`、`ffprobe`
- ImageMagick 的 `magick`（用于帧差和拼图检查）
- `gh`（发布后校验 GitHub Pages）

## 1. 备份旧视频

```bash
cd /Users/timho/Development/dsh/dsh-plugins/dsh-stream-focus
mkdir -p .scratch/demo/old .scratch/demo/raw .scratch/demo/work
cp docs/demo/*.mp4 docs/demo/*.jpg .scratch/demo/old/
```

`.scratch/` 不进 git；发布前不要把原始录屏提交进去。

## 2. 录制前准备

每个模式使用一个**新的空会话**，不要复用已有长对话。

1. 打开 Settings → General → Work details，选择本次要录的模式。
2. 点 New Session。
3. 在输入框输入下面的固定 prompt：

```text
请先进行一段较长的思考，至少 8 到 10 句，分析如何分三步验证当前环境，并说明每一步的目的。然后依次执行三个独立的 Bash 调用：第一步 sleep 2; echo step-1；第二步 sleep 2; echo step-2；第三步 sleep 2; echo step-3。必须逐个执行，等上一个完成后再执行下一个，不要并行。每步之后简短说明结果，最后总结。不要修改任何文件。
```

4. 输入后先不要发送。
5. 折叠左侧 sidebar，隐藏右下角小鲸鱼，避免录进与插件无关的 UI。
6. 确认当前模式标题正确，输入框位于视口中间。
7. 确认 system prompt 不会让模型把 `<think>` 标签输出到正文。发现标签就停止录制，换新会话或先修正 system prompt。

隐藏 sidebar 和鲸鱼可以在浏览器控制台执行：

```js
document.querySelector('.dshwv-root')?.style.setProperty('display', 'none')
document.querySelector('button[aria-label="Collapse sidebar"]')?.click()
```

录制结束或放弃录制后要恢复：

```js
document.querySelector('.dshwv-root')?.style.removeProperty('display')
document.querySelector('button[aria-label="Open sidebar"]')?.click()
```

## 3. 开始录制

先找到 Chrome 窗口 ID：

```bash
swift - <<'SWIFT'
import CoreGraphics
let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in info where (w[kCGWindowOwnerName as String] as? String) == "Google Chrome" {
  print(w[kCGWindowNumber as String] as? Int ?? -1, w[kCGWindowName as String] as? String ?? "")
}
SWIFT
```

选择标题为 DSH 的窗口。先开始录屏，再按 Enter，这样能保留居中输入框：

```bash
screencapture -x -l<WINDOW_ID> -v -V 42 .scratch/demo/raw/standard-full.mov
```

按下 Enter 发送 prompt。等 42 秒录屏自动结束。

四档分别重复一次，输出：

```text
.scratch/demo/raw/compact-full.mov
.scratch/demo/raw/standard-full.mov
.scratch/demo/raw/detailed-full.mov
.scratch/demo/raw/verbose-full.mov
```

## 4. 检查录屏

至少检查每段的三帧：

- `0.5s`：居中输入框完整入镜，左右留白接近
- `5–6s`：思考内容已经开始，正文没有 `<think>` 标签
- 最后一帧：模型已经完成，不能还在生成，也不能留下长时间静止画面

抽帧：

```bash
ffmpeg -ss 0.5 -i .scratch/demo/raw/standard-full.mov -frames:v 1 .scratch/demo/work/standard-start.png
ffmpeg -ss 5.5 -i .scratch/demo/raw/standard-full.mov -frames:v 1 .scratch/demo/work/standard-think.png
```

### 画幅校准

当前窗口和布局下的参考值（`screencapture` 输出为 `1966×1216`）：

```text
crop=1250:900:470:250
```

含义：

- 以居中输入框为水平中心
- `y=250` 保留思考区和底部输入框
- `height=900` 容纳从空状态输入框到思考/工具区的内容

这个坐标依赖浏览器窗口尺寸。换了窗口大小后必须重新校准：

- 第一帧必须完整看到输入框左右边缘
- 左边不能贴边，右边也不能出现大块空白
- 输入框居中时，左侧和右侧留白应接近
- 底部输入框和思考区都要在画幅内

调整时优先改 `x` 和 `width`，保持裁切中心接近输入框中心；再改 `y` 和 `height`，确保空状态输入框和底部 composer 都可见。

## 5. 自动计算停止时间

录制固定 42 秒作为缓冲，但正片要在模型完成时结束。用 2fps 灰度帧差找最后一个明显变化：

```bash
mkdir -p .scratch/demo/diff
for mode in compact standard detailed verbose; do
  rm -f .scratch/demo/diff/${mode}-*.png
  ffmpeg -hide_banner -loglevel error -y \
    -i .scratch/demo/raw/${mode}-full.mov \
    -vf "fps=2,scale=480:-1,format=gray" \
    .scratch/demo/diff/${mode}-%03d.png
done
```

```python
import pathlib
import subprocess

threshold = 0.005
for mode in ['compact', 'standard', 'detailed', 'verbose']:
    files = sorted(pathlib.Path('.scratch/demo/diff').glob(f'{mode}-*.png'))
    previous = None
    last = 0.0
    for index, path in enumerate(files):
        if previous is not None:
            result = subprocess.run(
                ['magick', 'compare', '-metric', 'RMSE', str(previous), str(path), 'null:'],
                capture_output=True, text=True,
            )
            try:
                diff = float(result.stderr.split('(')[1].split(')')[0])
            except (IndexError, ValueError):
                diff = 0.0
            if diff > threshold:
                last = (index - 1) * 0.5
        previous = path
    print(mode, 'last_active=', last, 'end=', min(42, last + 1.5))
```

阈值 `0.005` 的计算方式：思考文本、工具输出和完成状态都会产生明显差异；完成后的静止画面 RMSE 通常接近 `0.0006`。如果帧差结果异常，直接抽最后 10 秒的帧检查完成状态，不要盲目相信阈值。

当前一次录制得到的参考值（不要写死，下一次重新计算）：

| 模式 | 最后活动 | 建议截到 |
|---|---:|---:|
| Compact | 24.0s | 25.5s |
| Standard | 22.5s | 24.0s |
| Detailed | 25.0s | 26.5s |
| Verbose | 30.5s | 32.0s |

## 6. 转码和封面

```bash
declare -A END=( [compact]=25.5 [standard]=24 [detailed]=26.5 [verbose]=32 )

for mode in compact standard detailed verbose; do
  end=${END[$mode]}
  ffmpeg -hide_banner -loglevel error -y \
    -ss 0 -t "$end" \
    -i .scratch/demo/raw/${mode}-full.mov \
    -vf "crop=1250:900:470:250,scale=1080:-2:flags=lanczos,fps=30" \
    -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
    -movflags +faststart -an \
    docs/demo/${mode}.mp4

  ffmpeg -hide_banner -loglevel error -y \
    -ss 5.5 \
    -i docs/demo/${mode}.mp4 \
    -frames:v 1 -q:v 3 \
    docs/demo/${mode}.jpg
done
```

校验：

```bash
for mode in compact standard detailed verbose; do
  printf '%s ' "$mode"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -show_entries format=duration \
    -of csv=p=0 docs/demo/${mode}.mp4
done
```

期望：

- `1080×778`
- 30fps
- 约 24–33 秒
- 每段最后一帧是完成后的总结，不是生成中的状态

## 7. 同步页面文案

当前视频画幅是 `1080×778`，页面必须同步，否则会被 `object-fit: cover` 裁切：

- `docs/index.html` 中两处 `aspect-ratio` 应为 `1080 / 778`
- 四张卡片的时长范围应为 `25–32s · 30fps` / `25–32 秒 · 30fps`
- 演示 lede 必须说明“从居中输入框开始、完整保留开场思考、模型完成后停止”
- `README.md` / `README.en.md` 的演示段落要同步时长范围和录制范围

如果某次录制时长超出 25–32 秒，同步更新这些文案和 `docs/index.html` 的 `demo.meta` 翻译值。

## 8. 发布与线上校验

```bash
git add docs/demo docs/index.html README.md README.en.md
git commit -m "docs: refresh mode demos"
git push origin main
```

等待 GitHub Pages：

```bash
gh run list --repo timho1047/dsh-stream-focus --limit 2
```

校验线上 MP4：

```bash
for mode in compact standard detailed verbose; do
  curl -sI "https://timho1047.github.io/dsh-stream-focus/demo/${mode}.mp4" \
    | grep -iE 'content-type|content-length'
done

ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height \
  -show_entries format=duration \
  -of csv=p=0 \
  https://timho1047.github.io/dsh-stream-focus/demo/standard.mp4
```

最后确认：

- `content-type: video/mp4`
- 远程尺寸为 `1080×778`
- 远程时长与本地一致
- 页面源码包含 `aspect-ratio: 1080 / 778`
- 本地 `git status` 干净

## 9. 清理

发布确认后删除中间文件：

```bash
rm -rf .scratch/demo
```

如果视频还在用户检查阶段，保留 `.scratch/demo/raw/`，不要把原始录屏提交进 git。

## 恢复现场

录制完成后恢复用户现场：

- Work details 恢复为 Standard
- 展开 sidebar
- 恢复小鲸鱼
- 回到用户原来正在使用的会话
- 不保留录制用的临时会话（或确认用户已自行归档）
