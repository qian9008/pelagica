import videojs from 'video.js';

type VideoJsPlayer = ReturnType<typeof videojs>;

/**
 * 自动拦截并清洗字幕中的大括号特效代码（例如 {\fnMicrosoft YaHei...}）
 */
export const setupSubtitleSanitizer = (player: VideoJsPlayer) => {
    const handleAddTrack = (e: unknown) => {
        const track = (e as { track: TextTrack }).track;
        if (track.kind === 'subtitles' || track.kind === 'captions') {
            track.addEventListener('cuechange', () => {
                const activeCues = track.activeCues;
                if (activeCues) {
                    for (let i = 0; i < activeCues.length; i++) {
                        const cue = activeCues[i] as VTTCue;
                        if (cue && !(cue as VTTCue & { cleaned?: boolean }).cleaned) {
                            cue.text = cue.text.replace(/\{[^}]+\}/g, '');
                            (cue as VTTCue & { cleaned?: boolean }).cleaned = true;
                        }
                    }
                }
            });
        }
    };

    player.textTracks().on('addtrack', handleAddTrack);

    // 返回清理函数
    return () => {
        if (player && !player.isDisposed?.()) {
            player.textTracks().off('addtrack', handleAddTrack);
        }
    };
};
