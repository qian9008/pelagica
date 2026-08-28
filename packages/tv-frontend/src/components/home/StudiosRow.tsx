import { useStudiosByItemCount } from '@pelagica/core';
import ScrollableHomeSection from './ScrollableHomeSection';
import { Skeleton } from '../ui/skeleton';
import StudioCard from '../StudioCard';
import MoreCard from './MoreCard';

interface StudiosRowProps {
    title?: string;
    limit?: number;
}

const CARD_CLASS = 'w-min min-w-60';

const StudiosRow = ({ title, limit }: StudiosRowProps) => {
    const { data, isLoading } = useStudiosByItemCount({ limit });
    const studios = data?.items;

    if ((!studios || studios.length === 0) && !isLoading) {
        return null;
    }

    return (
        <ScrollableHomeSection title={title || 'Studios'} focusable={!!studios}>
            {studios
                ? studios.map((studio) => (
                      <StudioCard studio={studio} key={studio.id} className={CARD_CLASS} />
                  ))
                : Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={CARD_CLASS}>
                          <Skeleton className="w-full aspect-video rounded-md" />
                      </div>
                  ))}
            <MoreCard to="/studios" type="vertical" className={CARD_CLASS} />
        </ScrollableHomeSection>
    );
};

export default StudiosRow;
