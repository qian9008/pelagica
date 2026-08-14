import videojs from 'video.js';

type VideoJsPlayer = ReturnType<typeof videojs>;

export const setupHardwareIndicator = (player: VideoJsPlayer, indicatorEl: HTMLDivElement | null) => {
    const handleLoadedMetadata = async () => {
        const videoEl = player.el()?.querySelector('video');
        if (!videoEl || !indicatorEl) return;

        const width = videoEl.videoWidth || 1920;
        const height = videoEl.videoHeight || 1080;
        const contentType = 'video/mp4; codecs="avc1.640028"';

        if ('mediaCapabilities' in navigator) {
            try {
                const info = await navigator.mediaCapabilities.decodingInfo({
                    type: 'file',
                    video: {
                        contentType: contentType,
                        width: width,
                        height: height,
                        bitrate: 2500000,
                        framerate: 30
                    }
                });
                
                const isHw = info.powerEfficient;
                indicatorEl.style.display = 'flex';
                indicatorEl.innerHTML = `
                    <div class="w-1.5 h-1.5 rounded-full ${isHw ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse"></div>
                    <span class="tracking-wider">${isHw ? 'HW' : 'SW'}</span>
                `;
                indicatorEl.className = `absolute top-6 right-6 px-3 py-1.5 text-xs font-bold rounded-md shadow-xl backdrop-blur-md z-50 transition-all duration-500 flex items-center gap-2 pointer-events-none opacity-60 group-hover:opacity-100 ${
                    isHw 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`;
            } catch (error) {
                console.warn('获取解码能力失败:', error);
            }
        }
    };

    player.on('loadedmetadata', handleLoadedMetadata);

    return () => {
        if (player && !player.isDisposed?.()) {
            player.off('loadedmetadata', handleLoadedMetadata);
        }
    };
};
