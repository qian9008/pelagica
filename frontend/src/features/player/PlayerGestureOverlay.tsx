import React from 'react';
import { FastForward, RotateCcw, RotateCw } from 'lucide-react';
import type { SeekIndicatorState } from './usePlayerGestures';

interface PlayerGestureOverlayProps {
    isFastForwarding: boolean;
    seekIndicator: SeekIndicatorState | null;
}

export const PlayerGestureOverlay: React.FC<PlayerGestureOverlayProps> = ({
    isFastForwarding,
    seekIndicator,
}) => {
    return (
        <>
            {/* 左右双击 ±30s 动画指示层 */}
            {seekIndicator && (
                <div
                    key={seekIndicator.key}
                    className={`absolute top-1/2 -translate-y-1/2 ${
                        seekIndicator.type === 'forward' ? 'right-1/4' : 'left-1/4'
                    } bg-black/50 backdrop-blur-sm text-white rounded-full p-4 z-50 flex flex-col items-center justify-center animate-out fade-out zoom-out duration-500 pointer-events-none`}
                >
                    {seekIndicator.type === 'forward' ? (
                        <RotateCw size={32} />
                    ) : (
                        <RotateCcw size={32} />
                    )}
                    <span className="font-bold mt-1 text-sm">
                        {seekIndicator.type === 'forward' ? '+30s' : '-30s'}
                    </span>
                </div>
            )}

            {/* 长按 3x 快进指示条 */}
            {isFastForwarding && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-brand font-bold px-4 py-1.5 rounded-full z-50 animate-pulse pointer-events-none flex items-center gap-2">
                    <FastForward size={18} />
                    <span>3x 快进中</span>
                </div>
            )}
        </>
    );
};
