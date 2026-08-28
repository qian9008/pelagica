import { Skeleton } from '@/components/ui/skeleton';
import {
    useConfig,
    getUserId,
    getPrimaryImageUrl,
    getBackdropUrl,
    getApi,
} from '@pelagica/core';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { TFunction } from 'i18next';
import { ImageOff, Star, Clock, FolderClosed, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { buildPlayerUrl } from '@/utils/playerUrl';
import { getItemUrl } from '@/utils/itemUrl';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import ItemContextMenu from '@/components/ItemContextMenu';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { useTitleDisplayMode, getItemDisplayName } from '@/hooks/useTitleDisplayMode';

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

    const isPhysicalFolder = item.Type === 'Folder';
    const isCollectionFolder = item.Type === 'CollectionFolder';
    const isFolder = item.IsFolder || isPhysicalFolder || isCollectionFolder;
    const location = useLocation();
    const playUrl = buildPlayerUrl(item.Id!, location.pathname + location.search);
    const itemPath =
        itemLink ||
        (isDirectPlay ? playUrl : getItemUrl(item.Type, item.Id) ?? `/item/${item.Id}`);

    // 检查该文件夹是否有封面图哈希
    const hasPrimaryImage = !!item.ImageTags?.Primary;

    // 智能获取文件夹内部视频的最短播放进度和反哺封面
    const [folderProgress, setFolderProgress] = useState<number>(0);
    const [folderCoverUrl, setFolderCoverUrl] = useState<string>('');
    const [childCount, setChildCount] = useState<number | null>(item.ChildCount ?? null);

    useEffect(() => {
        if (!isFolder || !item.Id || item.Id === 'undefined') return;

        let active = true;

        const fetchFolderSubData = async () => {
            try {
                const api = getApi();
                const itemsApi = getItemsApi(api);

                // 仅递归拉取该物理目录下前 10 个视频实体，计算内部的播放进度和反哺封面
                const response = await itemsApi.getItems({
                    parentId: item.Id!,
                    recursive: true,
                    limit: 10,
                    includeItemTypes: ['Movie', 'Episode', 'Video'],
                    userId: getUserId() || undefined,
                });

                if (!active) return;

                const subItems = response.data?.Items || [];
                if (response.data?.TotalRecordCount !== undefined) {
                    setChildCount(response.data.TotalRecordCount);
                }

                // 1. 优先挑选有进度的子项
                let minProg = 0;
                let activeSubItem: BaseItemDto | null = null;

                subItems.forEach((v) => {
                    const watchedTicks = v.UserData?.PlaybackPositionTicks ?? 0;
                    const runtimeTicks = v.RunTimeTicks ?? 0;
                    const isPlayed = v.UserData?.Played ?? false;

                    if (!isPlayed && watchedTicks > 0 && runtimeTicks > 0) {
                        const percent = (watchedTicks / runtimeTicks) * 100;
                        if (percent > 0) {
                            if (minProg === 0 || percent < minProg) {
                                minProg = percent;
                                activeSubItem = v;
                            }
                        }
                    }
                });

                setFolderProgress(minProg);

                // 2. 如果没有任何进度，但文件夹内有视频，选取第一个或随机子视频作为封面源
                if (!activeSubItem && subItems.length > 0) {
                    activeSubItem = subItems[0];
                }

                // 3. 提取该子视频的封面反哺给当前文件夹
                if (activeSubItem && activeSubItem.Id) {
                    const subId = activeSubItem.Id;
                    const subTag = activeSubItem.ImageTags?.Primary;
                    let calculatedCover = '';

                    if (posterAspectRatio === 'video') {
                        // 横版模式：优先拉取 Backdrop，无则 Primary 降级
                        const backdropTag =
                            activeSubItem.BackdropImageTags?.[0] || activeSubItem.ImageTags?.Backdrop;
                        if (backdropTag) {
                            calculatedCover = getBackdropUrl(
                                subId,
                                { width: 640, height: 360 },
                                backdropTag
                            );
                        } else if (subTag) {
                            calculatedCover = getPrimaryImageUrl(subId, { width: 640 }, subTag);
                        }
                    } else {
                        // 默认竖版海报模式
                        if (subTag) {
                            calculatedCover = getPrimaryImageUrl(
                                subId,
                                { height: 640, width: 416 },
                                subTag
                            );
                        }
                    }
                    if (calculatedCover) {
                        setFolderCoverUrl(calculatedCover);
                    }
                }
            } catch (err) {
                console.warn('Folder sub-progress and cover fetch failed:', err);
            }
        };

        fetchFolderSubData();

        return () => {
            active = false;
        };
    }, [isFolder, item.Id, posterAspectRatio]);

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

    // 拦截文件夹点击，跳转至深钻层级
    const handleLinkClick = (e: React.MouseEvent) => {
        if (isFolder && onFolderClick) {
            e.preventDefault();
            onFolderClick({ id: item.Id!, name: displayName || item.Name || '' });
        }
    };

    // 渲染高精圆角文件夹封套 (当文件夹无封面且无子视频反哺图时展现)
    const renderFolderWrapper = () => (
        <div className="w-full h-full bg-gradient-to-tr from-accent/40 via-accent/20 to-background flex flex-col items-center justify-center rounded-md border border-accent/20 group-hover:border-primary/50 transition-all duration-300">
            <FolderClosed className="text-4xl text-amber-500 fill-amber-500/10 group-hover:scale-105 transition-transform duration-300" />
            <span className="text-xs text-muted-foreground mt-2 font-medium">
                {t('library:folder', '文件夹')}
            </span>
        </div>
    );

    // 物理文件夹或合集封面左上角的精美微型指示器
    const renderFolderCornerIndicator = () => (
        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-white rounded-md p-1.5 flex items-center justify-center z-20 shadow-md pointer-events-none">
            <FolderClosed className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        </div>
    );

    // 当前卡片最终采用的封面图片
    const finalPosterUrl = isPhysicalFolder
        ? hasPrimaryImage
            ? posterUrl
            : folderCoverUrl
        : posterUrl;

    // 是否渲染黄色文件夹图标：物理文件夹无主图且无子图片反哺时渲染
    const shouldRenderFolderIcon = isPhysicalFolder && !hasPrimaryImage && !folderCoverUrl;
    const displayName = getItemDisplayName(item, titleMode);
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
                            renderFolderWrapper()
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
                            renderFolderWrapper()
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                                <ImageOff className="text-2xl text-muted-foreground" />
                            </div>
                        )}
                        <WatchedStateBadge
                            item={item}
                            show={config?.watchedStateBadgeLibrary || false}
                        />
                        {!shouldRenderFolderIcon && isFolder && renderFolderCornerIndicator()}
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
                        renderFolderWrapper()
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
                        renderFolderWrapper()
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                            <ImageOff className="text-4xl text-muted-foreground" />
                        </div>
                    )}
                    <WatchedStateBadge
                        item={item}
                        show={config?.watchedStateBadgeLibrary || false}
                    />
                    {!shouldRenderFolderIcon && isFolder && renderFolderCornerIndicator()}
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
