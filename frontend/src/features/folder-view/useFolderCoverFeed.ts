import { useState, useEffect } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import {
    getApi,
    getUserId,
    getPrimaryImageUrl,
    getBackdropUrl,
} from '@pelagica/core';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';

/**
 * 文件夹智能封面反哺与子项播放进度提取 Hook
 * 自动递归检索子视频，反哺最具观赏性的封面与当前最短播放进度
 */
export function useFolderCoverFeed(
    item: BaseItemDto,
    defaultPosterUrl: string,
    posterAspectRatio: string = '2/3'
) {
    const isPhysicalFolder = item.Type === 'Folder';
    const isCollectionFolder = item.Type === 'CollectionFolder';
    const isFolder = Boolean(item.IsFolder || isPhysicalFolder || isCollectionFolder);

    const hasPrimaryImage = Boolean(item.ImageTags?.Primary);

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

                // 递归拉取该物理目录下前 10 个视频实体，计算内部的播放进度和反哺封面
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

                // 1. 优先挑选有进度的子视频
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

                // 2. 如果子视频没有任何进度，选取第一个视频作为封面源
                if (!activeSubItem && subItems.length > 0) {
                    activeSubItem = subItems[0];
                }

                // 3. 提取该子视频封面并反哺给当前文件夹卡片
                if (activeSubItem && activeSubItem.Id) {
                    const subId = activeSubItem.Id;
                    const subTag = activeSubItem.ImageTags?.Primary;
                    let calculatedCover = '';

                    if (posterAspectRatio === 'video') {
                        // 横版模式：优先拉取 Backdrop 背景图，无则使用 Primary 降级
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
                console.warn('[FolderCoverFeed] Sub-progress and cover fetch failed:', err);
            }
        };

        fetchFolderSubData();

        return () => {
            active = false;
        };
    }, [isFolder, item.Id, posterAspectRatio]);

    // 当前卡片最终采用的封面图片
    const finalPosterUrl = isPhysicalFolder
        ? hasPrimaryImage
            ? defaultPosterUrl
            : folderCoverUrl
        : defaultPosterUrl;

    // 是否渲染黄色文件夹图标：物理文件夹无主图且无子图片反哺时渲染
    const shouldRenderFolderIcon = isPhysicalFolder && !hasPrimaryImage && !folderCoverUrl;

    return {
        isFolder,
        isPhysicalFolder,
        isCollectionFolder,
        folderProgress,
        folderCoverUrl,
        childCount,
        finalPosterUrl,
        shouldRenderFolderIcon,
    };
}
