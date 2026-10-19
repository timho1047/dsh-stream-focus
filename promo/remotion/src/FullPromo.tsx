import { Audio, Video } from '@remotion/media';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { ReactNode } from 'react';

const INK = '#0C1A1F';
const PAPER = '#F2ECE2';
const CREAM = '#FFF8ED';
const CORAL = '#F26445';
const MINT = '#79CDB4';
const DISPLAY = '"SF Pro Display", "Helvetica Neue", "Hiragino Sans GB", "Heiti SC", sans-serif';
const CJK = '"Hiragino Sans GB", "Heiti SC", "PingFang SC", sans-serif';
const MONO = '"SF Mono", "Menlo", "Monaco", monospace';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const enter = (frame: number, start: number, duration = 18): number =>
  interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing: ease });
const rise = (frame: number, start: number, distance = 30, duration = 18): number =>
  interpolate(frame, [start, start + duration], [distance, 0], { ...clamp, easing: ease });
const leave = (frame: number, end: number, duration = 16): number =>
  interpolate(frame, [end - duration, end], [1, 0], clamp);

const Grid: React.FC<{ color: string; opacity: number; step?: number }> = ({ color, opacity, step = 80 }) => (
  <div style={{ position: 'absolute', inset: 0, opacity, backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: `${step}px ${step}px`, maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 78%)' }} />
);

const Grain: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.1, mixBlendMode: 'soft-light' }}>
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <filter id="dsh-full-grain"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch" /></filter>
      <rect width="1920" height="1080" filter="url(#dsh-full-grain)" opacity="0.55" />
    </svg>
  </AbsoluteFill>
);

const SceneShell: React.FC<{ end: number; children: ReactNode; style?: React.CSSProperties }> = ({ end, children, style }) => {
  const frame = useCurrentFrame();
  const intro = enter(frame, 0, 14);
  const outro = leave(frame, end, 16);
  return <AbsoluteFill style={{ opacity: Math.min(intro, outro), ...style }}>{children}</AbsoluteFill>;
};

const SceneOne: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    'we need to check the edge cases before we ship',
    '> read  src/client/conductor.ts',
    'the content is still arriving…',
    'function nextRevealLength(current, target)',
    'need to keep the reader in the flow',
    '> bash  npm run verify',
    'when the window changes height, the line jumps',
    'a quieter way to follow the stream',
    'token  ·  grapheme  ·  frame',
    '> inspect  data-step-process-body',
  ];
  return (
    <SceneShell end={186} style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, #183B3D 0%, #0C1A1F 56%, #071014 100%)' }} />
      <Grid color="#9EB8AF" opacity={0.08} step={96} />
      <div style={{ position: 'absolute', inset: -100, color: MINT, fontFamily: MONO, fontSize: 22, lineHeight: 2.4, opacity: 0.28, transform: `translateY(${-frame * 0.55}px)` }}>
        {lines.map((line, i) => <div key={line} style={{ position: 'absolute', left: `${(i % 3) * 36 + 2}%`, top: `${(i * 13 + 4) % 96}%`, whiteSpace: 'nowrap', opacity: 0.42 + (i % 4) * 0.12 }}>{line}</div>)}
      </div>
      <div style={{ position: 'absolute', left: 150, top: 178, fontFamily: MONO, fontSize: 18, letterSpacing: 5, color: CORAL, opacity: enter(frame, 8) }}>DSH STREAM FOCUS / A SHORT FILM</div>
      <div style={{ position: 'absolute', left: 146, top: 270, width: 1200 }}>
        <div style={{ overflow: 'hidden' }}><div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 124, lineHeight: 0.94, letterSpacing: -6, color: CREAM, translate: `0 ${rise(frame, 10, 80, 20)}px`, opacity: enter(frame, 10, 20), whiteSpace: 'nowrap' }}>流式输出，</div></div>
        <div style={{ overflow: 'hidden', marginTop: 12 }}><div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 124, lineHeight: 0.94, letterSpacing: -6, color: CREAM, translate: `0 ${rise(frame, 20, 80, 20)}px`, opacity: enter(frame, 20, 20), whiteSpace: 'nowrap' }}>本该像呼吸<span style={{ color: CORAL }}>一样自然。</span></div></div>
      </div>
      <div style={{ position: 'absolute', left: 154, top: 620, width: 560, fontFamily: CJK, fontSize: 28, lineHeight: 1.6, color: '#C9D5CF', opacity: enter(frame, 38) }}>而不是，在每一次换行时重新寻找视线。</div>
      <div style={{ position: 'absolute', left: 150, right: 150, top: 744, height: 1, background: `linear-gradient(90deg, ${CORAL}, ${MINT}, transparent)`, scale: `${enter(frame, 30, 30)} 1`, transformOrigin: 'left', opacity: 0.8 }} />
      <div style={{ position: 'absolute', right: 130, bottom: 72, fontFamily: MONO, fontSize: 15, letterSpacing: 3, color: '#7F938A' }}>01 / 07 — THE FEELING</div>
      <Grain />
    </SceneShell>
  );
};

