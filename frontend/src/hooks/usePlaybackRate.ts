import { useState, useEffect, useCallback } from 'react';
import videojs from 'video.js';

type VideoJsPlayer = ReturnType<typeof videojs>;

export const usePlaybackRate = (player: VideoJsPlayer | null) => {
    const [playbackRate, setPlaybackRateState] = useState<number>(() => {
        const saved = localStorage.getItem('playbackRate');
        return saved ? parseFloat(saved) : 1;
    });

    // 暴露给外部调用，用于在 UI 上主动改变倍速
    const setPlaybackRate = useCallback(
        (rate: number) => {
            setPlaybackRateState(rate);
            localStorage.setItem('playbackRate', rate.toString());
            if (player && !player.isDisposed?.()) {
                player.playbackRate(rate);
            }
        },
        [player]
    );

    // 同步底层 player 的倍速（例如快捷键等引发的倍速改变）
    useEffect(() => {
        if (!player) return;

        const handleRateChange = () => {
            const currentRate = player.playbackRate() || 1;
            setPlaybackRateState(currentRate);
            localStorage.setItem('playbackRate', currentRate.toString());
        };

        player.on('ratechange', handleRateChange);

        // 初始化时设置播放器的倍速，避免被默认 1 覆盖
        player.playbackRate(playbackRate);

        return () => {
            if (player && !player.isDisposed?.()) {
                player.off('ratechange', handleRateChange);
            }
        };
    }, [player]); // 仅在 player 变化时挂载事件，不可将 playbackRate 放入依赖，否则死循环

    return [playbackRate, setPlaybackRate] as const;
};
