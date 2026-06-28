import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import Page from '../Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoSaveConfig } from './useAutoSaveConfig';
import { SettingsSkeleton } from './components/SettingsSkeleton';
import { GeneralTab } from './tabs/GeneralTab';
import { HomeSectionsTab } from './tabs/HomeSectionsTab';
import { ItemPageTab } from './tabs/ItemPageTab';
import { BrandingTab } from './tabs/BrandingTab';
import { ThemesTab } from './tabs/ThemesTab';
import { LinksTab } from './tabs/LinksTab';
import { SharingTab } from './tabs/SharingTab';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';

const SettingsPage = () => {
    const { t } = useTranslation('settings');
    const { config, loading, error, saveConfig } = useAutoSaveConfig();
    const { data: user } = useCurrentUser();
    const isAdmin = user?.Policy?.IsAdministrator || false;
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || (isAdmin ? 'general' : 'sharing');

    if (loading) {
        return (
            <Page title={t('title')} requiresAuth>
                <SettingsSkeleton />
            </Page>
        );
    }

    if (error || !config) {
        return (
            <Page title={t('title')} requiresAuth>
                Error loading settings.
            </Page>
        );
    }

    return (
        <Page title={t('title')} className="flex-1 flex flex-col" requiresAuth>
            <Tabs defaultValue={activeTab} onValueChange={(val) => setSearchParams({ tab: val })}>
                <TabsList className="flex flex-wrap h-auto">
                    {isAdmin && (
                        <>
                            <TabsTrigger value="general">{t('category_general')}</TabsTrigger>
                            <TabsTrigger value="homesections">{t('category_homesections')}</TabsTrigger>
                            <TabsTrigger value="itempage">{t('category_itempage')}</TabsTrigger>
                            <TabsTrigger value="branding">{t('category_branding')}</TabsTrigger>
                            <TabsTrigger value="themes">{t('category_themes')}</TabsTrigger>
                            <TabsTrigger value="links">{t('category_links')}</TabsTrigger>
                        </>
                    )}
                    <TabsTrigger value="sharing">{t('category_sharing', '分享管理')}</TabsTrigger>
                </TabsList>
                {isAdmin && (
                    <>
                        <TabsContent value="general">
                            <GeneralTab config={config} saveConfig={saveConfig} />
                        </>
                        <TabsContent value="homesections">
                            <HomeSectionsTab config={config} saveConfig={saveConfig} />
                        </>
                        <TabsContent value="itempage">
                            <ItemPageTab config={config} saveConfig={saveConfig} />
                        </>
                        <TabsContent value="branding">
                            <BrandingTab config={config} saveConfig={saveConfig} />
                        </>
                        <TabsContent value="themes">
                            <ThemesTab config={config} saveConfig={saveConfig} />
                        </>
                        <TabsContent value="links">
                            <LinksTab config={config} saveConfig={saveConfig} />
                        </>
                    </>
                )}
                <TabsContent value="sharing">
                    <SharingTab />
                </TabsContent>
            </Tabs>
        </Page>
    );
};

export default SettingsPage;
