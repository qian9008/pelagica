import { FolderClosed } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * 文件夹默认高精圆角封套（无主图且无反哺封面时展示）
 */
export const FolderWrapper = () => {
    const { t } = useTranslation('library');

    return (
        <div className="w-full h-full bg-gradient-to-tr from-accent/40 via-accent/20 to-background flex flex-col items-center justify-center rounded-md border border-accent/20 group-hover:border-primary/50 transition-all duration-300">
            <FolderClosed className="text-4xl text-amber-500 fill-amber-500/10 group-hover:scale-105 transition-transform duration-300" />
            <span className="text-xs text-muted-foreground mt-2 font-medium">
                {t('folder', '文件夹')}
            </span>
        </div>
    );
};

/**
 * 文件夹封面左上角精美微型标识徽章
 */
export const FolderCornerIndicator = () => {
    return (
        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-white rounded-md p-1.5 flex items-center justify-center z-20 shadow-md pointer-events-none">
            <FolderClosed className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        </div>
    );
};
