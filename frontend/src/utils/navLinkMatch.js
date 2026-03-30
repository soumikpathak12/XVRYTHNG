/**
 * True when `item.to` matches the current location. For links with a query string,
 * pathname and all query params in `to` must match (extra params on the page URL are OK).
 * Fixes NavLink highlighting both `/leads?segment=b2c` and `/leads?segment=b2b` as active.
 */
export function navItemMatchesLocation(item, pathname, search) {
  if (!item?.to) return false;
  const to = String(item.to);
  if (to.includes('?')) {
    const [path, qs] = to.split('?');
    if (pathname !== path) return false;
    const want = new URLSearchParams(qs);
    const have = new URLSearchParams(search);
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false;
    }
    return true;
  }
  if (item.children?.length) return false;
  return pathname.startsWith(to);
}
