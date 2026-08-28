// Limit the number of items in a homerow section on TV to avoid performance issues
const HOMEROW_ITEM_LIMIT = 15;

export function getHomerowItemLimit(limit: number | undefined): number | undefined {
    return limit !== undefined ? Math.min(limit, HOMEROW_ITEM_LIMIT) : undefined;
}
