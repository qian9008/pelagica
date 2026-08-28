export {};

declare global {
    interface TizenHwKeyEvent extends Event {
        keyName: string;
    }

    type AVPlayState = 'NONE' | 'IDLE' | 'READY' | 'PLAYING' | 'PAUSED';
    type AVPlayTrackType = 'VIDEO' | 'AUDIO' | 'TEXT';
    type AVPlayDisplayMethod =
        | 'PLAYER_DISPLAY_MODE_LETTER_BOX'
        | 'PLAYER_DISPLAY_MODE_FULL_SCREEN'
        | 'PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO';

    interface AVPlayError {
        message?: string;
    }

    interface AVPlayTrackInfo {
        index: number;
        type: AVPlayTrackType;
        extra_info: string;
    }

    interface AVPlayListener {
        onbufferingstart?: () => void;
        onbufferingprogress?: (percent: number) => void;
        onbufferingcomplete?: () => void;
        onstreamcompleted?: () => void;
        oncurrentplaytime?: (currentTime: number) => void;
        onevent?: (eventType: string, eventData: string) => void;
        onerror?: (eventType: string) => void;
        onsubtitlechange?: (
            duration: string,
            text: string,
            type: string,
            attributes: unknown[]
        ) => void;
        ondrmevent?: (drmEvent: string, drmData: string) => void;
    }

    interface AVPlayObject {
        open(url: string): void;
        close(): void;
        prepareAsync(
            successCallback: () => void,
            errorCallback?: (error: AVPlayError) => void
        ): void;
        play(): void;
        pause(): void;
        stop(): void;
        seekTo(
            milliseconds: number,
            successCallback?: () => void,
            errorCallback?: (error: AVPlayError) => void
        ): void;
        getState(): AVPlayState;
        /** Milliseconds since the start of the media. */
        getCurrentTime(): number;
        /** Total media length in milliseconds. */
        getDuration(): number;
        setSelectTrack(type: AVPlayTrackType, index: number): void;
        getTotalTrackInfo(): AVPlayTrackInfo[];
        setDisplayRect(x: number, y: number, width: number, height: number): void;
        setDisplayMethod(method: AVPlayDisplayMethod): void;
        setListener(listener: AVPlayListener): void;
        setTimeoutForBuffering(seconds: number): void;
    }

    interface TizenNetworkPropertyValue {
        ipAddress?: string;
    }

    interface Window {
        tizen?: {
            application: {
                getCurrentApplication: () => { exit: () => void };
            };
            tvinputdevice?: {
                registerKey: (keyName: string) => void;
                unregisterKey: (keyName: string) => void;
            };
            tvaudiocontrol?: {
                setMute: (mute: boolean) => void;
                isMute: () => boolean;
                setVolume: (volume: number) => void;
                getVolume: () => number;
            };
            systeminfo?: {
                getPropertyValue: (
                    property: 'WIFI_NETWORK' | 'ETHERNET_NETWORK',
                    successCallback: (value: TizenNetworkPropertyValue) => void,
                    errorCallback?: (error: unknown) => void
                ) => void;
            };
        };
        webapis?: {
            avplay: AVPlayObject;
        };
    }
}
