import type { RouteDef } from './types';

const splitPath = (pathname: string) => pathname.split('/').filter(Boolean);

export function matchRoute(
    routes: RouteDef[],
    pathname: string
): { route: RouteDef; params: Record<string, string> } | null {
    const pathSegments = splitPath(pathname);

    for (const route of routes) {
        const patternSegments = splitPath(route.pattern);
        if (patternSegments.length !== pathSegments.length) continue;

        const params: Record<string, string> = {};
        const matched = patternSegments.every((segment, index) => {
            if (segment.startsWith(':')) {
                params[segment.slice(1)] = decodeURIComponent(pathSegments[index]);
                return true;
            }
            return segment === pathSegments[index];
        });

        if (matched) return { route, params };
    }

    return null;
}

export function parsePath(to: string): { pathname: string; search: string } {
    const [pathname, search = ''] = to.split('?');
    return { pathname: pathname || '/', search: search ? `?${search}` : '' };
}
