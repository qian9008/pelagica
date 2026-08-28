export interface TvNavigationAdapter {
    /** One-time startup hookup: starts translating this platform's native remote-key events into the canonical back-key event. */
    init(): void;
    /** Opts the app into receiving hardware media keys (play/pause/etc.) as ordinary keydown events, if the platform requires that. */
    registerMediaKeys(): void;
    /** Exits the app, if the platform supports/expects that. */
    exitApp(): void;
}
