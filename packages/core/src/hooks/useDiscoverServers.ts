import { useCallback, useEffect, useRef, useState } from 'react';
import { discoverServers, type DiscoveredServer } from '../utils/discoverServers';

export interface UseDiscoverServersResult {
    servers: DiscoveredServer[];
    isScanning: boolean;
    progress: number;
    start: (localIp?: string | null) => void;
    cancel: () => void;
}

export const useDiscoverServers = (): UseDiscoverServersResult => {
    const [servers, setServers] = useState<DiscoveredServer[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const controllerRef = useRef<AbortController | null>(null);

    const cancel = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setIsScanning(false);
    }, []);

    const start = useCallback((localIp: string | null = null) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setServers([]);
        setProgress(0);
        setIsScanning(true);

        discoverServers({
            localIp,
            signal: controller.signal,
            onServerFound: (server) => {
                setServers((prev) =>
                    prev.some((s) => s.address === server.address) ? prev : [...prev, server]
                );
            },
            onProgress: (scanned, total) => {
                setProgress(total > 0 ? scanned / total : 0);
            },
        }).finally(() => {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
                setIsScanning(false);
            }
        });
    }, []);

    useEffect(() => () => controllerRef.current?.abort(), []);

    return { servers, isScanning, progress, start, cancel };
};
