import { useEffect, useRef, useState } from 'react';
import { useParams } from '@/router';
import { useTranslation } from 'react-i18next';
import { getUserId, useItem, useStudioItems } from '@pelagica/core';
import ItemPagination from '../components/ItemPagination';
import ItemCardGrid from '../components/ItemCardGrid';

const MIN_CARD_WIDTH = 160;
const GRID_GAP = 16;
const ROWS_PER_PAGE = 5;

const StudioDetail = () => {
    const { itemId: studioId } = useParams<{ itemId: string }>();
    const { t } = useTranslation(['library', 'item', 'common']);
    const { data: studio, isLoading: isStudioLoading } = useItem(
        studioId,
        false,
        getUserId() ?? undefined
    );
    const gridRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(1);
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (!gridRef.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            setColumns(Math.max(1, Math.floor((width + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP))));
        });

        observer.observe(gridRef.current);
        return () => observer.disconnect();
    }, []);

    const pageSize = columns * ROWS_PER_PAGE;

    const { data, isLoading } = useStudioItems(studioId ?? '', {
        limit: pageSize,
        startIndex: page * pageSize,
    });

    const totalPages = data?.totalCount ? Math.ceil(data.totalCount / pageSize) : 0;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">
                {studio?.Name ?? (isStudioLoading ? t('common:loading') : t('item:item_not_found'))}
            </h1>
            <ItemCardGrid ref={gridRef} items={data?.items} isLoading={isLoading} autoFocusFirst />
            {!isLoading && data?.items.length === 0 && (
                <p className="text-muted-foreground">{t('library:no_items_description')}</p>
            )}
            <ItemPagination
                totalPages={totalPages}
                currentPage={page}
                onPageChange={(newPage) => setPage(newPage)}
            />
        </div>
    );
};

export default StudioDetail;
