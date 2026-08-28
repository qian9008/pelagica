const DB_NAME = 'studios-logos-cache';
const STORE_NAME = 'logos';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LATEST_RELEASE_URL = 'https://studios.pelagica.app/companies_minimal.json';

let memoryCache: Logos | undefined;
let memoryCacheTs: number | undefined;

type Logos = Map<string, MinimalLogoCompany>;

interface MinimalLogoCompany {
    logo_path: string;
    type: 'production_company' | 'tv_network';
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbSet(db: IDBDatabase, key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function fetchAndStoreLogos(db: IDBDatabase): Promise<Logos> {
    const res = await fetch(LATEST_RELEASE_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch logos: ${res.status} ${res.statusText}`);
    }

    const raw = (await res.json()) as Record<string, MinimalLogoCompany>;
    const fresh: Logos = new Map(Object.entries(raw));

    console.log(`Fetched ${fresh.size} logos from ${LATEST_RELEASE_URL}`);

    await idbSet(db, 'logos', fresh);
    await idbSet(db, 'logos_ts', Date.now());

    return fresh;
}

let backgroundRefreshInFlight = false;

function refreshInBackground(db: IDBDatabase): void {
    if (backgroundRefreshInFlight) return;
    backgroundRefreshInFlight = true;

    fetchAndStoreLogos(db)
        .then((fresh) => {
            memoryCache = fresh;
            memoryCacheTs = Date.now();
        })
        .catch((e) => {
            console.warn('Background logo refresh failed:', e);
        })
        .finally(() => {
            backgroundRefreshInFlight = false;
        });
}

let loadInFlight: Promise<Logos> | undefined;

export async function getLogos(): Promise<Logos> {
    if (memoryCache) {
        if (!memoryCacheTs || Date.now() - memoryCacheTs >= WEEK_MS) {
            openDB().then((db) => refreshInBackground(db));
        }
        return memoryCache;
    }

    if (loadInFlight) {
        return loadInFlight;
    }

    loadInFlight = (async () => {
        const db = await openDB();
        const cached = await idbGet<Logos>(db, 'logos');
        const ts = await idbGet<number>(db, 'logos_ts');

        const isStale = !ts || Date.now() - ts >= WEEK_MS;

        if (cached) {
            memoryCache = cached;
            memoryCacheTs = ts;
            if (isStale) {
                refreshInBackground(db);
            }
            return cached;
        }

        try {
            const fresh = await fetchAndStoreLogos(db);
            memoryCache = fresh;
            memoryCacheTs = Date.now();
            return fresh;
        } catch (e) {
            throw new Error('No cached logos available and network fetch failed', { cause: e });
        }
    })();

    try {
        return await loadInFlight;
    } finally {
        loadInFlight = undefined;
    }
}

export async function getLogoPath(studioName: string): Promise<string | undefined> {
    const logos = await getLogos();
    return logos.get(studioName)?.logo_path;
}

export async function clearLogosCache(): Promise<void> {
    memoryCache = undefined;
    memoryCacheTs = undefined;

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
