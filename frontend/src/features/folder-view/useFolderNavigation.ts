import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';

export interface FolderBreadcrumbItem {
    id: string;
    name: string;
}

/**
 * 文件夹穿透下钻与路径栈管理的解耦 Hook
 * 严格以 URL SearchParams 作为唯一事实来源 (Single Source of Truth)，杜绝状态竞态与时序冲突
 */
export function useFolderNavigation(activeLibraryId: string) {
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. 从 URL 派生当前文件夹层级栈
    const folderPathStack = useMemo<FolderBreadcrumbItem[]>(() => {
        const param = searchParams.get('folderPath');
        if (!param) return [];
        try {
            const parsed = JSON.parse(param);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('[FolderNavigation] Failed to parse folderPath from URL:', e);
            return [];
        }
    }, [searchParams]);

    // 2. 当前实际请求的 parent 目录 ID
    const currentFolderId = useMemo(() => {
        if (folderPathStack.length > 0) {
            return folderPathStack[folderPathStack.length - 1].id;
        }
        return activeLibraryId;
    }, [folderPathStack, activeLibraryId]);

    // 3. 进入子级文件夹（原子操作：压入路径栈，并重置页码为 0）
    const navigateToFolder = useCallback(
        (folder: FolderBreadcrumbItem) => {
            setSearchParams((prev) => {
                let currentStack: FolderBreadcrumbItem[] = [];
                const param = prev.get('folderPath');
                if (param) {
                    try {
                        currentStack = JSON.parse(param);
                    } catch {
                        currentStack = [];
                    }
                }
                const nextStack = [...currentStack, folder];
                const next = new URLSearchParams(prev);
                next.set('folderPath', JSON.stringify(nextStack));
                next.set('page', '0'); // 原子将分页重置为 0
                return next;
            });
        },
        [setSearchParams]
    );

    // 4. 面包屑层级快速返回
    const navigateToBreadcrumb = useCallback(
        (index: number) => {
            setSearchParams((prev) => {
                let currentStack: FolderBreadcrumbItem[] = [];
                const param = prev.get('folderPath');
                if (param) {
                    try {
                        currentStack = JSON.parse(param);
                    } catch {
                        currentStack = [];
                    }
                }
                const nextStack = currentStack.slice(0, index + 1);
                const next = new URLSearchParams(prev);
                if (nextStack.length > 0) {
                    next.set('folderPath', JSON.stringify(nextStack));
                } else {
                    next.delete('folderPath');
                }
                next.set('page', '0');
                return next;
            });
        },
        [setSearchParams]
    );

    // 5. 返回媒体库根目录
    const navigateToRoot = useCallback(() => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('folderPath');
            next.set('page', '0');
            return next;
        });
    }, [setSearchParams]);

    return {
        folderPathStack,
        currentFolderId,
        navigateToFolder,
        navigateToBreadcrumb,
        navigateToRoot,
    };
}
