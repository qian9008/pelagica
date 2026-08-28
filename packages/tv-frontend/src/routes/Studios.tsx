import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudiosByItemCount } from '@pelagica/core';
import { FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useLayerFocusable } from '@/router/useLayerFocusable';
import { useLayerId } from '@/router';
import { PackageOpen } from 'lucide-react';
import StudioCard from '../components/StudioCard';
import ItemPagination from '../components/ItemPagination';
import { Skeleton } from '../components/ui/skeleton';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '../components/ui/empty';

const MIN_CARD_WIDTH = 240;
const GRID_GAP = 16;
const ROWS_PER_PAGE = 3;

const Studios = () => {
    const { t } = useTranslation(['library', 'common']);
    const [page, setPage] = useState(0);
    const gridRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(1);
    const searchInputFocusKey = `${useLayerId()}:studios-page-input`;
    const { ref, focusKey } = useLayerFocusable<object, HTMLDivElement>({
        preferredChildFocusKey: searchInputFocusKey,
    });

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

    const { data, isLoading } = useStudiosByItemCount({
        limit: pageSize,
        startIndex: page * pageSize,
    });

    const studios = data?.items;
    const totalPages = data?.totalCount ? Math.ceil(data.totalCount / pageSize) : 0;

    return (
        <FocusContext.Provider value={focusKey}>
            <div ref={ref} className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-2xl font-semibold">{t('common:studios')}</h1>
                </div>

                <div
                    ref={gridRef}
                    className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4"
                >
                    {isLoading
                        ? Array.from({ length: pageSize || 6 }).map((_, i) => (
                              <Skeleton key={i} className="w-full aspect-video rounded-md" />
                          ))
                        : studios?.map((studio) => (
                              <StudioCard studio={studio} key={studio.id} className="w-full" />
                          ))}
                </div>

                {!isLoading && studios?.length === 0 && (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <PackageOpen />
                            </EmptyMedia>
                            <EmptyTitle>{t('library:no_studios_found_title')}</EmptyTitle>
                            <EmptyDescription>{t('library:no_studios_found')}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                <ItemPagination
                    totalPages={totalPages}
                    currentPage={page}
                    onPageChange={(newPage) => setPage(newPage)}
                />
            </div>
        </FocusContext.Provider>
    );
};

export default Studios;
