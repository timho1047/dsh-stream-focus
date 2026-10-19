import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';

const INK = '#0C1A1F';
const CREAM = '#FFF8ED';
const CORAL = '#F26445';
const MINT = '#79CDB4';
const DISPLAY = '"SF Pro Display", "Helvetica Neue", "Hiragino Sans GB", "Heiti SC", sans-serif';
const CJK = '"Hiragino Sans GB", "Heiti SC", "PingFang SC", sans-serif';
const MONO = '"SF Mono", "Menlo", "Monaco", monospace';

export const BilibiliCover: React.FC = () => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Img src={staticFile('cover-bg.png')} style={{ position: 'absolute', right: 0, top: 0, width: width * 0.68, height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.56, background: 'linear-gradient(90deg, rgba(12,26,31,0.99) 0%, rgba(12,26,31,0.96) 70%, rgba(12,26,31,0.72) 100%)' }} />
      <div style={{ position: 'absolute', left: 64, top: 68, fontFamily: MONO, fontSize: 14, letterSpacing: 4, color: CORAL }}>DSH STREAM FOCUS / OPEN SOURCE</div>
      <div style={{ position: 'absolute', left: 60, top: 188, width: 940, fontFamily: DISPLAY, fontWeight: 700, fontSize: 104, lineHeight: 0.99, letterSpacing: -5, color: CREAM }}>
        流式输出，
        <br />不该打断
        <br /><span style={{ color: CORAL }}>思考。</span>
      </div>
      <div style={{ position: 'absolute', left: 65, top: 646, fontFamily: CJK, fontSize: 25, letterSpacing: 1, color: '#C9D5CF' }}>
        字符淡入 · 跟随稳定 · 四档模式
      </div>
      <div style={{ position: 'absolute', left: 65, bottom: 66, display: 'flex', gap: 10 }}>
        {['600ms', '30FPS', 'MIT'].map((tag) => <span key={tag} style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1.5, color: MINT, border: '1px solid rgba(121,205,180,0.45)', borderRadius: 99, padding: '8px 13px' }}>{tag}</span>)}
      </div>
      <div style={{ position: 'absolute', right: 44, bottom: 40, fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: INK, background: 'rgba(255,248,237,0.9)', borderRadius: 6, padding: '7px 10px' }}>REAL CAPTURE</div>
    </AbsoluteFill>
  );
};

export const BilibiliCoverSmall: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Img src={staticFile('cover-bg.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 700, background: 'linear-gradient(90deg, rgba(12,26,31,0.99) 0%, rgba(12,26,31,0.97) 72%, rgba(12,26,31,0.45) 100%)' }} />
    <div style={{ position: 'absolute', left: 34, top: 38, fontFamily: MONO, fontSize: 9, letterSpacing: 3, color: CORAL }}>DSH STREAM FOCUS / OPEN SOURCE</div>
    <div style={{ position: 'absolute', left: 32, top: 112, width: 650, fontFamily: DISPLAY, fontWeight: 700, fontSize: 78, lineHeight: 1.01, letterSpacing: -4, color: CREAM }}>
      流式输出，
      <br />不该打断
      <br /><span style={{ color: CORAL }}>思考。</span>
    </div>
    <div style={{ position: 'absolute', left: 34, top: 430, fontFamily: CJK, fontSize: 18, letterSpacing: 1, color: '#C9D5CF' }}>字符淡入 · 跟随稳定 · 四档模式</div>
    <div style={{ position: 'absolute', left: 34, bottom: 38, display: 'flex', gap: 8 }}>
      {['600ms', '30FPS', 'MIT'].map((tag) => <span key={tag} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.3, color: MINT, border: '1px solid rgba(121,205,180,0.45)', borderRadius: 99, padding: '6px 10px' }}>{tag}</span>)}
    </div>
    <div style={{ position: 'absolute', right: 26, bottom: 26, fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: INK, background: 'rgba(255,248,237,0.9)', borderRadius: 5, padding: '6px 8px' }}>REAL CAPTURE</div>
  </AbsoluteFill>
);
