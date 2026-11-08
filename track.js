// Analytics: GoatCounter (free, no cookies). Dashboard: https://<CODE>.goatcounter.com
// Set CODE to the code you picked when signing up. Set it to '' to turn analytics off.
const CODE = 'dan-aguirre';

export function track(path, title, event = false) {
  if (!CODE || location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|192\.168\.)/.test(location.hostname)) return;
  const q = new URLSearchParams({
    p: path,
    t: title || document.title,
    r: event ? '' : document.referrer,
    s: String(screen.width),
    rnd: Math.random().toString(36).slice(2, 7),
  });
  if (event) q.set('e', 'true');
  const url = `https://${CODE}.goatcounter.com/count?${q}`;
  if (!navigator.sendBeacon || !navigator.sendBeacon(url)) new Image().src = url;
}
