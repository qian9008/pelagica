import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ItemPagination from '@/components/ItemPagination';
import { fetchMyShares, deleteShare, type ShareItem } from '@/api/share';

export const SharingTab = () => {
    const { t } = useTranslation('settings');
    const [myShares, setMyShares] = useState<ShareItem[]>([]);
    const [totalShares, setTotalShares] = useState(0);
    const [sharesPage, setSharesPage] = useState(0);
    const [isLoadingShares, setIsLoadingShares] = useState(false);

    const loadMyShares = async () => {
        setIsLoadingShares(true);
        try {
            const res = await fetchMyShares(sharesPage * 10, 10);
            setMyShares(res.Items || []);
            setTotalShares(res.TotalRecordCount || 0);
        } catch (err) {
            console.error('Failed to load my shares:', err);
        } finally {
            setIsLoadingShares(false);
        }
    };

    const handleCancelShare = async (id: number) => {
        try {
            const res = await deleteShare(id);
            if (res.success) {
                toast.success(res.msg || t('share_cancelled', '已取消分享'));
                loadMyShares();
            } else {
                toast.error(res.msg || t('cancel_failed', '操作失败'));
            }
        } catch (err) {
            console.error(err);
            toast.error(t('cancel_error', '连接后台服务失败'));
        }
    };

    useEffect(() => {
        loadMyShares();
    }, [sharesPage]);

    return (
        <div className="w-full max-w-4xl">
            <h1 className="mb-2 mt-2 text-2xl font-bold leading-none tracking-tight">
                {t('category_sharing', '分享管理')}
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">
                {t('sharing_description', '查看并管理你分享给他人的视频列表。')}
            </p>

            {isLoadingShares ? (
                <div className="space-y-2 mt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : myShares.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">
                    {t('no_shares_found', '你当前没有分享任何影片。')}
                </p>
            ) : (
                <div className="mt-4 space-y-3">
                    <div className="overflow-x-auto rounded-lg border border-border/40">
                        <table className="w-full border-collapse text-left text-sm text-muted-foreground">
                            <thead className="bg-accent/40 text-foreground font-semibold border-b border-border/40">
                                <tr>
                                    <th className="p-3">{t('shared_media_name', '影片名称')}</th>
                                    <th className="p-3">{t('shared_target_user', '分享给')}</th>
                                    <th className="p-3">{t('shared_date', '分享时间')}</th>
                                    <th className="p-3 text-right">{t('actions', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {myShares.map((share) => (
                                    <tr key={share.id} className="hover:bg-accent/10">
                                        <td className="p-3 font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                                            《{share.media_name || share.media_id}》
                                        </td>
                                        <td className="p-3">{share.target_username}</td>
                                        <td className="p-3 text-xs">{share.created_at}</td>
                                        <td className="p-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCancelShare(share.id)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                {t('cancel_share', '取消分享')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalShares > 10 && (
                        <div className="mt-4">
                            <ItemPagination
                                totalPages={Math.ceil(totalShares / 10)}
                                currentPage={sharesPage}
                                onPageChange={setSharesPage}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
