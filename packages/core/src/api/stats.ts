import { withBasePath } from '../utils/basePath';
import { getPlatform } from './jellyfinClient';

export type StatsConsent = 'granted' | 'denied' | 'unknown';

const LOCAL_STATS_CONSENT_KEY = 'pelagica_stats_consent';

const numberToStatsConsent = (value: number): StatsConsent => {
    switch (value) {
        case 2:
            return 'denied';
        case 1:
            return 'unknown';
        case 0:
            return 'granted';
        default:
            return 'unknown';
    }
};

const hasStatsConsentBackend = () => {
    const platform = getPlatform();
    return platform !== 'tizen' && platform !== 'webos';
};

const getLocalStatsConsent = (): StatsConsent => {
    const value = localStorage.getItem(LOCAL_STATS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
};

const setLocalStatsConsent = (consent: boolean): void => {
    localStorage.setItem(LOCAL_STATS_CONSENT_KEY, consent ? 'granted' : 'denied');
};

export const getStatsConsent = async (): Promise<StatsConsent> => {
    // 纯前端或已有本地记录时优先保证可用
    const local = getLocalStatsConsent();
    if (local !== 'unknown') return local;

    if (!hasStatsConsentBackend()) {
        return local;
    }

    try {
        const res = await fetch(withBasePath('/api/stats-consent'));
        if (!res.ok) {
            return local;
        }
        const data = await res.json();
        return numberToStatsConsent(data.consent);
    } catch {
        return local;
    }
};

export const setStatsConsent = async (consent: boolean): Promise<void> => {
    setLocalStatsConsent(consent);

    if (!hasStatsConsentBackend()) {
        return;
    }

    try {
        await fetch(withBasePath('/api/stats-consent?consent=' + consent), {
            method: 'POST',
        });
    } catch {
        // 纯前端模式静默忽略后端上报异常
    }
};
