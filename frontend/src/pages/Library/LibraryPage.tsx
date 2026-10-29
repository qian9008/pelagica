import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Page from '../Page';
import {
    useUserViews,
    useLibraryItems,
    useCurrentUser,
    useRefreshItemMetadata,
    getPrimaryImageUrl,
    getBackdropUrl,
} from '@pelagica/core';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import ItemPagination from '@/components/ItemPagination';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWideIcon,
    Calendar,
    CalendarPlus,
    CaseSensitive,
    Clock,
    FolderOpen,
    Star,
    LayoutGrid,
    Image as ImageIcon,
    List,
    Folder,
    RefreshCw,
} from 'lucide-react';
import JellyfinLibraryIcon from '@/components/JellyfinLibraryIcon';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import { MetadataRefreshMode } from '@jellyfin/sdk/lib/generated-client/models';
import { ButtonGroup } from '@/components/ui/button-group';
import LibraryItem from './LibraryItem';
import { SUPPORTED_LIBRARY_COLLECTION_TYPES } from '@/utils/itemTypes';
import { toast } from 'sonner';
import {
    useFolderNavigation,
    FolderBreadcrumbs,
    type FolderBreadcrumbItem,
} from '@/features/folder-view';

export type ViewMode = 'poster' | 'backdrop' | 'list' | 'folder';

const ITEM_ROWS = 5;

function getColumnCount(width: number, viewMode: ViewMode): number {
    if (viewMode === 'list') return 1;
    if (viewMode === 'backdrop' || viewMode === 'folder') {
        if (width >= 1536) return 6; // 2xl
        if (width >= 1280) return 5; // xl
        if (width >= 1024) return 4; // lg
        if (width >= 768) return 3; // md
        return 2;
    }
    // poster (default)
    if (width >= 1536) return 9; // 2xl
    if (width >= 1280) return 7; // xl
    if (width >= 1024) return 5; // lg
    if (width >= 768) return 4; // md
    if (width >= 640) return 3; // sm
    return 2;
}

