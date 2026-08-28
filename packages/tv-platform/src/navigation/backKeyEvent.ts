const TV_BACK_KEY_EVENT = 'pelagica:tv-back-key';

export function dispatchTvBackKey(): void {
    window.dispatchEvent(new Event(TV_BACK_KEY_EVENT));
}

export function onBackKey(handler: () => void): () => void {
    window.addEventListener(TV_BACK_KEY_EVENT, handler);
    return () => window.removeEventListener(TV_BACK_KEY_EVENT, handler);
}
