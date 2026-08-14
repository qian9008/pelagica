export type StatsConsent = 'granted' | 'denied' | 'unknown';



export const getStatsConsent = async (): Promise<StatsConsent> => {
    // 纯前端模式下，不再依赖 4321 后端的 /api/stats-consent，而是存在本地
    const stored = localStorage.getItem('pelagica_stats_consent');
    if (stored) {
        return stored as StatsConsent;
    }
    return 'unknown';
};

export const setStatsConsent = async (consent: boolean): Promise<void> => {
    const value: StatsConsent = consent ? 'granted' : 'denied';
    localStorage.setItem('pelagica_stats_consent', value);
};
