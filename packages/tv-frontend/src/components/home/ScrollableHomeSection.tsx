import type { PropsWithChildren } from 'react';
import { FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useLayerFocusable as useFocusable } from '@/router/useLayerFocusable';
import { RowIdentityContext } from '@/lib/row-identity-context';

const ScrollableHomeSection = ({
    title,
    focusable = true,
    children,
}: PropsWithChildren<{ title: string; focusable?: boolean }>) => {
    const { ref, focusKey } = useFocusable<object, HTMLDivElement>({
        focusable,
        saveLastFocusedChild: true,
    });

    return (
        <section className="min-w-0 w-full flex flex-col">
            <h2 className="text-lg font-semibold">{title}</h2>
            <FocusContext.Provider value={focusKey}>
                <RowIdentityContext.Provider value={title}>
                    <div
                        ref={ref}
                        className="scrollbar-hide min-w-0 flex gap-4 overflow-x-auto -mx-6 px-6 py-3"
                    >
                        {children}
                    </div>
                </RowIdentityContext.Provider>
            </FocusContext.Provider>
        </section>
    );
};

export default ScrollableHomeSection;
