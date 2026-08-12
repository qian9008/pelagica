import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import JASSUB from 'jassub';
import { setupSubtitleSanitizer } from '@/hooks/setupSubtitleSanitizer';
import { setupHardwareIndicator } from '@/hooks/setupHardwareIndicator';
import { useJellyfinFallbackFont } from '@/hooks/useJellyfinFallbackFont';

type VideoJsPlayer = ReturnType<typeof videojs>;

export interface SubtitleTrack {
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
    format?: 'vtt' | 'ass';
}

interface VideoPlayerProps {
    src: string;
    srcType?: string;
    poster?: string;
    startTicks: number;
    subtitles?: SubtitleTrack[];
    subtitleFonts?: string[];
    onReady?: (player: VideoJsPlayer) => void;
    onPlaybackError?: (error: MediaError | null) => void;
    isAudioSwitchRef: React.MutableRefObject<boolean>;
    subtitleTrackIndex: number | null;
    // 由 PlayerPage 传入的全屏状态：用于动态切换 video opacity，
    // 解决 opacity:0.999(修复移动端黑屏) 与 ASS 字幕 canvas 在全屏下被遮挡的冲突
    isFullscreen?: boolean;
}

const VideoPlayer = ({
    src,
    srcType = 'application/x-mpegURL',
    poster,
    startTicks,
    subtitles,
    subtitleFonts,
    onReady,
    onPlaybackError,
    isAudioSwitchRef,
    subtitleTrackIndex,
    isFullscreen = false,
}: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<VideoJsPlayer | null>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const hasSeekedRef = useRef(false);
    const assRendererRef = useRef<JASSUB | null>(null);
    const onPlaybackErrorRef = useRef(onPlaybackError);
    
    // 自定义 Hook：专门负责解耦处理服务端的 fallback 字体抓取逻辑
    const { fallbackFontBlobUrl, isFallbackFontsLoaded } = useJellyfinFallbackFont();

    useEffect(() => {
        onPlaybackErrorRef.current = onPlaybackError;
    }, [onPlaybackError]);

    useEffect(() => {
        if (!videoRef.current) return;

        const player = videojs(videoRef.current, {
            controls: false,
            autoplay: false,
            preload: 'auto',
            poster: poster,
            // fluid/responsive 在全屏时会用 padding-bottom 布局，导致 JASSUB canvas 尺寸计算错位
            // 由外层 CSS (w-full h-full) 控制尺寸，更简单可靠
            responsive: false,
            fluid: false,
            html5: {
                nativeControlsForTouch: false,
                hls: { overrideNative: true },
                nativeTextTracks: false, // Force video.js to render text tracks
            },
        });

        playerRef.current = player;

        const cleanupSubtitle = setupSubtitleSanitizer(player);
        const cleanupIndicator = setupHardwareIndicator(player, indicatorRef.current);

        player.on('error', () => {
            const mediaError = player.error() as unknown as MediaError | null;
            console.error('video.js playback error:', mediaError);
            onPlaybackErrorRef.current?.(mediaError);
        });

        player.ready(() => {
            onReady?.(player);
            player.play()?.catch((error) => {
                console.error('Error attempting to play:', error);
            });
        });

        return () => {
            cleanupSubtitle();
            cleanupIndicator();
            assRendererRef.current?.destroy();
            assRendererRef.current = null;
            if (playerRef.current) {
                playerRef.current.dispose();
                playerRef.current = null;
            }
        };
    }, [onReady, poster]);

    // 监听由 PlayerPage 传入的全屏状态（通过 document 原生 fullscreenchange 维护，比 player.on 更可靠）
    // opacity 在 JSX 里声明式控制（isFullscreen ? 1 : 0.999），这里只负责 JASSUB resize
    // 注意：不能在 useEffect 里用命令式 vid.style.opacity 修改——isFullscreen 变化会触发重渲染，
    // JSX 的 style 会把命令式修改覆盖掉，产生竞态
    useEffect(() => {
        if (isFullscreen) {
            // 全屏过渡动画期间视频尺寸是逐步变化的，用 staggered 多次延迟确保 JASSUB canvas 覆盖全屏
            const timers = [100, 300, 600].map((delay) =>
                setTimeout(() => {
                    assRendererRef.current?.resize();
                }, delay)
            );
            return () => timers.forEach(clearTimeout);
        } else {
            // 退出全屏后 resize 回正常尺寸
            const timer = setTimeout(() => assRendererRef.current?.resize(), 150);
            return () => clearTimeout(timer);
        }
    }, [isFullscreen]);

    useEffect(() => {
        if (!playerRef.current) return;
        if (!startTicks || startTicks <= 0) return;
        if (hasSeekedRef.current) return;

        const seconds = startTicks / 10_000_000;

        playerRef.current.currentTime(seconds);
        hasSeekedRef.current = true;
    }, [startTicks]);

    useEffect(() => {
        hasSeekedRef.current = false;
    }, [src]);

    useEffect(() => {
        if (!playerRef.current || !src) return;

        const player = playerRef.current;

        let seekTo: number | null = null;

        if (isAudioSwitchRef.current) {
            seekTo = player.currentTime() || null;
            isAudioSwitchRef.current = false;
        }

        player.pause();
        player.src({ src, type: srcType });
        player.load();

        if (seekTo !== null) {
            player.currentTime(seekTo);
        }

        player.play()?.catch(console.error);
    }, [src, srcType, isAudioSwitchRef]);

    useEffect(() => {
        if (!playerRef.current) return;

        const player = playerRef.current;

        const addSubtitles = (activeIndex: number | null) => {
            const tracks = player.remoteTextTracks();
            while (tracks.tracks_.length > 0) {
                const track = tracks.tracks_[0];
                if (track) player.removeRemoteTextTrack(track);
            }

            if (subtitles && subtitles.length > 0) {
                let addedCount = 0;
                subtitles.forEach((subtitle, index) => {
                    // ASS/SSA tracks are rendered by JASSUB instead of the native text track
                    if (subtitle.format === 'ass') return;

                    player.addRemoteTextTrack(
                        {
                            kind: 'subtitles',
                            src: subtitle.src,
                            srclang: subtitle.srclang,
                            label: subtitle.label,
                            default: subtitle.default,
                        },
                        false // Don't add to DOM manually
                    );

                    const addedTrack = player.remoteTextTracks().tracks_[addedCount];
                    addedCount++;
                    if (addedTrack) {
                        addedTrack.mode = index === activeIndex ? 'showing' : 'disabled';
                    }
                });
            }
        };

        addSubtitles(subtitleTrackIndex);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                addSubtitles(subtitleTrackIndex);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [subtitles, src, subtitleTrackIndex]);

    useEffect(() => {
        if (!playerRef.current || !isFallbackFontsLoaded) return;

        const videoEl = playerRef.current.el()?.querySelector('video');
        if (!videoEl) return;

        const activeTrack =
            subtitleTrackIndex !== null ? (subtitles?.[subtitleTrackIndex] ?? null) : null;

        if (!assRendererRef.current) {
            if (!activeTrack || activeTrack.format !== 'ass') return;

            const finalFonts = subtitleFonts ? [...subtitleFonts] : [];
            if (fallbackFontBlobUrl) {
                finalFonts.push(fallbackFontBlobUrl);
            }

            assRendererRef.current = new JASSUB({
                video: videoEl,
                subUrl: activeTrack.src,
                fonts: finalFonts,
                queryFonts: false,
                defaultFont: 'Noto Sans SC',
            });
            return;
        }

        const renderer = assRendererRef.current;
        renderer.ready
            .then(() => {
                // Bail out if the renderer was replaced/destroyed while we were waiting
                if (assRendererRef.current !== renderer) return;

                if (!activeTrack || activeTrack.format !== 'ass') {
                    renderer.renderer.freeTrack();
                } else {
                    renderer.renderer.setTrackByUrl(activeTrack.src);
                }
            })
            .catch((error) => console.error('Error updating ASS subtitles:', error));
    }, [subtitleTrackIndex, subtitles, subtitleFonts, fallbackFontBlobUrl, isFallbackFontsLoaded]);

    return (
        <div
            className="w-full h-full overflow-hidden relative group"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <div ref={indicatorRef} style={{ display: 'none' }}></div>
            <video
                ref={videoRef}
                className="video-js vjs-default-skin"
                data-testid="video-player"
                playsInline
                webkit-playsinline="true"
                // opacity 声明式控制：
                // - 非全屏：0.999 强制 video 进入独立 GPU 渲染层，修复移动端 WebGL 黑屏遮罩
                // - 全屏：  1 消除层叠上下文对 JASSUB canvas 的遮挡
                style={{ width: '100%', height: '100%', opacity: isFullscreen ? 1 : 0.999 }}
            >
                <track kind="captions" srcLang="en" label="English" />
            </video>
            {/* 注入自定义字幕样式：透明背景，洋红描边与黑色深邃阴影 */}
            <style>{`
                .vjs-text-track-cue {
                    background-color: transparent !important;
                }
                .vjs-text-track-cue > div {
                    background-color: transparent !important;
                    background: transparent !important;
                    color: #ffffff !important;
                    text-shadow: 
                        -1.5px -1.5px 0 #ff00ff,  
                         1.5px -1.5px 0 #ff00ff,
                        -1.5px  1.5px 0 #ff00ff,
                         1.5px  1.5px 0 #ff00ff,
                        -2px  0px 1px #ff00ff,
                         2px  0px 1px #ff00ff,
                         0px -2px 1px #ff00ff,
                         0px  2px 1px #ff00ff,
                         2px  2px 3px rgba(0, 0, 0, 0.95),
                        -2px  2px 3px rgba(0, 0, 0, 0.95),
                         2px -2px 3px rgba(0, 0, 0, 0.95),
                        -2px -2px 3px rgba(0, 0, 0, 0.95) !important;
                    font-weight: bold !important;
                    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', 'Noto Sans CJK SC', sans-serif !important;
                }
            `}</style>
        </div>
    );
};

export default VideoPlayer;
