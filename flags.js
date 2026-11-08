// 15 flags. w* are found by driving, h* by poking at the site like a hacker would.
// Only SHA-256 hashes live here, so reading the source doesn't hand you the answers.
import { track } from './track.js';

export const HASHES = {
  w1: '6485eeff9c6b9b2f4343d13fc9e660b0b504c89864e213c4ff92cf1dd7063a1e',
  w2: '7f8c9c3ddbb521e8fe847aede7782f6b57f42844f0cc8a9a62775a37440b630a',
  w3: 'ce4e75fedb1d010dce1f84153eeb60ca2b8dedd9da85731c98bea021a800add5',
  w4: '470b96c8c788a15811c91c6d3ad9ae67fea402242903ef1282d55c3ce599c4a0',
  w5: '2b69bfb33ac3fee06769d3dd4b83cbd7b256e81075933cc37296ef6cbdd988b1',
  w6: '3157a2bd8d1b797c3d5464033eece796120c042fd2c1cae484f55007270aff53',
  w7: 'eae7689e6c00e267fece0b2877fcd563eef30ce20c580c45b4fe55b59f260be3',
  w8: 'f3c9e363b88bd97081ad1800c50b48fb17544d6a1fd17c47979aa8aca591375d',
  h1: 'afe8fc83ed0087cf46a98b727da33a59efa295dad9db599f634c3cfc66292059',
  h2: 'f9c8aa9209f5ee70028cb8ad879d96f873010ab7a9152f4c5e054f26f057ab64',
  h3: '0f45d0ae3fe87e150bf5f5c11e584f9d320d7ce672277d583769938fc5b4da07',
  h4: 'f2723b813eba1d6ef9ea08aa22d603ba3d02f607bd549bd1c56d45acda8969b7',
  h5: '009fabf03e8da6de56da5a110283b6a3f2673a9bf55435a5251d8f1a0c750f8f',
  h6: '1bca0f18a5e03b9599eda79814818a7beec6fae37ac02dbd97952d96201228cf',
  h7: 'de146c8e654f774ab963702f33e6711dbae5d562c6c68bdbad01a042525fbe0a',
};
export const HINTS = {
  w1: 'desk: check behind things', w2: 'desk: get some air', w3: 'desk: by the light',
  w4: 'outside: go up', w5: 'outside: walk the plank', w6: 'outside: through the arch', w7: 'outside: by the tent',
  w8: 'outside: dance for a bit (8 seconds)',
  h1: 'web: view-source is recon', h2: 'web: what do robots know?', h3: 'web: a well-known place to report bugs',
  h4: 'web: cookies are just suggestions', h5: 'term: cat /etc/shadow, then crack it', h6: 'web: find a login page that does not exist',
  h7: 'web: open devtools and say hi',
};
export const TOTAL = Object.keys(HASHES).length;

let got = new Set();
try { got = new Set(JSON.parse(localStorage.getItem('dan.flags') || '[]')); } catch {}
const listeners = [];
export const flags = () => got;
export const onFlagChange = (fn) => listeners.push(fn);

export function capture(id) {
  if (!HASHES[id] || got.has(id)) return false;
  got.add(id);
  try { localStorage.setItem('dan.flags', JSON.stringify([...got])); } catch {}
  track('flag/' + id, 'flag ' + id, true);
  if (got.size === TOTAL) track('flag/ALL', 'all flags', true);
  listeners.forEach(fn => fn(id));
  return true;
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Returns the flag id if the text is a real flag, else null.
export async function submit(text) {
  const h = await sha256(text.trim());
  return Object.keys(HASHES).find(k => HASHES[k] === h) || null;
}