const Window: React.FC<{ small?: boolean }> = ({ small = false }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: small ? 850 : 290, top: small ? 226 : 138, width: small ? 900 : 1340, height: small ? 690 : 804, borderRadius: 26, background: '#FFFDF8', padding: 9, boxShadow: '0 42px 90px rgba(43, 36, 25, 0.23), 0 6px 20px rgba(43, 36, 25, 0.12)', rotate: small ? '-2deg' : '-0.7deg', scale: interpolate(frame, [0, 24], [0.94, 1], { ...clamp, easing: ease }) }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 12px', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#F3A58D' }} /><span style={{ width: 8, height: 8, borderRadius: 99, background: '#E8C56B' }} /><span style={{ width: 8, height: 8, borderRadius: 99, background: '#82C9A7' }} />
        <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 12, color: '#89918B' }}>127.0.0.1:3080 — {small ? 'standard' : 'live process'}</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: '#B4B7AE' }}>● live</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 34px)', overflow: 'hidden', borderRadius: 18, background: '#F8F5EE' }}>
        <Video src={staticFile('demo/standard.mp4')} trimBefore={5 * 30} muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

const SceneTwo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={216} style={{ backgroundColor: PAPER, overflow: 'hidden' }}>
      <Grid color="#68766C" opacity={0.055} step={72} />
      <div style={{ position: 'absolute', left: 126, top: 96, fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: '#7E8D83' }}>02 / 07 — THE PROBLEM</div>
      <div style={{ position: 'absolute', left: 126, top: 226, width: 620 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: 1.02, letterSpacing: -5, color: INK, opacity: enter(frame, 8, 20), translate: `0 ${rise(frame, 8, 50, 22)}px` }}>窗口不该用</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: 1.02, letterSpacing: -5, color: INK, opacity: enter(frame, 16, 20), translate: `0 ${rise(frame, 16, 50, 22)}px` }}>跳动提醒你</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: 1.02, letterSpacing: -5, color: CORAL, opacity: enter(frame, 24, 20), translate: `0 ${rise(frame, 24, 50, 22)}px` }}>它在工作。</div>
        <div style={{ marginTop: 44, fontFamily: CJK, fontSize: 24, lineHeight: 1.65, color: '#6E796F', opacity: enter(frame, 36) }}>每一次换行，都是一次重新寻找。</div>
      </div>
      <Window small />
      <div style={{ position: 'absolute', left: 126, top: 748, display: 'flex', gap: 10, opacity: enter(frame, 44), translate: `0 ${rise(frame, 44, 18)}px` }}>
        {['height jump', 'follow loss', 'thumb flicker'].map((label) => <span key={label} style={{ fontFamily: MONO, fontSize: 13, color: INK, background: CREAM, border: '1px solid #D9D1C4', borderRadius: 99, padding: '8px 14px' }}>{label}</span>)}
      </div>
      <div style={{ position: 'absolute', right: 126, bottom: 72, fontFamily: MONO, fontSize: 14, letterSpacing: 3, color: '#8A948C' }}>A SMALL INTERRUPTION.</div>
      <Grain />
    </SceneShell>
  );
};

