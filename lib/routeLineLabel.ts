/** "to Destination" for line rows: strip via…, drop duplicated route short name, prefix `to `. */
export function formatLineDestinationLabel(routeShortName: string, raw: string): string {
  let t = raw.trim();
  if (!t) return 'to …';

  t = t.split(/\s+via\s+/i)[0].trim();

  const esc = routeShortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  t = t.replace(new RegExp(`^\\s*#?${esc}\\s*([-–:]\\s*)?`, 'i'), '').trim();

  if (!t) return 'to …';
  if (/^to\s/i.test(t)) return t;
  return `to ${t}`;
}
