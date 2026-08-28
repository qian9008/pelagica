import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type {
    UseFocusableConfig,
    UseFocusableResult,
} from '@noriginmedia/norigin-spatial-navigation';
import { useLayerActive } from './hooks';

/**
 * Wraps norigin's useFocusable so elements in a hidden (non-top) layer stop participating in spatial navigation.
 */
export function useLayerFocusable<P, E = HTMLElement>(
    config?: UseFocusableConfig<P>
): UseFocusableResult<E> {
    const isLayerActive = useLayerActive();

    return useFocusable<P, E>({
        ...config,
        focusable: (config?.focusable ?? true) && isLayerActive,
    });
}
