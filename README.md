# dan-aguirre.github.io

My personal site. You drive a little RC car around my desk at 3am, read whatever you crash into, then go out the window onto a low-poly island made of my favorite places in Guatemala (Antigua, Lake Atitlán, Acatenango with Fuego going off, a soccer pitch, a dance floor, a camp kitchen, a race track and a black sand beach).

- **Recruiter mode** (`cv.html`): the same content as a normal, printable page.
- **3 languages**: English, Spanish, Dutch.
- No framework and no build step. Plain HTML/CSS/JS plus three.js (vendored in `/vendor`, so no third-party scripts).

## Editing the text

Everything the site says is in **`content.js`**: English first, then Spanish (`es`), then Dutch (`nl`).
To change something, edit it on GitHub in the browser: open the file, click the pencil, change the words, and commit. The site updates in about a minute.

| File | What's in it |
|---|---|
| `content.js` | All text, links, skills, certs, projects |
| `resume.pdf` | The resume people download. Upload a new one with the same name to replace it |
| `world.js` | The two 3D worlds and the physics |
| `vehicles.js` | Every ride in the garage (and the boat) |
| `main.js` | UI, controls, progression, map, garage, the empanada game |
| `term.js` | Terminal commands |
| `audio.js` | Sound effects and the salsa/bachata synth. `MUSIC` lets you swap in your own royalty-free MP3s |
| `track.js` | Analytics code (GoatCounter) |

## Controls

WASD / arrows drive · Shift boost · Space brake · E interact · F fire (tank) · V garage · M map · T terminal · R reset · H horn.
On phones: hold anywhere and drag toward where you want to go.

## Easter eggs

There are 15 flags, a bunch of terminal commands, achievements and a few secrets. They're deliberately not listed here, because this repo is public. Go find them.

## Analytics (free, one-time setup)

1. Go to **https://www.goatcounter.com/signup**
2. Code: **`dan-aguirre`** (if that's taken, pick another and change `CODE` in `track.js` to match)
3. Your dashboard is **https://dan-aguirre.goatcounter.com**. It shows visits, pages, referrers, countries, browsers, OSes, screen sizes, plus events: `flag/*`, `ach/*`, `hack/*` (people poking at `/wp-admin`, `/.env`…), `term/<command>` (command names only, never arguments or passwords), `ride/*`, `resume`, `goal`, `cook`, `map`.

## Testing

`python3 -m http.server 8000` then open http://localhost:8000. Add `#perf` to the URL to expose `window.__perf` (renderer + world API) for debugging.

## Status

- [x] Desk + island worlds, physics, vehicles, garage, tank, boat, map with fog of war
- [x] Terminal, easter eggs, achievements, empanada game, race track
- [x] EN / ES / NL, recruiter mode, mobile controls
- [x] Tested in headless Chromium (desktop + mobile)
- [x] Deployed to GitHub Pages
- [ ] Sign up for GoatCounter (only you can do this, see above)
