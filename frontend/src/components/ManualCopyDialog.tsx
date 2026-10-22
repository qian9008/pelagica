/**
 * 手动复制兜底弹窗。
 *
 * 用途：当浏览器把我们所有自动写入剪贴板的路径都拦掉时（明文 HTTP、WebView、
 * 权限策略、无用户手势等），直接展示原文并自动全选，用户按 Ctrl/⌘+C 即可带走。
 *
 * 设计取舍：不做「再试一次」按钮 —— 自动方案已经全部失败，重试没有意义。
 * 只保证用户能在 3 秒内看到文本、选中、手工复制。
 */
import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ManualCopyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    text: string;
    title?: string;
    description?: string;
}

export default function ManualCopyDialog({
    open,
    onOpenChange,
    text,
    title,
    description,
}: ManualCopyDialogProps) {
    const { t } = useTranslation('item');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        // 等 Dialog 入场动画结束再聚焦选中，否则 select() 会被后续动画打断
        const timer = window.setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        }, 120);
        return () => window.clearTimeout(timer);
    }, [open, text]);

    // 关闭时重置「已选中」状态，避免下次打开沿用旧值
    const handleOpenChange = (next: boolean) => {
        if (!next) setCopied(false);
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title || t('manual_copy_title', '手动复制直链')}</DialogTitle>
                    <DialogDescription>
                        {description ||
                            t(
                                'manual_copy_desc',
                                '浏览器无法确认自动复制结果。链接已为你选中，按 Ctrl/⌘ + C 即可确保复制。'
                            )}
                    </DialogDescription>
                </DialogHeader>

                <textarea
                    ref={textareaRef}
                    readOnly
                    value={text}
                    rows={4}
                    spellCheck={false}
                    className="w-full resize-none rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-primary/40"
                    onSelect={() => setCopied(false)}
                />

                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        {t('close', '关闭')}
                    </Button>
                    <Button
                        onClick={() => {
                            textareaRef.current?.focus();
                            textareaRef.current?.select();
                            setCopied(true);
                        }}
                        className="gap-1.5"
                    >
                        {copied ? t('selected', '已选中') : t('select_all', '全选链接')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
