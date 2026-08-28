import './tizen-globals.d.ts';
import type { TvNavigationAdapter } from './types';
import { dispatchTvBackKey } from './backKeyEvent';

export const tizenNavigationAdapter: TvNavigationAdapter = {
    init() {
        window.addEventListener('tizenhwkey', (event) => {
            if ((event as TizenHwKeyEvent).keyName === 'back') dispatchTvBackKey();
        });
    },
    registerMediaKeys() {
        try {
            window.tizen?.tvinputdevice?.registerKey('MediaPlayPause');
            window.tizen?.tvinputdevice?.registerKey('MediaPlay');
            window.tizen?.tvinputdevice?.registerKey('MediaPause');
        } catch {
            // Not running on a Tizen device (e.g. browser dev)
        }
    },
    exitApp() {
        window.tizen?.application.getCurrentApplication().exit();
    },
};
