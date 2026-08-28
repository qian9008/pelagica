import { useEffect, useState } from 'react';
import { getLogoPath } from '../lib/studio-logos';

interface UseStudioLogoResult {
    logoPath: string | undefined;
    isLoading: boolean;
    error: Error | undefined;
}

export function useStudioLogo(studioName: string | undefined): UseStudioLogoResult {
    const [logoPath, setLogoPath] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>(undefined);

    useEffect(() => {
        if (!studioName) {
            setLogoPath(undefined);
            setIsLoading(false);
            setError(undefined);
            return;
        }

        let cancelled = false;

        setIsLoading(true);
        setError(undefined);

        getLogoPath(studioName)
            .then((path) => {
                if (cancelled) return;
                setLogoPath(path);
                setIsLoading(false);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e instanceof Error ? e : new Error(String(e)));
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [studioName]);

    return { logoPath, isLoading, error };
}
