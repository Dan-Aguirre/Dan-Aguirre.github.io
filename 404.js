import { track } from '/track.js';
const path = location.pathname + location.search;
document.querySelector('#path').textContent = path;
track(path, '404', false);
const juicy = /(admin|wp-|login|phpmyadmin|cpanel|\.git|\.env|config|backup|dashboard|shell|api)/i;
const form = document.querySelector('#login');
if (juicy.test(path)) { form.hidden = false; track('hack/probe' + location.pathname.slice(0, 40), 'probe', true); }
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const u = form.u.value, p = form.p.value, msg = document.querySelector('#msg');
  // only the fact that someone tried is counted, never what they typed
  track('hack/login-attempt', 'login attempt', true);
  if (/('|")\s*(or|\|\|)\s*('|"|\d|true)|--|#|\/\*|union\s+select/i.test(u + ' ' + p)) {
    msg.textContent = 'SQLi detected. There is no database here, but you get a flag for trying: ' + atob('REFOe29yXzFfZXF1YWxzXzF9') + '  (submit it in the terminal)';
    msg.className = 'msg ok';
  } else if (u === 'admin' && p === 'admin') {
    msg.textContent = 'admin/admin? in this economy? Invalid credentials.';
    msg.className = 'msg';
  } else {
    msg.textContent = 'Invalid credentials. This attempt has been logged. (it really has, hi 👋)';
    msg.className = 'msg';
  }
});
