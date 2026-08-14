export const useAutoDetectServerAddress = () => {
    if (typeof window === 'undefined') {
        return {
            fullAddress: '',
            protocol: '',
            hostname: '',
            port: '',
        };
    }

    const protocol = window.location.protocol; // http: 或 https:
    const hostname = window.location.hostname;
    const port = window.location.port;
    const portSuffix = port ? `:${port}` : '';
    const fullAddress = `${protocol}//${hostname}${portSuffix}`;

    return {
        fullAddress,
        protocol,
        hostname,
        port,
    };
};
