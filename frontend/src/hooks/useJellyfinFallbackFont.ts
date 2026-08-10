import { useState, useEffect } from 'react';
import { getServerUrl, getAccessToken } from '@/utils/localstorageCredentials';

export const useJellyfinFallbackFont = () => {
    const [fallbackFontBlobUrl, setFallbackFontBlobUrl] = useState<string | null>(null);
    const [isFallbackFontsLoaded, setIsFallbackFontsLoaded] = useState(false);

    useEffect(() => {
        const fetchFallback = async () => {
            const serverUrl = getServerUrl();
            const token = getAccessToken();
            if (!serverUrl || !token) {
                setIsFallbackFontsLoaded(true);
                return;
            }

            const sanitizedServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

            try {
                // 先获取服务端支持的回落字体列表
                const listUrl = `${sanitizedServerUrl}/FallbackFont/Fonts`;
                const listRes = await fetch(listUrl, {
                    headers: { 'Authorization': `MediaBrowser Token="${token}"` }
                });
                
                if (!listRes.ok) throw new Error('Failed to fetch fallback fonts list');
                const fontsList = await listRes.json();
                
                if (!fontsList || fontsList.length === 0) {
                    console.warn('No fallback fonts available on the server');
                    setIsFallbackFontsLoaded(true);
                    return;
                }

                // 取出有效的字体名称
                const fontName = fontsList[0].Name || 'Default';
                const targetUrl = `${sanitizedServerUrl}/FallbackFont/Fonts/${fontName}?api_key=${token}`;

                const response = await fetch(targetUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    setFallbackFontBlobUrl(URL.createObjectURL(blob));
                } else {
                    console.warn('Failed to load fallback font file from server');
                }
            } catch (err) {
                console.error('Failed to manually fetch fallback font:', err);
            } finally {
                setIsFallbackFontsLoaded(true);
            }
        };

        fetchFallback();
    }, []);

    return { fallbackFontBlobUrl, isFallbackFontsLoaded };
};