const SceneThree: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={370} style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <Video src={staticFile('demo/standard.mp4')} trimBefore={6 * 30} muted objectFit="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', left: 42, top: 38, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(12,26,31,0.9)', borderRadius: 8, padding: '10px 14px', opacity: enter(frame, 8) }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: CORAL }}>03 / 07</span>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: '#D7E1DA' }}>THE REAL THING</span>
      </div>
      <div style={{ position: 'absolute', right: 42, top: 38, fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: INK, background: 'rgba(255,248,237,0.86)', borderRadius: 8, padding: '10px 14px', opacity: enter(frame, 16) }}>STANDARD / LIVE</div>
      <div style={{ position: 'absolute', left: 72, bottom: 132, width: 720, background: 'rgba(12,26,31,0.94)', borderRadius: 18, padding: '30px 34px 28px', boxShadow: '0 22px 60px rgba(7,16,20,0.28)', opacity: enter(frame, 18), translate: `0 ${rise(frame, 18, 26)}px` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {['600ms', 'grapheme-safe', 'official scroll'].map((label) => <span key={label} style={{ fontFamily: MONO, fontSize: 11, color: MINT, border: '1px solid rgba(121,205,180,0.35)', borderRadius: 99, padding: '6px 10px' }}>{label}</span>)}
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 66, lineHeight: 1.04, letterSpacing: -3, color: CREAM }}>思考在走，</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 66, lineHeight: 1.04, letterSpacing: -3, color: MINT }}>视线不追。</div>
        <div style={{ marginTop: 20, fontFamily: CJK, fontSize: 20, color: '#C9D5CF' }}>不是演示动画，是正在运行的 DSH。</div>
      </div>
      <div style={{ position: 'absolute', right: 42, bottom: 38, fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: 'rgba(12,26,31,0.6)', background: 'rgba(255,248,237,0.8)', borderRadius: 6, padding: '7px 10px', opacity: enter(frame, 26) }}>REAL CAPTURE · NO MOCKUP</div>
      <Grain />
    </SceneShell>
  );
};


const SceneFour: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={240} style={{ backgroundColor: PAPER, overflow: 'hidden' }}>
      <Grid color="#68766C" opacity={0.06} step={72} />
      <div style={{ position: 'absolute', left: 126, top: 104, fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: '#7E8D83' }}>04 / 07 — THE MECHANISM</div>
      <div style={{ position: 'absolute', left: 126, top: 226, width: 700 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 1.03, letterSpacing: -4, color: INK, opacity: enter(frame, 6, 20), translate: `0 ${rise(frame, 6, 44, 20)}px` }}>不接管渲染，</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 1.03, letterSpacing: -4, color: INK, opacity: enter(frame, 14, 20), translate: `0 ${rise(frame, 14, 44, 20)}px` }}>不替换 <span style={{ color: CORAL }}>Markdown</span>。</div>
        <div style={{ marginTop: 42, fontFamily: CJK, fontSize: 25, lineHeight: 1.7, color: '#6E796F', opacity: enter(frame, 28) }}>只给字符加一层高亮，<br />把滚动交还给官方 process scroll。</div>
      </div>
      <div style={{ position: 'absolute', left: 830, top: 170, width: 960 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: enter(frame, 18) }}>
          <div style={{ width: 130, height: 1, background: '#B8B2A4' }} />
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: '#7E8D83' }}>ONE ACTIVE WINDOW</span>
        </div>
        <div style={{ marginTop: 20, height: 520, borderRadius: 24, background: '#FFFDF8', padding: 8, boxShadow: '0 28px 70px rgba(43,36,25,0.18)' }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 18 }}>
            <Video src={staticFile('demo/standard.mp4')} trimBefore={9 * 30} muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12, color: '#7E8D83' }}>
          <span>actual footage · not a mockup</span><span>STANDARD</span>
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12, color: '#7E8D83' }}>
          <span>01 / HIGHLIGHT RANGES</span><span>02 / FOLLOW</span><span>03 / FADE</span>
        </div>
      </div>
      <Grain />
    </SceneShell>
  );
};


const modes = [
  { label: 'Compact', note: 'keep it close', color: CORAL, file: 'compact.mp4', trim: 4 },
  { label: 'Standard', note: 'the main window', color: MINT, file: 'standard.mp4', trim: 6 },
  { label: 'Detailed', note: 'see the work', color: '#D7B56D', file: 'detailed.mp4', trim: 6 },
  { label: 'Verbose', note: 'never miss a beat', color: '#A9B8D9', file: 'verbose.mp4', trim: 8 },
];

