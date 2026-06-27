import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getStaticStreamUrl, getSubtitleUrl } from '@/utils/jellyfinUrls';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ExternalPlayerButtonProps {
    item: BaseItemDto;
    mediaSourceId?: string; // 用户当前选择的媒体源 ID，如果有的话
    className?: string;
}

interface PlayerOption {
    id: string;
    name: string;
    platforms: ('android' | 'ios' | 'windows' | 'macos' | 'other')[];
    getUrl: (streamUrl: string, subUrl: string, title: string, positionMs: number) => string;
}

// 格式化播放进度为 HH:MM:SS，供 PotPlayer 等桌面播放器定位
const formatSeekTime = (positionMs: number) => {
    const seconds = Math.floor(positionMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
    ].join(':');
};

// 获取设备系统的 UA 辅助工具
const getOS = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
    if (/Macintosh|MacIntel/i.test(ua)) return 'macos';
    if (/Windows/i.test(ua) || /compatible/i.test(ua)) return 'windows';
    return 'other';
};

// 预定义支持的外部播放器及其 scheme/intent 逻辑
const PLAYER_OPTIONS: PlayerOption[] = [
    // --- Android 平台播放器 ---
    {
        id: 'android-intent',
        name: '系统选择器 (Android Intent)',
        platforms: ['android'],
        getUrl: (url, subUrl, title, pos) => {
            // Android 通用 Intent：可调起系统内所有注册了 video/* 的播放器
            let intentUrl = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*`;
            if (subUrl) {
                intentUrl += `;S.subtitles_location=${encodeURIComponent(subUrl)}`;
            }
            intentUrl += `;S.title=${encodeURIComponent(title)};i.position=${pos};end`;
            return intentUrl;
        },
    },
    {
        id: 'android-vlc',
        name: 'VLC for Android',
        platforms: ['android'],
        getUrl: (url, subUrl, title, pos) => {
            let intentUrl = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc`;
            if (subUrl) {
                intentUrl += `;S.subtitles_location=${encodeURIComponent(subUrl)}`;
            }
            intentUrl += `;S.title=${encodeURIComponent(title)};i.position=${pos};end`;
            return intentUrl;
        },
    },
    {
        id: 'android-mx',
        name: 'MX Player (免费版)',
        platforms: ['android'],
        getUrl: (url, _subUrl, title, pos) =>
            `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(title)};i.position=${pos};end`,
    },
    {
        id: 'android-mx-pro',
        name: 'MX Player Pro (专业版)',
        platforms: ['android'],
        getUrl: (url, _subUrl, title, pos) =>
            `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.pro;S.title=${encodeURIComponent(title)};i.position=${pos};end`,
    },
    {
        id: 'android-reex',
        name: 'Reex Player',
        platforms: ['android'],
        getUrl: (url, _subUrl, title, pos) =>
            `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.xyoye.custom;S.title=${encodeURIComponent(title)};i.position=${pos};end`,
    },
    {
        id: 'android-mpv',
        name: 'MPV for Android',
        platforms: ['android'],
        getUrl: (url, _subUrl, title, pos) =>
            `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=is.xyz.mpv;S.title=${encodeURIComponent(title)};i.position=${pos};end`,
    },
    {
        id: 'android-nplayer',
        name: 'nPlayer for Android',
        platforms: ['android'],
        getUrl: (url, _subUrl, title, pos) =>
            `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.newin.nplayer.pro;S.title=${encodeURIComponent(title)};i.position=${pos};end`,
    },

    // --- iOS 平台播放器 ---
    {
        id: 'ios-infuse',
        name: 'Infuse',
        platforms: ['ios'],
        getUrl: (url, subUrl, _title, _pos) =>
            `infuse://x-callback-url/play?url=${encodeURIComponent(url)}${subUrl ? `&sub=${encodeURIComponent(subUrl)}` : ''}`,
    },
    {
        id: 'ios-vlc',
        name: 'VLC for iOS',
        platforms: ['ios'],
        getUrl: (url, subUrl, _title, _pos) =>
            `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}${subUrl ? `&sub=${encodeURIComponent(subUrl)}` : ''}`,
    },
    {
        id: 'ios-nplayer',
        name: 'nPlayer',
        platforms: ['ios'],
        getUrl: (url, _subUrl, _title, _pos) => {
            const noProto = url.replace(/^https?:\/\//, '');
            const isHttps = url.startsWith('https://');
            return `nplayer-${isHttps ? 'https' : 'http'}://${noProto}`;
        },
    },
    {
        id: 'ios-fileball',
        name: 'Fileball',
        platforms: ['ios'],
        getUrl: (url, _subUrl, _title, _pos) =>
            `filebox://play?url=${encodeURIComponent(url)}`,
    },
    {
        id: 'ios-senplayer',
        name: 'SenPlayer',
        platforms: ['ios'],
        getUrl: (url, _subUrl, _title, _pos) =>
            `SenPlayer://x-callback-url/play?url=${encodeURIComponent(url)}`,
    },

    // --- Windows 平台播放器 ---
    {
        id: 'windows-potplayer',
        name: 'PotPlayer',
        platforms: ['windows'],
        getUrl: (url, subUrl, title, pos) => {
            const seekStr = pos > 0 ? `/seek=${formatSeekTime(pos)}` : '';
            const subStr = subUrl ? `/sub=${encodeURI(subUrl)}` : '';
            return `potplayer://${encodeURI(url)} ${subStr} ${seekStr} /title="${title}"`;
        },
    },
    {
        id: 'windows-vlc',
        name: 'VLC Media Player',
        platforms: ['windows'],
        getUrl: (url, _subUrl, _title, _pos) => `vlc://${encodeURI(url)}`,
    },

    // --- macOS 平台播放器 ---
    {
        id: 'macos-iina',
        name: 'IINA',
        platforms: ['macos'],
        getUrl: (url, _subUrl, _title, _pos) => `iina://weblink?url=${encodeURIComponent(url)}&new_window=1`,
    },
    {
        id: 'macos-nplayer',
        name: 'nPlayer for Mac',
        platforms: ['macos'],
        getUrl: (url, _subUrl, _title, _pos) => `nplayer-mac://weblink?url=${encodeURIComponent(url)}&new_window=1`,
    },
    {
        id: 'macos-vlc',
        name: 'VLC for Mac',
        platforms: ['macos'],
        getUrl: (url, _subUrl, _title, _pos) => `vlc://${encodeURI(url)}`,
    },
];

export default function ExternalPlayerButton({ item, mediaSourceId, className }: ExternalPlayerButtonProps) {
    const { t } = useTranslation('item');
    const [os, setOs] = useState<'android' | 'ios' | 'windows' | 'macos' | 'other'>('other');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setOs(getOS());
    }, []);

    // 智能选取第一个外置中文（或任意首个外置）字幕并转成 SRT/VTT 流直链
    const getExternalSubtitle = (targetMediaSourceId: string) => {
        if (!item.MediaStreams) return '';
        const externalSubs = item.MediaStreams.filter((s) => s.Type === 'Subtitle' && s.IsExternal);
        if (externalSubs.length === 0) return '';

        const chineseSub = externalSubs.find((s) => {
            const lang = s.Language?.toLowerCase() || '';
            const title = s.DisplayTitle?.toLowerCase() || '';
            return (
                lang.includes('chi') ||
                lang.includes('zho') ||
                lang.includes('cn') ||
                lang.includes('zh') ||
                title.includes('chi') ||
                title.includes('zho') ||
                title.includes('简') ||
                title.includes('繁') ||
                title.includes('中')
            );
        });

        const targetSub = chineseSub || externalSubs[0];
        if (targetSub && targetSub.Index !== undefined) {
            // 大多数外部播放器更偏爱 srt 格式，兼容性更广
            const isSrt = targetSub.Codec?.toLowerCase() === 'srt';
            return getSubtitleUrl(item.Id!, targetMediaSourceId, targetSub.Index, isSrt ? 'srt' : 'vtt');
        }
        return '';
    };

    // 提取当前的直链 URL、字幕及进度信息并构造外部链接
    const handlePlayerClick = (option: PlayerOption) => {
        const targetMediaSourceId = mediaSourceId || item.MediaSources?.[0]?.Id || item.Id || '';
        const streamUrl = getStaticStreamUrl(targetMediaSourceId);
        const subUrl = getExternalSubtitle(targetMediaSourceId);
        const title = item.Name || 'Video';
        const positionMs = Math.floor((item.UserData?.PlaybackPositionTicks || 0) / 10000);

        if (!streamUrl) {
            toast.error(t('stream_url_error', '获取播放流失败'));
            return;
        }

        const externalUrl = option.getUrl(streamUrl, subUrl, title, positionMs);
        console.log(`外部播放跳转 URL [${option.name}]:`, externalUrl);
        window.open(externalUrl, '_self');
    };

    // 复制直链功能
    const handleCopyLink = () => {
        const targetMediaSourceId = mediaSourceId || item.MediaSources?.[0]?.Id || item.Id || '';
        const streamUrl = getStaticStreamUrl(targetMediaSourceId);

        if (!streamUrl) {
            toast.error(t('stream_url_error', '获取直链链接失败'));
            return;
        }

        navigator.clipboard.writeText(streamUrl)
            .then(() => {
                setCopied(true);
                toast.success(t('copied', '直链已成功复制到剪贴板！'));
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                toast.error(t('copy_error', '复制失败，请手动尝试'));
            });
    };

    // 智能筛选出适合当前系统的播放器
    const filteredPlayers = PLAYER_OPTIONS.filter((p) => p.platforms.includes(os));

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`h-10 px-4 gap-2 cursor-pointer font-semibold text-sm rounded-md border border-border/50 bg-background/30 backdrop-blur-sm hover:bg-background/80 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md ${className}`}
                >
                    <ExternalLink className="h-4 w-4" />
                    <span>{t('external_play', '外部播放')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px] bg-background/90 backdrop-blur-md border border-border/50 shadow-xl">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t('select_external_player', '选择外部播放器')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                
                {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => (
                        <DropdownMenuItem
                            key={player.id}
                            onSelect={() => handlePlayerClick(player)}
                            className="cursor-pointer focus:bg-accent/80"
                        >
                            <span className="flex-1">{player.name}</span>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t('no_matched_player', '未检测到匹配系统的播放器')}
                    </div>
                )}

                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                    onSelect={handleCopyLink}
                    className="cursor-pointer focus:bg-accent/80 gap-2 flex items-center"
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="flex-1">{t('copy_stream_url', '复制播放直链')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
