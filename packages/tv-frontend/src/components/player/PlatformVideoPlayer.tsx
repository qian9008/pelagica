import { lazy, Suspense } from 'react';
import { getPlatform } from '@pelagica/core';
import type { VideoPlayerProps } from './types';

const VideoPlayer = lazy(() => import('./VideoPlayer'));
const TizenVideoPlayer = lazy(() => import('./TizenVideoPlayer'));

const PlatformVideoPlayer = (props: VideoPlayerProps) => {
    return (
        <Suspense fallback={null}>
            {getPlatform() === 'tizen' ? (
                <TizenVideoPlayer {...props} />
            ) : (
                <VideoPlayer {...props} />
            )}
        </Suspense>
    );
};

export default PlatformVideoPlayer;
