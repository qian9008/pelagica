import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import Page from '../Page';
import { fetchSharedWithMe, fetchMyShares, deleteShare, type ShareItem } from '@/api/share';
import LibraryItem from '../Library/LibraryItem';
import ItemPagination from '@/components/ItemPagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    LayoutGrid,
    Image as ImageIcon,
    List,
    FolderHeart,
    Trash2,
} from 'lucide-react';
import { getPrimaryImageUrl, getBackdropUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

type ViewMode = 'poster' | 'backdrop' | 'list';

const ITEM_ROWS = 5;

function getColumnCount(width: number, viewMode: ViewMode): number {
    if (viewMode === 'list') return 1;
    if (viewMode === 'backdrop') {
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

export default function SharedLibraryPage() {
    const { t } = useTranslation(['library', 'common', 'settings']);
    const [searchParams, setSearchParams] = useSearchParams();

    // 选中标签
    const activeTab = searchParams.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';

    // View Mode (用于 Incoming 共享给我的影片)
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pelagica_shared_view_mode');
            return (saved as ViewMode) || 'poster';
        }
        return 'poster';
    });

    const pageParam = parseInt(searchParams.get('page') ?? '0', 10);
    const [page, setPage] = useState<number>(Number.isNaN(pageParam) ? 0 : pageParam);
    const [pageSize, setPageSize] = useState(
        () => getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640, viewMode) * ITEM_ROWS
    );

    // 数据状态 (Incoming 共享给我的影片)
    const [items, setItems] = useState<(BaseItemDto & { ShareOwnerName?: string })[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // 数据状态 (Outgoing 我发起的分享)
    const [myShares, setMyShares] = useState<ShareItem[]>([]);
    const [totalShares, setTotalShares] = useState(0);
    const [isLoadingShares, setIsLoadingShares] = useState(false);
    const OUTGOING_PAGE_SIZE = 10;

    // 监听窗口缩放调整分页大小
    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getColumnCount(window.innerWidth, viewMode) * ITEM_ROWS;
            setPageSize(newPageSize);
            setPage(0);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode]);

    useEffect(() => {
        const newPageSize = getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640, viewMode) * ITEM_ROWS;
        setPageSize(newPageSize);
        setPage(0);
    }, [viewMode]);

    // 请求“共享给我的”数据
    useEffect(() => {
        if (activeTab !== 'incoming') return;
        let active = true;
        async function loadIncomingData() {
            setIsLoading(true);
            try {
                const res = await fetchSharedWithMe(page * pageSize, pageSize);
                if (active) {
                    setItems(res.Items || []);
                    setTotalCount(res.TotalRecordCount || 0);
                }
            } catch (err) {
                console.error('Failed to load shared with me items:', err);
                if (active) {
                    setItems([]);
                    setTotalCount(0);
                }
            } finally {
                if (active) setIsLoading(false);
            }
        }
        loadIncomingData();
        return () => {
            active = false;
        };
    }, [page, pageSize, activeTab]);

    // 请求“我发起的分享”数据
    const loadMyShares = async () => {
        setIsLoadingShares(true);
        try {
            const res = await fetchMyShares(page * OUTGOING_PAGE_SIZE, OUTGOING_PAGE_SIZE);
            setMyShares(res.Items || []);
            setTotalShares(res.TotalRecordCount || 0);
        } catch (err) {
            console.error('Failed to load my shares:', err);
            setMyShares([]);
            setTotalShares(0);
        } finally {
            setIsLoadingShares(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'outgoing') {
            loadMyShares();
        }
    }, [activeTab, page]);

    // 取消分享处理
    const handleCancelShare = async (id: number) => {
        try {
            const res = await deleteShare(id);
            if (res.success) {
                toast.success(res.msg || t('settings:share_cancelled', '已取消分享'));
                loadMyShares();
            } else {
                toast.error(res.msg || t('settings:cancel_failed', '操作失败'));
            }
        } catch (err) {
            console.error(err);
            toast.error(t('settings:cancel_error', '连接后台服务失败'));
        }
    };

    // 同步 URL 参数
    useEffect(() => {
        setSearchParams({
            tab: activeTab,
            page: String(page),
        });
    }, [page, activeTab, setSearchParams]);

    // 切换 Tab 处理
    const handleTabChange = (value: string) => {
        setPage(0);
        setSearchParams({
            tab: value,
            page: '0',
        });
    };

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setPage(0);
        if (typeof window !== 'undefined') {
            localStorage.setItem('pelagica_shared_view_mode', mode);
        }
    };

    const posterUrls = useMemo(() => {
        return items.reduce(
            (acc, item) => {
                if (viewMode === 'backdrop' || viewMode === 'list') {
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
    }, [items, viewMode]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const gridClasses = useMemo(() => {
        if (viewMode === 'list') {
            return 'w-full gap-3 mt-2 grid grid-cols-1';
        }
        if (viewMode === 'backdrop') {
            return 'w-full gap-4 mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
        }
        return 'w-full gap-4 mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9';
    }, [viewMode]);

    return (
        <Page title={t('shared_library', '共享库')} requiresAuth className="flex-1">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <FolderHeart className="h-8 w-8 text-primary" />
                        <span>{t('shared_library', '共享库')}</span>
                    </h2>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="incoming" className="cursor-pointer">
                            {t('shared_incoming', '共享给我的')}
                        </TabsTrigger>
                        <TabsTrigger value="outgoing" className="cursor-pointer">
                            {t('shared_outgoing', '我分享的')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="incoming" className="flex flex-col gap-4 outline-none">
                        <div className="flex justify-end">
                            <ButtonGroup>
                                <Button
                                    variant={viewMode === 'poster' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleViewModeChange('poster')}
                                    title={t('view_poster', '海报网格')}
                                    className="h-8 px-3 cursor-pointer"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'backdrop' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleViewModeChange('backdrop')}
                                    title={t('view_backdrop', '横版网格')}
                                    className="h-8 px-3 cursor-pointer"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleViewModeChange('list')}
                                    title={t('view_list', '列表模式')}
                                    className="h-8 px-3 cursor-pointer"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </ButtonGroup>
                        </div>

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
                                                        viewMode === 'backdrop' ? 'video' : '2/3'
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

                        {!isLoading && items.length === 0 && (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <FolderHeart className="h-12 w-12 text-muted-foreground/60" />
                                    </EmptyMedia>
                                    <EmptyTitle>{t('no_shared_items', '共享库为空')}</EmptyTitle>
                                    <EmptyDescription>
                                        {t('no_shared_items_desc', '其他用户分享给你的视频将会在这里显示。')}
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}

                        {!isLoading && items.length > 0 && (
                            <>
                                <div className={gridClasses}>
                                    {items.map((item) => (
                                        <LibraryItem
                                            key={item.Id}
                                            item={item}
                                            posterUrl={posterUrls[item.Id!]}
                                            t={t}
                                            layoutMode={viewMode === 'list' ? 'list' : 'grid'}
                                            posterAspectRatio={
                                                viewMode === 'backdrop' ? 'video' : '2/3'
                                            }
                                            detailLine={
                                                item.PremiereDate
                                                    ? new Date(item.PremiereDate).getFullYear()
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <ItemPagination
                                        totalPages={totalPages}
                                        currentPage={page}
                                        onPageChange={setPage}
                                    />
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="outgoing" className="outline-none">
                        {isLoadingShares ? (
                            <div className="space-y-2 mt-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : myShares.length === 0 ? (
                            <p className="text-sm text-muted-foreground mt-4">
                                {t('settings:no_shares_found', '你当前没有分享任何影片。')}
                            </p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <div className="overflow-x-auto rounded-lg border border-border/40">
                                    <table className="w-full border-collapse text-left text-sm text-muted-foreground">
                                        <thead className="bg-accent/40 text-foreground font-semibold border-b border-border/40">
                                            <tr>
                                                <th className="p-3 w-12 text-center">#</th>
                                                <th className="p-3">{t('settings:shared_media_name', '影片名称')}</th>
                                                <th className="p-3">{t('settings:shared_target_user', '分享给')}</th>
                                                <th className="p-3">{t('settings:shared_date', '分享时间')}</th>
                                                <th className="p-3 text-right">{t('settings:actions', '操作')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                            {myShares.map((share, index) => (
                                                <tr key={share.id} className="hover:bg-accent/10">
                                                    <td className="p-3 text-center font-medium text-muted-foreground">
                                                        {page * OUTGOING_PAGE_SIZE + index + 1}
                                                    </td>
                                                    <td className="p-3 font-medium text-foreground break-all max-w-[200px] sm:max-w-xs">
                                                        《{share.media_name || share.media_id}》
                                                    </td>
                                                    <td className="p-3">{share.target_username}</td>
                                                    <td className="p-3 text-xs">{share.created_at}</td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelShare(share.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            {t('settings:cancel_share', '取消分享')}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalShares > OUTGOING_PAGE_SIZE && (
                                    <div className="mt-4">
                                        <ItemPagination
                                            totalPages={Math.ceil(totalShares / OUTGOING_PAGE_SIZE)}
                                            currentPage={page}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </Page>
    );
}
