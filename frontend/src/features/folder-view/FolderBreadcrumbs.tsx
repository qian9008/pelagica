import { useTranslation } from 'react-i18next';
import type { FolderBreadcrumbItem } from './useFolderNavigation';

interface FolderBreadcrumbsProps {
    folderPathStack: FolderBreadcrumbItem[];
    onNavigateToRoot: () => void;
    onNavigateToBreadcrumb: (index: number) => void;
}

/**
 * 文件夹模式专属的独立面包屑导航条
 */
export const FolderBreadcrumbs = ({
    folderPathStack,
    onNavigateToRoot,
    onNavigateToBreadcrumb,
}: FolderBreadcrumbsProps) => {
    const { t } = useTranslation('library');

    return (
        <div className="flex items-center gap-1.5 mb-4 text-sm text-muted-foreground flex-wrap bg-accent/20 px-3 py-2 rounded-lg border border-accent/20">
            <button
                type="button"
                onClick={onNavigateToRoot}
                className="hover:text-primary font-medium transition-colors cursor-pointer"
            >
                {t('folder_root', '全部媒体')}
            </button>

            {folderPathStack.map((crumb, index) => {
                const isLast = index === folderPathStack.length - 1;
                return (
                    <div key={crumb.id} className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 select-none">/</span>
                        <button
                            type="button"
                            disabled={isLast}
                            onClick={() => onNavigateToBreadcrumb(index)}
                            className={`hover:text-primary transition-colors cursor-pointer ${
                                isLast ? 'text-foreground font-semibold pointer-events-none' : 'font-medium'
                            }`}
                        >
                            {crumb.name}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
