import { Composition } from 'remotion';
import { PromoFull } from './FullPromo';
import { BilibiliCover, BilibiliCoverSmall } from './Cover';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PromoFull" component={PromoFull} durationInFrames={1740} fps={30} width={1920} height={1080} />
    <Composition id="BilibiliCover" component={BilibiliCover} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="BilibiliCoverSmall" component={BilibiliCoverSmall} durationInFrames={1} fps={30} width={1146} height={716} />
  </>
);
