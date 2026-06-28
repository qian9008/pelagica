import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import BaseMediaPage from './BaseMediaPage';
import PeopleRow from './PeopleRow';
import { getPrimaryImageUrl, getLogoUrl } from '@/utils/jellyfinUrls';
import { ImageOff, Play, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router';
import MoreLikeThisRow from './MoreLikeThisRow';
import type { AppConfig } from '@/hooks/api/useConfig';
import DetailBadges from './DetailBadges';
import MediaInfoDialog from '../../components/MediaInfoDialog';
import FavoriteButton from '../../components/FavoriteButton';
import WatchListButton from '../../components/WatchlistButton';
import PlayStateButton from '../../components/PlayStateButton';
import { getUserId } from '@/utils/localstorageCredentials';
import ItemAdminButton from '@/components/ItemAdminButton';
import { useState } from 'react';
import { TrailerButton } from '../../components/TrailerButton';
import ItemDownloadButton from '../../components/ItemDownloadButton';
import SourcePickerButton from '@/components/SourcePickerButton';
import ShareDialog from '@/components/ShareDialog';
import ExternalPlayerButton from '@/components/ExternalPlayerButton';
import ItemMetadataBadges from './ItemMetadataBadges';
import Overview from './Overview';

interface MoviePageProps {
    item: BaseItemDto;
    config: AppConfig;
}

const MoviePage = ({ item, config }: MoviePageProps) => {
    const { t } = useTranslation('item');
    const [postersFailed, setPostersFailed] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [isPosterLoaded, setIsPosterLoaded] = useState(false);
    const [failedLogo, setFailedLogo] = useState(false);

    const watched = item.UserData?.PlaybackPositionTicks ?? 0;
    const runtime = item.RunTimeTicks ?? 0;
    const isCurrentlyPlaying = watched > 0 && runtime > 0 && watched < runtime;

    const getFilename = (path?: string | null) => {
        if (!path) return '';
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1];
    };

    const formatSize = (bytes?: number | null) => {
        if (!bytes) return '';
        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
        return `${(bytes / 1e6).toFixed(1)} MB`;
    };

    const formatBitrate = (bitrate?: number | null) => {
        if (!bitrate) return '';
        return `${(bitrate / 1e6).toFixed(1)} Mbps`;
    };

    const filename = getFilename(item.Path || item.MediaSources?.[0]?.Path);
    const videoSize = formatSize(item.MediaSources?.[0]?.Size);
    const bitrateStr = formatBitrate(item.MediaSources?.[0]?.Bitrate);
    const videoCodec = item.MediaStreams?.find((s) => s.Type === 'Video')?.Codec?.toUpperCase() || '';
    const container = item.MediaSources?.[0]?.Container?.toUpperCase() || '';

    const isLandscape = item.PrimaryImageAspectRatio && item.PrimaryImageAspectRatio > 1;

    return (
        <BaseMediaPage
            itemId={item.Id || ''}
            name={item.Name || ''}
            showLogo={false}
            topPadding={false}
        >
            <div className="pt-24 sm:pt-32 pb-12 mx-auto w-full flex flex-col gap-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative z-10 w-full">
                    {/* Left Column (Poster) */}
                    <div
                        className={
                            isLandscape
                                ? 'relative w-full max-w-[18rem] md:max-w-[24rem] mx-auto lg:mx-0 shadow-lg rounded-xl overflow-hidden group shrink-0'
                                : 'relative w-48 min-w-[12rem] h-72 md:w-72 md:min-w-[18rem] md:h-108 mx-auto lg:mx-0 shadow-lg rounded-xl overflow-hidden group shrink-0'
                        }
                        style={isLandscape ? { aspectRatio: item.PrimaryImageAspectRatio ?? undefined } : undefined}
                    >
                        {!postersFailed ? (
                            <Link to={`/play/${item.Id}`} className="block w-full h-full relative cursor-pointer z-10">
                                <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
                                <img
                                    src={getPrimaryImageUrl(
                                        item.Id || '',
                                        undefined,
                                        item.ImageTags?.Primary
                                    )}
                                    alt={item.Name + ' Primary'}
                                    className={[
                                        'object-cover rounded-xl w-full h-full relative z-10',
                                        'transition-[filter,opacity] duration-700 ease-out',
                                        isPosterLoaded
                                            ? 'blur-0 opacity-100'
                                            : 'blur-md opacity-0',
                                    ].join(' ')}
                                    onLoad={() => setIsPosterLoaded(true)}
                                    onError={() => setPostersFailed(true)}
                                />
                                {/* 半透明大播放按钮 */}
                                <div className="absolute inset-0 bg-black/15 md:bg-black/25 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                    <div className="h-16 w-16 bg-white/25 md:bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl">
                                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                                <ImageOff className="text-muted-foreground w-12 h-12" />
                            </div>
                        )}
                    </div>

                    {/* Right Column (Details) */}
                    <div className="flex-1 flex flex-col gap-5 w-full text-left">
                        {/* Title Logo / Text */}
                        {!failedLogo && item.Id ? (
                            <img
                                src={getLogoUrl(item.Id, { maxHeight: 150 }, item.ImageTags?.Logo)}
                                alt={item.Name || ''}
                                className="h-16 sm:h-24 md:h-28 max-w-[85%] object-contain object-left mb-2"
                                onError={() => setFailedLogo(true)}
                            />
                        ) : (
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 text-wrap balance">
                                {item.Name}
                            </h1>
                        )}

                        {/* Badges */}
                        <DetailBadges item={item} appConfig={config} />

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2.5 items-center mt-2">
                            <SourcePickerButton
                                itemId={item.Id || ''}
                                mediaSources={item.MediaSources}
                                isCurrentlyPlaying={Boolean(isCurrentlyPlaying)}
                                playLabel={t('play')}
                                resumeLabel={t('resume')}
                            />
                            <ExternalPlayerButton item={item} />
                            <TrailerButton item={item} />
                            <FavoriteButton
                                item={item}
                                showFavoriteButton={
                                    item.Type &&
                                    config.itemPage?.favoriteButton?.includes(item.Type)
                                }
                            />
                            <WatchListButton
                                item={item}
                                showWatchlistButton={config.itemPage?.showWatchlistButton}
                            />
                            <PlayStateButton itemId={item.Id || ''} userId={getUserId() || ''} />
                            <ItemDownloadButton
                                item={item}
                                showDownloadButton={config.itemPage?.showDownloadButton}
                            />
                            <Button
                                size={'icon-lg'}
                                variant={'outline'}
                                onClick={() => setShareOpen(true)}
                            >
                                <Share2 />
                            </Button>
                            <MediaInfoDialog streams={item.MediaStreams || []} path={item.Path} />
                            <ItemAdminButton item={item} showSubtitlesButton={true} />
                        </div>

                        <Overview text={item.Overview || ''} />

                        {/* 视频文件信息栏 */}
                        {(filename || videoSize || bitrateStr || videoCodec) && (
                            <div className="mt-3 flex flex-col gap-1.5 p-3 rounded-lg bg-accent/15 border border-border/30 max-w-2xl backdrop-blur-sm">
                                {filename && (
                                    <div className="text-[10px] leading-normal font-mono text-muted-foreground/90 break-all select-all flex items-start gap-1">
                                        <span className="shrink-0 font-sans font-semibold text-foreground/75">文件：</span>
                                        <span className="hover:text-foreground transition-colors">{filename}</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                                    {videoSize && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">大小：</span>
                                            <span className="font-semibold text-foreground/80">{videoSize}</span>
                                        </div>
                                    )}
                                    {bitrateStr && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">码率：</span>
                                            <span className="font-semibold text-foreground/80">{bitrateStr}</span>
                                        </div>
                                    )}
                                    {(videoCodec || container) && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">格式：</span>
                                            <span className="font-semibold text-foreground/80">
                                                {videoCodec} {container ? `(${container})` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <ItemMetadataBadges item={item} />
                    </div>
                </div>

                <PeopleRow
                    title={<h3 className="text-3xl font-bold">{t('cast_and_crew')}</h3>}
                    people={item.People || []}
                />
                <MoreLikeThisRow
                    title={<h3 className="text-3xl font-bold">{t('more_like_this')}</h3>}
                    itemId={item.Id || ''}
                />
            </div>
            <ShareDialog
                open={shareOpen}
                onOpenChange={setShareOpen}
                mediaId={item.Id || ''}
                mediaName={item.Name || ''}
            />
        </BaseMediaPage>
    );
};

export default MoviePage;
