import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getMediaSegmentsApi } from '@jellyfin/sdk/lib/utils/api/media-segments-api';
import type { MediaSegmentDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';

export function useMediaSegments(itemId: string | null | undefined) {
    return useQuery<MediaSegmentDto[]>({
        queryKey: ['mediaSegments', itemId],
        queryFn: async (): Promise<MediaSegmentDto[]> => {
            try {
                const api = getApi();
                const mediaSegmentsApi = getMediaSegmentsApi(api);
                const response = await mediaSegmentsApi.getItemSegments({
                    itemId: itemId!,
                });
                return response.data.Items || [];
            } catch (error) {
                // 容错处理：若该媒体是被分享的资源，当前无权用户请求 Segments 会报 404
                // 此时直接吞掉错误并返回空数组，防止阻碍播放页正常加载
                console.warn('Failed to load media segments (could be a shared resource):', error);
                return [];
            }
        },
        enabled: !!itemId,
        ...getRetryConfig(),
    });
}
