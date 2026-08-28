const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const DEFAULT_STUDIO_LOGO_SIZE = 'w300';
const DEFAULT_MONO_LOGO_COLOR = 'ffffff';
const DEFAULT_MONO_LOGO_COLOR_2 = 'bababa';

const VALID_STUDIO_LOGO_SIZES = new Set(['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original']);

const HEX_COLOR_PATTERN = /^[0-9a-fA-F]{6}$/;

function normalizeHexColor(raw: string | undefined, fallback: string): string {
    const trimmed = (raw ?? '').trim().replace(/^#/, '');
    if (trimmed === '') {
        return fallback;
    }
    if (!HEX_COLOR_PATTERN.test(trimmed)) {
        throw new Error('color must be a 6-digit hex value');
    }
    return trimmed.toLowerCase();
}

function monoLogoFilter(color: string, color2: string): string {
    return `_filter(duotone,${color},${color2})`;
}

export function buildTmdbImageUrl(
    logoPath: string,
    options: {
        size?: string;
        mono?: boolean;
        color?: string;
        color2?: string;
    } = {}
): string {
    if (!logoPath || logoPath.trim() === '') {
        throw new Error('logoPath is required');
    }

    const size = (options.size ?? '').trim() || DEFAULT_STUDIO_LOGO_SIZE;
    if (!VALID_STUDIO_LOGO_SIZES.has(size)) {
        throw new Error('Invalid size parameter');
    }

    const mono = options.mono ?? false;
    const monoColor = normalizeHexColor(options.color, DEFAULT_MONO_LOGO_COLOR);
    const monoColor2 = normalizeHexColor(options.color2, DEFAULT_MONO_LOGO_COLOR_2);

    let sizeSegment = size;
    if (mono) {
        sizeSegment += monoLogoFilter(monoColor, monoColor2);
    }

    return TMDB_IMAGE_BASE_URL + sizeSegment + logoPath;
}