const LibraryContent = ({
    collectionType,
    pageRef,
    sortBy,
    sortOrder,
    page,
    onPageChange,
    viewMode,
    currentFolderId,
    folderPathStack,
    onNavigateToFolder,
    onNavigateToBreadcrumb,
    onNavigateToRoot,
}: {
    libraryId: string;
    collectionType?: string;
    pageRef: React.RefObject<HTMLDivElement | null>;
    sortBy: ItemSortBy;
    sortOrder: SortOrder;
    page: number;
    onPageChange: (p: number) => void;
    viewMode: ViewMode;
    currentFolderId: string;
    folderPathStack: FolderBreadcrumbItem[];
    onNavigateToFolder: (folder: FolderBreadcrumbItem) => void;
    onNavigateToBreadcrumb: (index: number) => void;
    onNavigateToRoot: () => void;
}) => {
    const { t } = useTranslation(['library', 'common']);
    const [pageSize, setPageSize] = useState(
        () => getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640, viewMode) * ITEM_ROWS
    );

    // 监听窗口大小改变以动态计算列数
    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getColumnCount(window.innerWidth, viewMode) * ITEM_ROWS;
            setPageSize(newPageSize);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode]);

    // 监听视图切换以即时更新列数
    useEffect(() => {
        const newPageSize = getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640, viewMode) * ITEM_ROWS;
        setPageSize(newPageSize);
    }, [viewMode]);

    const isFolderMode = viewMode === 'folder';

    const { data: libraryData, isLoading } = useLibraryItems(currentFolderId, {
        limit: pageSize,
        startIndex: page * pageSize,
        includeItemTypes: isFolderMode
            ? undefined // 文件夹模式下不限制媒体类型，捞出文件夹和所有格式的视频、音频
            : collectionType === 'homevideos' || collectionType === 'photos'
              ? ['Folder', 'Video', 'Photo']
              : ['Series', 'Movie', 'BoxSet', 'MusicAlbum'],
        sortBy: [sortBy],
        sortOrder,
        recursive: isFolderMode ? false : !(collectionType === 'homevideos' || collectionType === 'photos'),
    });

    useEffect(() => {
        if (pageRef.current && !isLoading && libraryData?.items?.length) {
            pageRef.current.scrollIntoView({ block: 'start' });
        }
    }, [libraryData?.items, isLoading, pageRef]);

    const posterUrls = useMemo(() => {
        if (!libraryData) return {};
        return libraryData.items.reduce(
            (acc, item) => {
                const isMusic = item.Type === 'MusicAlbum';
                const isHomeOrPhotos = collectionType === 'homevideos' || collectionType === 'photos';

                if (isMusic) {
                    acc[item.Id!] = getPrimaryImageUrl(
                        item.Id!,
                        {
                            height: 416,
                            width: 416,
                        },
                        item.ImageTags?.Primary
                    );
                } else if (isHomeOrPhotos) {
                    acc[item.Id!] = getPrimaryImageUrl(
                        item.Id!,
                        {
                            width: 640,
                        },
                        item.ImageTags?.Primary
                    );
                } else if (viewMode === 'backdrop' || viewMode === 'list' || viewMode === 'folder') {
                    // 横版、列表或物理文件夹模式：拉取媒体的 Backdrop 背景图，若无则使用 Primary 优雅降级
                    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
                        acc[item.Id!] = getBackdropUrl(
                            item.Id!,
                            { width: 640, height: 360 },
                            item.BackdropImageTags[0]
                        );
                    } else if (item.ImageTags?.Backdrop) {
                        acc[item.Id!] = getBackdropUrl(
                            item.Id!,
                            { width: 640, height: 360 },
                            item.ImageTags.Backdrop
                        );
                    } else {
                        acc[item.Id!] = getPrimaryImageUrl(
                            item.Id!,
                            { width: 640 },
                            item.ImageTags?.Primary
                        );
                    }
                } else {
                    // 默认竖屏海报 (poster)
                    acc[item.Id!] = getPrimaryImageUrl(
                        item.Id!,
                        {
                            height: 640,
                            width: 416,
                        },
                        item.ImageTags?.Primary
                    );
                }
                return acc;
            },
            {} as Record<string, string>
        );
    }, [libraryData, collectionType, viewMode]);

    const totalPages = libraryData?.totalCount ? Math.ceil(libraryData.totalCount / pageSize) : 0;

    // 动态生成网格的 css class
    const gridClasses = useMemo(() => {
        if (viewMode === 'list') {
            return 'w-full gap-3 mt-2 grid grid-cols-1';
        }
        if (viewMode === 'backdrop' || viewMode === 'folder') {
            return 'w-full gap-4 mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
        }
        // poster
        return 'w-full gap-4 mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9';
    }, [viewMode]);

    return (
        <div className="mb-4">
            {/* 解耦后的独立面包屑导航组件 */}
            {isFolderMode && (
                <FolderBreadcrumbs
                    folderPathStack={folderPathStack}
                    onNavigateToRoot={onNavigateToRoot}
                    onNavigateToBreadcrumb={onNavigateToBreadcrumb}
                />
            )}

            {isLoading && (
                <div className={gridClasses}>
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <div key={i} className="w-full">
                            {viewMode === 'list' ? (
                                <div className="p-3 border rounded-lg bg-card flex gap-4 items-center w-full">
                                    <Skeleton className="w-[160px] h-[90px] rounded-md shrink-0 aspect-video" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-1/3" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-0 m-0">
                                    <div
                                        className={`relative w-full aspect-${
                                            collectionType === 'homevideos' ||
                                            collectionType === 'photos' ||
                                            viewMode === 'backdrop' ||
                                            viewMode === 'folder'
                                                ? 'video'
                                                : '2/3'
                                        } overflow-hidden rounded-md`}
                                    >
                                        <Skeleton className="w-full h-full" />
                                    </div>
                                    <Skeleton className="mt-2 h-4 w-3/4" />
                                    <Skeleton className="mt-1 h-3 w-1/4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {!isLoading && libraryData && !libraryData.items?.length && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderOpen />
                        </EmptyMedia>
                        <EmptyTitle>{t('library:no_items_title')}</EmptyTitle>
                        <EmptyDescription>{t('library:no_items_description')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {!isLoading && libraryData && libraryData.items && libraryData.items.length > 0 && (
                <>
                    <div className={gridClasses}>
                        {libraryData.items.map((item) => (
                            <LibraryItem
                                key={item.Id}
                                item={item}
                                posterUrl={posterUrls[item.Id!]}
                                t={t}
                                layoutMode={viewMode === 'list' ? 'list' : 'grid'}
                                onFolderClick={onNavigateToFolder}
                                posterAspectRatio={
                                    item.Type === 'MusicAlbum'
                                        ? 'square'
                                        : collectionType === 'homevideos' ||
                                            collectionType === 'photos' ||
                                            viewMode === 'backdrop' ||
                                            viewMode === 'folder'
                                          ? 'video'
                                          : '2/3'
                                }
                                detailLine={
                                    item.Type === 'MusicAlbum'
                                        ? item.AlbumArtist
                                            ? item.AlbumArtist
                                            : undefined
                                        : item.PremiereDate
                                          ? new Date(item.PremiereDate).getFullYear()
                                          : undefined
                                }
                            />
                        ))}
                    </div>
                    <ItemPagination
                        totalPages={totalPages}
                        currentPage={page}
                        onPageChange={onPageChange}
                    />
                </>
            )}
        </div>
    );
};

const LibraryPage = () => {
    const pageRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation('library');
    const { data: libraries } = useUserViews();
    const { data: currentUser } = useCurrentUser();
    const { refreshItemMetadata, isRefreshing } = useRefreshItemMetadata();

    const isAdmin = currentUser?.Policy?.IsAdministrator || false;

    const handleScanLibrary = () => {
        if (!activeLibraryId) return;

        refreshItemMetadata(
            {
                itemId: activeLibraryId,
                metadataRefreshMode: MetadataRefreshMode.Default,
                imageRefreshMode: MetadataRefreshMode.Default,
                recursive: true,
            },
            {
                onSuccess: () => {
                    toast.success(t('scan_success', '已启动媒体库扫描'));
                },
                onError: (err) => {
                    console.error('Scan library failed:', err);
                    toast.error(t('scan_failed', '启动扫描失败'));
                },
            }
        );
    };
    const [searchParams, setSearchParams] = useSearchParams();
    const sortBy = (searchParams.get('sortBy') as ItemSortBy) || 'Name';
    const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'Ascending';
    const pageParam = parseInt(searchParams.get('page') ?? '0', 10);
    const page = Number.isNaN(pageParam) ? 0 : pageParam;

    const setPage = useCallback((newPage: number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('page', String(newPage));
            return next;
        });
    }, [setSearchParams]);

    const setSortBy = useCallback((newSortBy: ItemSortBy) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('sortBy', newSortBy);
            next.set('page', '0');
            return next;
        });
    }, [setSearchParams]);

    const setSortOrder = useCallback((updater: SortOrder | ((prev: SortOrder) => SortOrder)) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            const currentOrder = (next.get('sortOrder') as SortOrder) || 'Ascending';
            const nextOrder = typeof updater === 'function' ? updater(currentOrder) : updater;
            next.set('sortOrder', nextOrder);
            next.set('page', '0');
            return next;
        });
    }, [setSearchParams]);

    // 本地持久化视图状态
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pelagica_library_view_mode');
            return (saved as ViewMode) || 'folder';
        }
        return 'folder';
    });

    const firstLibraryId = libraries?.Items?.[0]?.Id ?? '';
    const libraryIdFromUrl = searchParams.get('library') || '';
    const activeLibraryId =
        libraryIdFromUrl && libraries?.Items?.some((library) => library.Id === libraryIdFromUrl)
            ? libraryIdFromUrl
            : firstLibraryId;

    // 使用解耦的文件夹导航 Hook 管理路径栈与下钻返回
    const {
        folderPathStack,
        currentFolderId,
        navigateToFolder,
        navigateToBreadcrumb,
        navigateToRoot,
    } = useFolderNavigation(activeLibraryId);

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setPage(0);
        if (typeof window !== 'undefined') {
            localStorage.setItem('pelagica_library_view_mode', mode);
        }
    };

    const handleLibraryChange = (libraryId: string) => {
        // 切换不同库的时候通过 setSearchParams 隐式清空子级文件夹参数，防止路径错乱
        setSearchParams({
            library: libraryId,
            page: '0',
            sortBy,
            sortOrder,
        });
    };

    const libraryItems = libraries?.Items?.filter((library) =>
        SUPPORTED_LIBRARY_COLLECTION_TYPES.includes(library.CollectionType!)
    );

    // 如果 URL 中尚未指定 activeLibraryId，平滑补充 library 参数
    useEffect(() => {
        if (!searchParams.get('library') && activeLibraryId) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('library', activeLibraryId);
                return next;
            }, { replace: true });
        }
    }, [activeLibraryId, searchParams, setSearchParams]);

    return (
        <Page title={t('title')} requiresAuth className="flex-1">
            <Tabs
                value={activeLibraryId}
                onValueChange={handleLibraryChange}
                className="w-full"
                ref={pageRef}
            >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <TabsList className="max-w-full overflow-auto self-start hidden sm:flex">
                        {libraryItems?.map((library) => (
                            <TabsTrigger key={library.Id} value={library.Id ?? ''}>
                                <JellyfinLibraryIcon libraryType={library.CollectionType} />
                                {library.Name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <Select onValueChange={handleLibraryChange} value={activeLibraryId}>
                        <SelectTrigger size="sm" className="w-full sm:hidden">
                            <SelectValue placeholder={t('select_library')} />
                        </SelectTrigger>
                        <SelectContent>
                            {libraryItems?.map((library) => (
                                <SelectItem key={library.Id} value={library.Id ?? ''}>
                                    <JellyfinLibraryIcon libraryType={library.CollectionType} />
                                    {library.Name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-nowrap">
                        {/* 视图切换按钮组 */}
                        <ButtonGroup>
                            <Button
                                variant={viewMode === 'poster' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleViewModeChange('poster')}
                                title={t('view_poster', '海报网格')}
                                className="h-8 px-3"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'backdrop' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleViewModeChange('backdrop')}
                                title={t('view_backdrop', '横版网格')}
                                className="h-8 px-3"
                            >
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleViewModeChange('list')}
                                title={t('view_list', '列表模式')}
                                className="h-8 px-3"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'folder' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleViewModeChange('folder')}
                                title={t('view_folder', '文件夹视图')}
                                className="h-8 px-3"
                            >
                                <Folder className="h-4 w-4" />
                            </Button>
                        </ButtonGroup>

                        <div className="flex items-center gap-1">
                            <ButtonGroup>
                                <Select
                                    onValueChange={(value) => setSortBy(value as ItemSortBy)}
                                    value={sortBy}
                                >
                                    <SelectTrigger size="sm" className="h-8 px-2">
                                        <SelectValue placeholder="Sort" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Name">
                                            <CaseSensitive />
                                            {t('sort_name')}
                                        </SelectItem>
                                        <SelectItem value="DateCreated">
                                            <CalendarPlus />
                                            {t('sort_date_added')}
                                        </SelectItem>
                                        <SelectItem value="PremiereDate">
                                            <Calendar />
                                            {t('sort_premiere_date')}
                                        </SelectItem>
                                        <SelectItem value="CommunityRating">
                                            <Star />
                                            {t('sort_community_rating')}
                                        </SelectItem>
                                        <SelectItem value="Runtime">
                                            <Clock />
                                            {t('sort_runtime')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortOrder(prev => prev === 'Ascending' ? 'Descending' : 'Ascending')}
                                    title={sortOrder === 'Ascending' ? t('ascending') : t('descending')}
                                    className="h-8 px-2"
                                >
                                    {sortOrder === 'Ascending' ? (
                                        <ArrowUpNarrowWideIcon className="h-4 w-4" />
                                    ) : (
                                        <ArrowDownWideNarrow className="h-4 w-4" />
                                    )}
                                </Button>
                            </ButtonGroup>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleScanLibrary}
                                    disabled={isRefreshing}
                                    title={t('scan_library', '扫描新文件')}
                                    className="h-8 w-8 p-0"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {libraryItems?.map((library) => {
                    if (!library.Id) return null;

                    return (
                        <TabsContent key={library.Id} value={library.Id ?? ''}>
                            <LibraryContent
                                key={`${library.Id}-${currentFolderId}-${sortBy}-${sortOrder}`}
                                libraryId={library.Id}
                                collectionType={library.CollectionType}
                                pageRef={pageRef}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                page={page}
                                onPageChange={setPage}
                                viewMode={viewMode}
                                currentFolderId={currentFolderId}
                                folderPathStack={folderPathStack}
                                onNavigateToFolder={navigateToFolder}
                                onNavigateToBreadcrumb={navigateToBreadcrumb}
                                onNavigateToRoot={navigateToRoot}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </Page>
    );
};

export default LibraryPage;
