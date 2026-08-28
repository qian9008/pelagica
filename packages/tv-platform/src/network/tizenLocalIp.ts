import '../navigation/tizen-globals.d.ts';

const getProperty = (property: 'WIFI_NETWORK' | 'ETHERNET_NETWORK'): Promise<string | null> =>
    new Promise((resolve) => {
        try {
            window.tizen?.systeminfo?.getPropertyValue(
                property,
                (value) => resolve(value.ipAddress || null),
                () => resolve(null)
            );
            if (!window.tizen?.systeminfo) resolve(null);
        } catch {
            resolve(null);
        }
    });

/**
 * Returns the TV's local IP address via Tizens systeminfo API
 */
export const getTizenLocalIpAddress = async (): Promise<string | null> => {
    const wifiIp = await getProperty('WIFI_NETWORK');
    if (wifiIp) return wifiIp;
    return getProperty('ETHERNET_NETWORK');
};