const SceneFive: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={216} style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 45%, #17373A 0%, #0C1A1F 55%, #071014 100%)' }} />
      <Grid color="#9EB8AF" opacity={0.06} step={88} />
      <div style={{ position: 'absolute', left: 126, top: 116, fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: CORAL }}>05 / 07 — THE MODES</div>
      <div style={{ position: 'absolute', left: 126, top: 238, width: 480 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 0.98, letterSpacing: -4, color: CREAM, opacity: enter(frame, 8, 20), translate: `0 ${rise(frame, 8, 44, 20)}px` }}>四种读法，</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 0.98, letterSpacing: -4, color: CORAL, opacity: enter(frame, 16, 20), translate: `0 ${rise(frame, 16, 44, 20)}px` }}>一个节奏。</div>
        <div style={{ marginTop: 46, fontFamily: CJK, fontSize: 23, lineHeight: 1.7, color: '#B8C8C0', opacity: enter(frame, 30) }}>窗口适应你的读法，<br />而不是反过来。</div>
      </div>
      <div style={{ position: 'absolute', left: 660, top: 116, width: 1130, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {modes.map((mode, i) => (
          <div key={mode.label} style={{ height: 392, borderRadius: 18, overflow: 'hidden', position: 'relative', background: '#FFFDF8', border: `1px solid ${mode.color}66`, opacity: enter(frame, 16 + i * 5, 18), translate: `0 ${rise(frame, 16 + i * 5, 28, 18)}px` }}>
            <Video src={staticFile(`demo/${mode.file}`)} trimBefore={mode.trim * 30} muted objectFit="cover" style={{ width: '100%', height: 'calc(100% - 68px)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 68, background: '#10262B', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 27, letterSpacing: -0.8, color: CREAM }}>{mode.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, color: mode.color, marginTop: 2 }}>{mode.note}</div>
              </div>
              <span style={{ width: 28, height: 3, background: mode.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 126, bottom: 58, fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: '#7F938A' }}>ONE PLUGIN · FOUR WAYS TO READ · ZERO SETTINGS</div>
      <Grain />
    </SceneShell>
  );
};


const SceneSix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={276} style={{ backgroundColor: PAPER, overflow: 'hidden' }}>
      <Grid color="#68766C" opacity={0.06} step={72} />
      <div style={{ position: 'absolute', left: 126, top: 104, fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: '#7E8D83' }}>06 / 07 — THE OPEN SOURCE</div>
      <div style={{ position: 'absolute', left: 126, top: 230, width: 950 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 94, lineHeight: 1.02, letterSpacing: -5, color: INK, opacity: enter(frame, 6, 20), translate: `0 ${rise(frame, 6, 44, 20)}px` }}>零设置。</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 94, lineHeight: 1.02, letterSpacing: -5, color: INK, opacity: enter(frame, 14, 20), translate: `0 ${rise(frame, 14, 44, 20)}px` }}>纯客户端。<span style={{ color: CORAL }}>开源。</span></div>
        <div style={{ marginTop: 40, fontFamily: CJK, fontSize: 24, lineHeight: 1.7, color: '#6E796F', opacity: enter(frame, 28) }}>不写 Session，不发网络请求，<br />不接触凭据，不注册模型工具。</div>
      </div>
      <div style={{ position: 'absolute', left: 1110, top: 230, width: 660, opacity: enter(frame, 18) }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: '#8A948C' }}>INSTALL</div>
        <div style={{ marginTop: 12, background: '#10262B', color: '#D7E1DA', borderRadius: 16, padding: '24px 24px 26px', boxShadow: '0 20px 50px rgba(43,36,25,0.14)' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: CORAL }} /><span style={{ width: 8, height: 8, borderRadius: 99, background: '#D7B56D' }} /><span style={{ width: 8, height: 8, borderRadius: 99, background: MINT }} /></div>
          <div style={{ fontFamily: MONO, fontSize: 17, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}><span style={{ color: MINT }}>$</span> dsh plugin --profile web add{'\n'}  dsh-stream-focus</div>
          <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 11, color: '#7F938A' }}>npm · github.com/timho1047/dsh-stream-focus</div>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          {['MIT', 'no telemetry', 'no settings'].map((tag) => <span key={tag} style={{ fontFamily: MONO, fontSize: 12, color: '#6E796F', border: '1px solid #D4CDC1', borderRadius: 99, padding: '8px 12px' }}>{tag}</span>)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 126, bottom: 74, fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: '#8A948C' }}>BUILT FOR DEEPSEEK HARNESS · OPEN SOURCE · MIT</div>
      <Grain />
    </SceneShell>
  );
};

