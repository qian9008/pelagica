import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useSetStatsConsent } from '../hooks/api/statsConsent/useSetStatsConsent';
import { useStatsConsent } from '../hooks/api/statsConsent/useStatsConsent';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Trans, useTranslation } from 'react-i18next';

const StatsConsentModal = () => {
    const { t } = useTranslation('common');
    const { data: statsConsent } = useStatsConsent();
    const setStatsConsent = useSetStatsConsent();
    const [dismissed, setDismissed] = useState(false);

    if (statsConsent === undefined) return null;

    const open = statsConsent === 'unknown' && !dismissed;

    const handleConsent = (consent: boolean) => {
        setStatsConsent.mutate(consent);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setDismissed(true); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('stats_consent_title')}</DialogTitle>
                    <DialogDescription>
                        <Trans
                            i18nKey="stats_consent_message"
                            components={{
                                anchor: (
                                    <a
                                        href="https://stats.pelagica.app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    />
                                ),
                            }}
                        />
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleConsent(false)}
                        disabled={setStatsConsent.isPending}
                    >
                        {t('stats_consent_reject')}
                    </Button>
                    <Button
                        onClick={() => handleConsent(true)}
                        disabled={setStatsConsent.isPending}
                    >
                        <CircleCheck />
                        {t('stats_consent_accept')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StatsConsentModal;
