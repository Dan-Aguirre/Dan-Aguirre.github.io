# dan-aguirre.github.io

My personal site. You drive a little RC car around my desk at 3am, read whatever you crash into, then go out the window into a low-poly Guatemala (Antigua, Lake Atitlán, Acatenango with Fuego going off, a soccer pitch, a dance floor, a campsite).

- **Recruiter mode** (`cv.html`) has the same content as a normal, printable page.
- **3 languages**: English, Spanish, Dutch.
- **15 flags**: 8 you drive to, 7 you hack for (view-source, robots.txt, security.txt, cookies, a crackable `/etc/shadow`, a fake admin login, devtools).
- No framework and no build step. Plain HTML/CSS/JS plus three.js (vendored in `/vendor`, so no third-party scripts).

## Editing the text

Everything the site says is in **`content.js`**: English first, then Spanish (`es`), then Dutch (`nl`).
To change something, edit it on GitHub in the browser: open the file, click the pencil, change the words, and commit. The site updates in about a minute.

| File | What's in it |
|---|---|
| `content.js` | All text, links, skills, certs |
| `resume.pdf` | The resume people download. Upload a new one with the same name to replace it |
| `world.js` | The 3D worlds, car and physics |
| `main.js` | UI, controls, progression |
| `term.js` | Terminal commands |
| `audio.js` | Engine sounds and the salsa/bachata synth. `MUSIC` lets you swap in your own royalty-free MP3s |
| `track.js` | Analytics code (GoatCounter) |

## Analytics (free, one-time setup)

1. Go to **https://www.goatcounter.com/signup**
2. Code: **`dan-aguirre`** (if that's taken, pick another and change `CODE` in `track.js` to match)
3. Use your email, make a password, done
4. Your dashboard is **https://dan-aguirre.goatcounter.com**. It shows visits, pages, referrers, countries, browsers, OSes, screen sizes, and custom events:
   - `flag/w1` … `flag/h7`: who found which flags
   - `hack/probe/...` and `hack/login-attempt`: people poking at `/wp-admin`, `/.env`, etc.
   - `term/<command>`: terminal commands people ran (the command name only, never arguments or passwords)
   - `resume`, `start`, `goal`, `konami`, `lang/es`, `world/outside`

## Status

- [x] Desk world, outside world, car, physics, flags, guide arrow, progression
- [x] Terminal, easter eggs, 404 trap, security.txt, robots.txt
- [x] EN / ES / NL, recruiter mode, mobile controls
- [x] Tested in headless Chromium (desktop + mobile)
- [x] Deployed to GitHub Pages
- [ ] Sign up for GoatCounter (only you can do this, see above)

## Running it locally (optional)

```
python3 -m http.server 8000
```
then open http://localhost:8000
