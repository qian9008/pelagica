export interface DiscoveredServer {
    address: string;
    id?: string;
    name: string;
}

interface PublicSystemInfo {
    ServerName?: string;
    Id?: string;
}

const JELLYFIN_PORT = 8096;
const PROBE_TIMEOUT_MS = 400;
const CHUNK_SIZE = 15;
const COMMON_SUBNET_PREFIXES = ['192.168.1.', '192.168.0.', '10.0.0.', '192.168.178.'];

const probeAddress = async (
    address: string,
    parentSignal: AbortSignal
): Promise<DiscoveredServer | null> => {
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    parentSignal.addEventListener('abort', onParentAbort);
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
        const response = await fetch(`${address}/System/Info/Public`, {
            signal: controller.signal,
        });
        if (!response.ok) return null;

        const info: PublicSystemInfo = await response.json();
        let name = info.ServerName?.trim();
        if (!name) {
            try {
                name = new URL(address).hostname;
            } catch {
                name = address;
            }
        }

        return { address, id: info.Id, name };
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
        parentSignal.removeEventListener('abort', onParentAbort);
    }
};

const localSubnetPrefix = (localIp: string | null): string | null => {
    const parts = localIp?.split('.');
    return parts?.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.` : null;
};

const orderedPrefixesFrom = (localIp: string | null): string[] => {
    const localPrefix = localSubnetPrefix(localIp);
    const rest = COMMON_SUBNET_PREFIXES.filter((prefix) => prefix !== localPrefix);
    return localPrefix ? [localPrefix, ...rest] : rest;
};

export interface DiscoverServersOptions {
    /** The device's own local IP, so its subnet is scanned (with priority)  */
    localIp?: string | null;
    signal: AbortSignal;
    onServerFound?: (server: DiscoveredServer) => void;
    onProgress?: (scanned: number, total: number) => void;
}

export const discoverServers = async ({
    localIp = null,
    signal,
    onServerFound,
    onProgress,
}: DiscoverServersOptions): Promise<DiscoveredServer[]> => {
    const localPrefix = localSubnetPrefix(localIp);
    const prefixes = orderedPrefixesFrom(localIp);
    const found: DiscoveredServer[] = [];
    const totalIps = prefixes.length * 254;
    let scanned = 0;

    for (const prefix of prefixes) {
        if (signal.aborted) break;

        const addresses = Array.from(
            { length: 254 },
            (_, i) => `http://${prefix}${i + 1}:${JELLYFIN_PORT}`
        );

        for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
            if (signal.aborted) break;

            const chunk = addresses.slice(i, i + CHUNK_SIZE);
            const results = await Promise.all(
                chunk.map((address) => probeAddress(address, signal))
            );

            for (const server of results) {
                if (server && !found.some((existing) => existing.address === server.address)) {
                    found.push(server);
                    onServerFound?.(server);
                }
            }

            scanned += chunk.length;
            onProgress?.(scanned, totalIps);
        }

        // Stop guessing if we found a server on the same subnet as the local IP
        if (prefix === localPrefix && found.length > 0) break;
    }

    return found;
};
