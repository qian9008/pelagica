import { createElement } from 'react';
import { Clapperboard, Disc3, Folder, MonitorPlay, UserRound } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

const ITEM_FALLBACK_ICONS: Record<string, LucideIcon> = {
    MusicAlbum: Disc3,
    Audio: Disc3,
    MusicArtist: UserRound,
    Person: UserRound,
    Movie: Clapperboard,
    Series: MonitorPlay,
};

export function renderItemFallbackIcon(type: string | undefined, props?: LucideProps) {
    const Icon = ITEM_FALLBACK_ICONS[type || ''] || Folder;
    return createElement(Icon, props);
}
