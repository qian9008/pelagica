import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
    BUILT_IN_PRESET_IDS,
    createCustomPresetSelection,
    createDefaultCustomPreset,
    type CustomEqualizerPreset,
    type EqualizerBand,
    type EqualizerSelection,
} from './presets';
import { BUILT_IN_PRESET_ICONS, CUSTOM_PRESET_ICON } from './presetIcons';
import CustomPresetEditor from './CustomPresetEditor';

interface EqualizerPopoverProps {
    preset: EqualizerSelection;
    onPresetChange: (preset: EqualizerSelection) => void;
    customPresets: CustomEqualizerPreset[];
    onSaveCustomPreset: (preset: CustomEqualizerPreset) => void;
    onDeleteCustomPreset: (id: string) => void;
    onPreviewBandsChange: (bands: EqualizerBand[] | null) => void;
    sleepFadeEnabled: boolean;
    onSleepFadeChange: (enabled: boolean) => void;
    equalizerAvailable: boolean;
    className?: string;
}

type EditorState =
    | { mode: 'create'; preset: CustomEqualizerPreset }
    | { mode: 'edit'; preset: CustomEqualizerPreset };

const EqualizerPopover = ({
    preset,
    onPresetChange,
    customPresets,
    onSaveCustomPreset,
    onDeleteCustomPreset,
    onPreviewBandsChange,
    sleepFadeEnabled,
    onSleepFadeChange,
    equalizerAvailable,
    className,
}: EqualizerPopoverProps) => {
    const { t } = useTranslation('player');
    const [editorState, setEditorState] = useState<EditorState | null>(null);
    const isActive = preset !== 'flat' || sleepFadeEnabled;

    useEffect(() => {
        if (!editorState) {
            onPreviewBandsChange(null);
            return;
        }

        onPreviewBandsChange(editorState.preset.bands);
    }, [editorState, onPreviewBandsChange]);

    const closeEditor = () => {
        setEditorState(null);
        onPreviewBandsChange(null);
    };

    const handleSaveEditor = () => {
        if (!editorState) return;
        onSaveCustomPreset(editorState.preset);
        onPresetChange(createCustomPresetSelection(editorState.preset.id));
        closeEditor();
    };

    return (
        <Popover
            onOpenChange={(open) => {
                if (!open) closeEditor();
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'cursor-pointer',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                        className
                    )}
                    aria-label={t('equalizer')}
                    title={t('equalizer')}
                >
                    <SlidersHorizontal />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                side="top"
                sideOffset={8}
                className="z-[110] w-72 max-h-[min(70vh,28rem)] overflow-y-auto p-3"
            >
                {editorState ? (
                    <CustomPresetEditor
                        preset={editorState.preset}
                        onChange={(nextPreset) =>
                            setEditorState({ mode: editorState.mode, preset: nextPreset })
                        }
                        onSave={handleSaveEditor}
                        onCancel={closeEditor}
                    />
                ) : (
                    <>
                        <p className="mb-2 text-sm font-medium">{t('equalizer')}</p>
                        <ul className="space-y-0.5">
                            {BUILT_IN_PRESET_IDS.map((id) => {
                                const Icon = BUILT_IN_PRESET_ICONS[id];
                                const isSelected = preset === id;

                                return (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                                isSelected && 'bg-accent'
                                            )}
                                            onClick={() => onPresetChange(id)}
                                        >
                                            <Icon className="size-4 shrink-0 text-muted-foreground" />
                                            <span className="flex-1 text-left">
                                                {t(`equalizerPresets.${id}`)}
                                            </span>
                                            <Check
                                                className={cn(
                                                    'size-4 shrink-0',
                                                    isSelected ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {customPresets.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    {t('customPresets')}
                                </p>
                                <ul className="space-y-0.5">
                                    {customPresets.map((customPreset) => {
                                        const selection = createCustomPresetSelection(customPreset.id);
                                        const isSelected = preset === selection;
                                        const Icon = CUSTOM_PRESET_ICON;

                                        return (
                                            <li key={customPreset.id}>
                                                <div
                                                    className={cn(
                                                        'flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent',
                                                        isSelected && 'bg-accent'
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm"
                                                        onClick={() => onPresetChange(selection)}
                                                    >
                                                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                                                        <span className="truncate text-left">
                                                            {customPreset.name}
                                                        </span>
                                                        <Check
                                                            className={cn(
                                                                'ml-auto size-4 shrink-0',
                                                                isSelected ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                    </button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="shrink-0"
                                                        aria-label={t('customPresetEdit')}
                                                        onClick={() =>
                                                            setEditorState({
                                                                mode: 'edit',
                                                                preset: {
                                                                    ...customPreset,
                                                                    bands: customPreset.bands.map(
                                                                        (band) => ({ ...band })
                                                                    ),
                                                                },
                                                            })
                                                        }
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                                        aria-label={t('customPresetDelete')}
                                                        onClick={() =>
                                                            onDeleteCustomPreset(customPreset.id)
                                                        }
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() =>
                                setEditorState({
                                    mode: 'create',
                                    preset: createDefaultCustomPreset(t('customPresetDefaultName')),
                                })
                            }
                        >
                            <Plus className="size-4" />
                            {t('customPresetNew')}
                        </Button>

                        {preset === 'sleep' && (
                            <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{t('sleepFade')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('sleepFadeDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={sleepFadeEnabled}
                                    onCheckedChange={onSleepFadeChange}
                                    aria-label={t('sleepFade')}
                                />
                            </div>
                        )}

                        {!equalizerAvailable && (
                            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                                {t('equalizerUnavailable')}
                            </p>
                        )}
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default EqualizerPopover;
