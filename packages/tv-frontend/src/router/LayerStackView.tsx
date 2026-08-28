import { Suspense, useEffect, useState } from 'react';
import type { UIEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
    doesFocusableExist,
    getCurrentFocusKey,
    setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import ShellChrome from '@/components/ShellChrome';
import { useStackState } from './LayerStackProvider';
import { LayerActiveContext, LayerContext, LayerScrollContext } from './hooks';
import { topBarFocusKey } from './types';
import type { Layer } from './types';

const ORPHANED_FOCUS_CHECK_DELAY_MS = 50;

/** Layers deeper than this from the top are fully unmounted. Navigating back into one just remounts it fresh. */
const MOUNTED_LAYER_LIMIT = 4;

const RouteLoadingFallback = () => (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
);

const LayerView = ({ layer, isTop }: { layer: Layer; isTop: boolean }) => {
    const [scrolled, setScrolled] = useState(false);

    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        setScrolled(event.currentTarget.scrollTop > 20);
    };

    useEffect(() => {
        if (!isTop) return;

        const timeoutId = setTimeout(() => {
            const currentFocusKey = getCurrentFocusKey();
            if (currentFocusKey && doesFocusableExist(currentFocusKey)) return;

            if (layer.route.chrome === 'shell' && layer.route.activeItem) {
                setFocus(topBarFocusKey(layer.route.activeItem, layer.id));
            }
        }, ORPHANED_FOCUS_CHECK_DELAY_MS);

        return () => clearTimeout(timeoutId);
    }, [isTop, layer]);

    const Component = layer.route.component;
    const content =
        layer.route.chrome === 'shell' ? (
            <ShellChrome activeItem={layer.route.activeItem}>
                <Suspense fallback={<RouteLoadingFallback />}>
                    <Component />
                </Suspense>
            </ShellChrome>
        ) : (
            <Suspense fallback={<RouteLoadingFallback />}>
                <Component />
            </Suspense>
        );

    return (
        <div
            className="scrollbar-hide"
            style={{
                position: 'fixed',
                inset: 0,
                overflowY: 'auto',
                display: isTop ? undefined : 'none',
            }}
            onScroll={handleScroll}
        >
            <LayerContext.Provider value={layer}>
                <LayerActiveContext.Provider value={isTop}>
                    <LayerScrollContext.Provider value={scrolled}>
                        {content}
                    </LayerScrollContext.Provider>
                </LayerActiveContext.Provider>
            </LayerContext.Provider>
        </div>
    );
};

export default function LayerStackView() {
    const { layers } = useStackState();

    return (
        <>
            {layers.map((layer, index) => {
                const depthFromTop = layers.length - index;
                if (depthFromTop > MOUNTED_LAYER_LIMIT) return null;

                return <LayerView key={layer.id} layer={layer} isTop={depthFromTop === 1} />;
            })}
        </>
    );
}
