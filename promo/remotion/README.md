# dsh-stream-focus promo film

Remotion source for the approximately 58-second promo and the Bilibili cover.

## Preview and render

```bash
npm install
npm run sync-assets   # copy docs/demo/*.mp4 + *.jpg into public/demo
npm run dev           # Remotion Studio
npm run render:full   # render the 58s film to out/
```

Regenerate the soundtrack when needed:

```bash
python3 scripts/make-music.py
ffmpeg -i public/audio/music-full.wav -codec:a libmp3lame -b:a 192k public/audio/music-full.mp3
```

The final upload package is in [`../final/`](../final/). The rendered film in `out/` is a work print; the delivered MP4 has an additional 3-second audio fade-out and loudness normalization applied with ffmpeg.

## Layout

- `src/FullPromo.tsx`: 58-second composition, seven scenes
- `src/Cover.tsx`: 1920×1080 and 1146×716 covers
- `public/audio/music-full.mp3`: original soundtrack
- `public/audio/full-vo-01.wav` … `full-vo-10.wav`: Mimo TTS lines
- `public/cover-bg.png`: real Standard-mode screenshot used by the cover
- `scripts/make-music.py`: reproducible soundtrack generator
- `scripts/voice-lines.md`: TTS model, voice, style and lines
- `scripts/sync-demo.mjs`: copies the current mode demos from `docs/demo`

`public/demo/` is intentionally gitignored; run `npm run sync-assets` after updating the plugin demos. The Mimo API key is not part of this project.

## Design

Ink `#0C1A1F`, warm paper `#F2ECE2`, cream `#FFF8ED`, coral `#F26445`, mint `#79CDB4`.
Chinese uses Hiragino Sans GB / Heiti SC; Latin uses SF Pro / Helvetica Neue / SF Mono.

Remotion license terms apply to the renderer; this is a personal open-source project.
