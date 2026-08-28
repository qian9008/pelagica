import { useUserLibraryItem } from '../useUserLibraryItem';

export function useItemPlayState(itemId: string | undefined, userId: string | undefined) {
    const query = useUserLibraryItem(itemId, userId);

    return {
        ...query,
        data: query.data
            ? {
                  played: query.data.UserData?.Played ?? false,
                  playCount: query.data.UserData?.PlayCount ?? 0,
                  lastPlayedDate: query.data.UserData?.LastPlayedDate ?? null,
              }
            : undefined,
    };
}
