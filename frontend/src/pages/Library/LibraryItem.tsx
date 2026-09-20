import { Skeleton } from '@/components/ui/skeleton';
import {
    useConfig,
    getPrimaryImageUrl,
    getBackdropUrl,
} from '@pelagica/core';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { TFunction } from 'i18next';
import { ImageOff, Star, Clock, FolderClosed, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { buildPlayerUrl } from '@/utils/playerUrl';
import { getItemUrl } from '@/utils/itemUrl';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import ItemContextMenu from '@/components/ItemContextMenu';
import { useTitleDisplayMode, getItemDisplayName } from '@/hooks/useTitleDisplayMode';
import {
    useFolderCoverFeed,
    FolderWrapper,
    FolderCornerIndicator,
} from '@/features/folder-view';

const getAspectStyle = (ratio: string) => {
    if (ratio === 'video') return '16/9';
    if (ratio === 'square') return '1/1';
    if (ratio === '2/3') return '2/3';
    if (ratio === '9/16' || ratio === '9:16') return '9/16';
    if (ratio.includes('/')) return ratio;
    return ratio;
};

const LibraryItem = ({
    item,
    posterUrl,
    t,
    posterAspectRatio = '2/3',
    posterFit = 'cover',
    detailLine,
    layoutMode = 'grid',
    onFolderClick,
    isDirectPlay,
    itemLink,
}: {
    item: BaseItemDto;
    posterUrl: string;
    t: TFunction;
    posterAspectRatio?: string;
    posterFit?: 'cover' | 'contain';
    detailLine?: React.ReactNode;
    layoutMode?: 'grid' | 'list';
    onFolderClick?: (folder: { id: string; name: string }) => void;
    isDirectPlay?: boolean;
    itemLink?: string;
}) => {
    const { config } = useConfig();
    const navigate = useNavigate();
    const [posterError, setPosterError] = useState(false);
    const [titleMode] = useTitleDisplayMode();

    // 引入解耦后的文件夹智能封面反哺与播放进度管理 Hook
    const {
        isFolder,
        folderProgress,
        childCount,
        finalPosterUrl,
        shouldRenderFolderIcon,
    } = useFolderCoverFeed(item, posterUrl, posterAspectRatio);

    const location = useLocation();
    const playUrl = buildPlayerUrl(item.Id!, location.pathname + location.search);
    const itemPath =
        itemLink ||
        (isDirectPlay ? playUrl : getItemUrl(item.Type, item.Id) ?? `/item/${item.Id}`);

    const watched = item.UserData?.PlaybackPositionTicks ?? 0;
    const runtime = item.RunTimeTicks ?? 0;
    const played = item.UserData?.Played ?? false;

    // 如果是普通视频直接取自身 progress，如果是文件夹，取算出的最短子进度 folderProgress
    const progress = isFolder
        ? folderProgress
        : isDirectPlay
          ? item.UserData?.Played && watched <= 0
              ? 100
              : runtime > 0
                ? (watched / runtime) * 100
                : 0
          : !played && watched > 0 && runtime > 0
            ? (watched / runtime) * 100
            : 0;

    // 渲染媒体进度条 (z-20 确保覆盖在图片 z-10 之上)
    const renderProgressBar = () => {
        if (progress <= 0) return null;
        return (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20 overflow-hidden">
                <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-brand transition-all duration-300"
                />
            </div>
        );
    };

    const displayName = getItemDisplayName(item, titleMode);

    // 拦截文件夹点击，跳转至深钻层级
    const handleLinkClick = (e: React.MouseEvent) => {
        if (isFolder && onFolderClick) {
            e.preventDefault();
            onFolderClick({ id: item.Id!, name: displayName || item.Name || '' });
        }
    };

    const runtimeMinutes = item.RunTimeTicks
        ? Math.round(item.RunTimeTicks / 10000000 / 60)
        : null;

    // 1. 列表视图 (List Layout)
    if (layoutMode === 'list') {
        const isFolderType = isFolder;
        const thumbnailAspect = isFolderType && shouldRenderFolderIcon ? '1/1' : '16/9';
        const displayPosterUrl =
            finalPosterUrl ||
            (item.ImageTags?.Primary
                ? getPrimaryImageUrl(item.Id!, { height: 160, width: 284 }, item.ImageTags.Primary)
                : item.BackdropImageTags && item.BackdropImageTags.length > 0
                  ? getBackdropUrl(item.Id!, { maxWidth: 284 })
                  : '');

        return (
            <ItemContextMenu item={item}>
                <Link
                    to={itemPath || `/item/${item.Id}`}
                    key={item.Id}
                    className="flex items-center gap-4 p-3 border rounded-lg bg-card hover:bg-accent/40 transition-colors duration-200 w-full group text-left no-underline"
                    onClick={handleLinkClick}
                >
                    {/* 左侧横版背景/海报 */}
                    <div
                        style={{ aspectRatio: thumbnailAspect }}
                        className="relative w-[140px] sm:w-[180px] shrink-0 h-auto overflow-hidden rounded-md group-hover:opacity-90 transition-opacity"
                    >
                        {shouldRenderFolderIcon ? (
                            <FolderWrapper />
                        ) : !posterError && displayPosterUrl ? (
                            <>
                                <img
                                    key={item.Id}
                                    src={displayPosterUrl}
                                    alt={displayName || t('library:no_title')}
                                    className={`w-full h-full object-${posterFit} rounded-md group-hover:scale-102 transition-transform duration-300 z-10`}
                                    loading="lazy"
                                    onError={() => setPosterError(true)}
                                />
                                <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                            </>
                        ) : isFolder ? (
                            <FolderWrapper />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                                <ImageOff className="text-2xl text-muted-foreground" />
                            </div>
                        )}
                        <WatchedStateBadge
                            item={item}
                            show={config?.watchedStateBadgeLibrary || false}
                        />
                        {!shouldRenderFolderIcon && isFolder && <FolderCornerIndicator />}
                        {renderProgressBar()}
                    </div>

                    {/* 右侧详细信息 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <div className="flex items-center gap-2">
                            {isFolderType && shouldRenderFolderIcon && (
                                <FolderClosed className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <h3 className="font-semibold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors duration-200">
                                {displayName || t('library:no_title')}
                            </h3>
                        </div>

                        {/* 属性标签 */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {(item as BaseItemDto & { ShareOwnerName?: string }).ShareOwnerName && (
                                <span className="font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-[10px]">
                                    {t('shared_by', '由')}{' '}
                                    {(item as BaseItemDto & { ShareOwnerName?: string })
                                        .ShareOwnerName}{' '}
                                    {t('share', '分享')}
                                </span>
                            )}
                            {isFolder ? (
                                <>
                                    <span className="font-medium text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                        {t('library:folder', '文件夹')}
                                    </span>
                                    {childCount !== null && (
                                        <span className="text-muted-foreground text-[11px]">
                                            {childCount} 项
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    {detailLine && (
                                        <span className="font-medium text-foreground/80">
                                            {detailLine}
                                        </span>
                                    )}
                                    {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                    {item.CommunityRating && (
                                        <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                            {item.CommunityRating.toFixed(1)}
                                        </span>
                                    )}
                                    {runtimeMinutes && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {runtimeMinutes} 分钟
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {!isFolder && item.Overview && (
                            <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.Overview}
                            </p>
                        )}
                    </div>
                </Link>
            </ItemContextMenu>
        );
    }

    // 2. 标准网格视图 (Grid Layout: Poster / Backdrop / Folder)
    return (
        <ItemContextMenu item={item}>
            <Link
                to={itemPath || `/item/${item.Id}`}
                key={item.Id}
                className="p-0 m-0 no-underline block group"
                onClick={handleLinkClick}
            >
                <div
                    style={{ aspectRatio: getAspectStyle(posterAspectRatio) }}
                    className="relative w-full h-auto overflow-hidden rounded-md group"
                >
                    {shouldRenderFolderIcon ? (
                        <FolderWrapper />
                    ) : !posterError && finalPosterUrl ? (
                        <>
                            <img
                                key={item.Id}
                                src={finalPosterUrl}
                                alt={displayName || t('library:no_title')}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: posterFit,
                                    objectPosition: 'center',
                                    zIndex: 10,
                                }}
                                className={`absolute inset-0 w-full h-full object-${posterFit} rounded-md group-hover:opacity-75 transition-all group-hover:scale-105 z-10`}
                                loading="lazy"
                                onError={() => setPosterError(true)}
                            />
                            <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                            {isDirectPlay && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <div
                                        className="bg-black/60 rounded-full p-4 cursor-pointer hover:bg-black/75"
                                        role="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(itemLink || playUrl);
                                        }}
                                    >
                                        <Play className="w-6 h-6 text-white fill-white" />
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                        </>
                    ) : isFolder ? (
                        <FolderWrapper />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                            <ImageOff className="text-4xl text-muted-foreground" />
                        </div>
                    )}
                    <WatchedStateBadge
                        item={item}
                        show={config?.watchedStateBadgeLibrary || false}
                    />
                    {!shouldRenderFolderIcon && isFolder && <FolderCornerIndicator />}
                    {renderProgressBar()}
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all text-foreground group-hover:text-primary transition-colors">
                    {displayName || t('library:no_title')}
                </p>
                <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-2 line-clamp-1">
                        {isFolder ? t('library:folder', '文件夹') : detailLine}
                    </span>
                    {(item as BaseItemDto & { ShareOwnerName?: string }).ShareOwnerName && (
                        <span className="text-[10px] text-primary font-medium bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-full truncate">
                            {(item as BaseItemDto & { ShareOwnerName?: string }).ShareOwnerName}
                        </span>
                    )}
                </div>
            </Link>
        </ItemContextMenu>
    );
};

export default LibraryItem;
