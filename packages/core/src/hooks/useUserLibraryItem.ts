import { useQuery } from '@tanstack/react-query';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { getApi } from '../api/getApi';
import { getRetryConfig } from '../utils/authErrorHandler';
import { getUserId } from '../utils/localstorageCredentials';

interface UserLibraryItemQueryOptions {
    staleTime?: number;
    gcTime?: number;
}

export function useUserLibraryItem(
    itemId: string | null | undefined,
    userId?: string | undefined,
    options?: UserLibraryItemQueryOptions
) {
    const resolvedUserId = userId ?? getUserId() ?? undefined;

    return useQuery<BaseItemDto>({
        queryKey: ['userLibraryItem', itemId, resolvedUserId],
        queryFn: async () => {
            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const api = getApi();
            const userLibraryApi = getUserLibraryApi(api);

            const response = await userLibraryApi.getItem({
                itemId,
                userId: resolvedUserId,
            });

            return response.data;
        },
        enabled: !!itemId,
        ...getRetryConfig(),
        staleTime: options?.staleTime ?? 30_000,
        gcTime: options?.gcTime,
    });
}
