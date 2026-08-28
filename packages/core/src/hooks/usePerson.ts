import { useUserLibraryItem } from './useUserLibraryItem';

export function usePerson(itemId: string | null | undefined, userId?: string | undefined) {
    return useUserLibraryItem(itemId, userId, {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}