const SceneSeven: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell end={520} style={{ backgroundColor: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 44%, #183B3D 0%, #0C1A1F 58%, #071014 100%)' }} />
      <Grid color="#9EB8AF" opacity={0.06} step={96} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: enter(frame, 8), translate: `0 ${rise(frame, 8, 28)}px` }}>
          <Img src={staticFile('icon.svg')} style={{ width: 88, height: 88 }} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 86, letterSpacing: -4, color: CREAM }}>dsh-stream-focus</span>
        </div>
        <div style={{ marginTop: 38, fontFamily: CJK, fontWeight: 600, fontSize: 48, letterSpacing: 2, color: CREAM, opacity: enter(frame, 20), translate: `0 ${rise(frame, 20, 24)}px` }}>让思考，<span style={{ color: CORAL }}>流动起来。</span></div>
        <div style={{ marginTop: 34, display: 'flex', gap: 10, opacity: enter(frame, 34) }}>
          {modes.map((mode) => <span key={mode.label} style={{ fontFamily: MONO, fontSize: 11, color: mode.color, border: `1px solid ${mode.color}55`, borderRadius: 99, padding: '8px 12px' }}>{mode.label}</span>)}
        </div>
        <div style={{ marginTop: 46, display: 'flex', gap: 12, opacity: enter(frame, 44) }}>
          <span style={{ fontFamily: MONO, fontSize: 14, color: '#D7E1DA', border: '1px solid rgba(255,248,237,0.2)', borderRadius: 99, padding: '10px 16px' }}>github.com/timho1047/dsh-stream-focus</span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: INK, background: CORAL, borderRadius: 99, padding: '10px 16px' }}>npm i dsh-stream-focus</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 58, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: 3, color: '#7F938A', opacity: enter(frame, 58) }}>OPEN SOURCE · MIT · MADE FOR DEEPSEEK HARNESS</div>
      <Grain />
    </SceneShell>
  );
};

const captions = [
  { from: 18, to: 128, text: '流式输出，本来应该像呼吸一样自然。' },
  { from: 150, to: 294, text: '可当内容不断变高，窗口开始跳动。' },
  { from: 312, to: 510, text: '让每一次出现，都落在它该在的位置。' },
  { from: 510, to: 662, text: '字符以六百毫秒淡入，不是突然出现。' },
  { from: 678, to: 864, text: '跟随交给官方，窗口保持稳定。' },
  { from: 888, to: 1024, text: '四种模式，同一个节奏。' },
  { from: 1056, to: 1184, text: '不替换 Markdown，不接管渲染。' },
  { from: 1200, to: 1290, text: '安装，也只需要一行命令。' },
  { from: 1302, to: 1440, text: '思考、工具、切换，都不再打断阅读。' },
];

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const current = captions.find((caption) => frame >= caption.from && frame <= caption.to);
  if (!current) return null;
  const local = frame - current.from;
  const length = current.to - current.from;
  const opacity = interpolate(local, [0, 8, length - 8, length], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 42, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ fontFamily: CJK, fontSize: 25, letterSpacing: 1, color: CREAM, background: 'rgba(12,26,31,0.76)', borderRadius: 9, padding: '10px 18px', backdropFilter: 'blur(8px)' }}>{current.text}</div>
    </div>
  );
};

const Sound: React.FC = () => (
  <>
    <Audio src={staticFile('audio/music-full.mp3')} volume={0.22} />
    {['01','02','03','04','05','06','07','08','09','10'].map((n, i) => {
      const starts = [18, 150, 312, 510, 678, 888, 1056, 1200, 1302, 1458];
      return <Sequence key={n} from={starts[i]}><Audio src={staticFile(`audio/full-vo-${n}.wav`)} volume={0.95} /></Sequence>;
    })}
  </>
);

export const PromoFull: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: CJK }}>
      <Sequence durationInFrames={186}><SceneOne /></Sequence>
      <Sequence from={168} durationInFrames={216}><SceneTwo /></Sequence>
      <Sequence from={350} durationInFrames={370}><SceneThree /></Sequence>
      <Sequence from={666} durationInFrames={240}><SceneFour /></Sequence>
      <Sequence from={870} durationInFrames={216}><SceneFive /></Sequence>
      <Sequence from={1040} durationInFrames={276}><SceneSix /></Sequence>
      <Sequence from={1280} durationInFrames={durationInFrames - 1280}><SceneSeven /></Sequence>
      <Caption />
      <Sound />
    </AbsoluteFill>
  );
};
