import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';
import { getUserId } from '@/utils/localstorageCredentials';

export function usePlayerItem(
    itemId: string | null | undefined,
    _enableUserData?: boolean | undefined,
    userId?: string | undefined
) {
    // 使用 getUserLibraryApi.getItem 替代 getItemsApi.getItems
    // 原因：getItemsApi.getItems 生成 /Users/{userId}/Items?Ids=... 格式（query 参数）
    // 而 ge2o 的 LoadCacheItems 拦截的是 /Users/{userId}/Items/{itemId} 路径格式
    // 使用 getUserLibraryApi.getItem 生成正确的路径格式，分享权限提权逻辑才能触发
    const resolvedUserId = userId ?? getUserId() ?? undefined;

    return useQuery<BaseItemDto>({
        queryKey: ['playerItem', itemId, resolvedUserId],
        queryFn: async (): Promise<BaseItemDto> => {
            if (!itemId || !resolvedUserId) {
                throw new Error('缺少 itemId 或 userId');
            }
            const api = getApi();
            const userLibraryApi = getUserLibraryApi(api);
            const response = await userLibraryApi.getItem({
                itemId,
                userId: resolvedUserId,
            });
            const item = response.data;
            if (!item) {
                throw new Error(`Item not found: ${itemId}`);
            }
            return item;
        },
        enabled: !!itemId,
        ...getRetryConfig(),
    });
}
