import { useRef, useState } from 'react';
import type Player from 'video.js/dist/types/player';

export interface SeekIndicatorState {
    type: 'forward' | 'backward';
    key: number;
}

interface UsePlayerGesturesOptions {
    player: Player | null;
    isInline?: boolean;
    showControls: boolean;
    setShowControls: (show: boolean) => void;
    togglePlay: () => void;
    handleMouseMove?: () => void;
    handleMouseLeave?: () => void;
    resetHideTimeout: () => void;
    clearHideTimeout: () => void;
}

export function usePlayerGestures({
    player,
    isInline = false,
    showControls,
    setShowControls,
    togglePlay,
    handleMouseMove,
    handleMouseLeave,
    resetHideTimeout,
    clearHideTimeout,
}: UsePlayerGesturesOptions) {
    const [isFastForwarding, setIsFastForwarding] = useState(false);
    const [seekIndicator, setSeekIndicator] = useState<SeekIndicatorState | null>(null);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialPlaybackRateRef = useRef<number>(1);
    const lastTapTimeRef = useRef<number>(0);
    const lastPointerType = useRef<string>('mouse');

    const cancelLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isFastForwarding && player) {
            player.playbackRate(initialPlaybackRateRef.current);
            setIsFastForwarding(false);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        lastPointerType.current = e.pointerType;

        if (!isInline) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

            const handlePointerUp = () => {
                cancelLongPress();
                window.removeEventListener('pointerup', handlePointerUp);
                window.removeEventListener('pointercancel', handlePointerUp);
            };
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointercancel', handlePointerUp);

            longPressTimerRef.current = setTimeout(() => {
                if (player && !player.paused()) {
                    initialPlaybackRateRef.current = player.playbackRate() ?? 1;
                    player.playbackRate(3.0);
                    setIsFastForwarding(true);
                }
            }, 400);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && handleMouseMove) {
            handleMouseMove();
        }
    };

    const handlePointerLeave = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') {
            if (handleMouseLeave) handleMouseLeave();
            cancelLongPress();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isFastForwarding) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const now = Date.now();
        const timeSinceLastTap = now - lastTapTimeRef.current;

        // 双击/双触判定 (<300ms)
        if (timeSinceLastTap < 300) {
            if (player) {
                const isRightSide = e.clientX > window.innerWidth / 2;
                const jump = isRightSide ? 30 : -30;
                player.currentTime((player.currentTime() || 0) + jump);
                setSeekIndicator({
                    type: isRightSide ? 'forward' : 'backward',
                    key: Date.now(),
                });

                lastTapTimeRef.current = 0;

                setTimeout(() => {
                    setSeekIndicator((prev) => (prev?.key === Date.now() ? prev : null));
                }, 500);
            }
            return;
        }

        lastTapTimeRef.current = now;

        if (lastPointerType.current === 'mouse' && !isInline) {
            togglePlay();
        } else {
            if (!showControls) {
                resetHideTimeout();
            } else {
                setShowControls(false);
                clearHideTimeout();
            }
        }
    };

    return {
        isFastForwarding,
        seekIndicator,
        gestureHandlers: {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            onClick: handleClick,
        },
    };
}
