// The terminal on the laptop. Output is always textContent, never HTML.
import { LINKS } from './content.js';
import { flags, capture, submit, sha256, HINTS, TOTAL } from './flags.js';
import { track } from './track.js';

const FILES = { 'about.txt': 'about', 'engagements/': 'work', 'trophies/': 'comps', 'certs/': 'certs', 'lab/': 'lab', 'teaching/': 'teach', 'business/': 'biz', 'contact.txt': 'contact' };
const PW_HASH = '06612c2832341c9e69c890d3dea465f8baede4895cad1e5ab22c7f513ab5758d';
const H5 = '0b4fde809001bb78e60ba97bdcf2af12bedf77d806441b7631';
const SHADOW = [
  'root:*:19700:0:99999:7:::',
  'dan:$1$atitlan$wo.7xMl0USfgdJ5VihgAI/:19700:0:99999:7:::',
  'recruiter:!:19700:0:99999:7:::',
];
const PASSWD = [
  'root:x:0:0:root:/root:/usr/sbin/nologin',
  'dan:x:1000:1000:Daniel Aguirre:/home/dan:/bin/bash',
  'recruiter:x:1001:1001:hi!:/home/recruiter:/usr/bin/hire',
  'intern:x:1002:1002:coffee runs:/tmp:/usr/sbin/coffee',
];

export function createTerminal({ root, getT, world, act, setLang, onClose }) {
  const out = root.querySelector('.term-out');
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  const ps1 = root.querySelector('.ps1');
  const hist = [];
  let hi = 0, mode = null, tries = 0, pending = null;
  const mirror = [];

  function print(text = '', cls = '') {
    for (const line of String(text).split('\n')) {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = line || ' ';
      out.append(d);
      mirror.push(line);
    }
    out.scrollTop = out.scrollHeight;
    world?.setLaptop([...mirror.slice(-14), 'dan@desk:~$ _']);
  }
  const sectionText = (id) => {
    const s = getT().s[id];
    const parts = [s.title, ''];
    if (s.lead) parts.push(s.lead, '');
    (s.body || []).forEach(p => parts.push(p, ''));
    (s.facts || []).forEach(([k, v]) => parts.push(`${k.padEnd(12)} ${v}`));
    (s.items || []).forEach(it => parts.push(`> ${it.h}${it.when ? '  (' + it.when + ')' : ''}`, it.role ? '  ' + it.role : '', '  ' + it.t, ''));
    if (s.school) parts.push(s.school);
    if (id === 'contact') parts.push(LINKS.email, LINKS.linkedin, LINKS.github);
    return parts.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  };

  const C = {
    help: () => print([
      'commands:',
      '  whoami            who is this guy',
      '  ls [-a]           look around',
      '  cat <file>        read something',
      '  open <place>      drive there (try: open lab)',
      '  resume            grab the PDF',
      '  hire              the correct choice',
      '  flags             what you have found so far',
      '  submit <flag>     turn in a DAN{...} flag',
      '  lang en|es|nl     switch language',
      '  ssh dan@outside   go outside',
      '  clear, history, exit',
      '',
      '  achievements      what you have unlocked',
      '  garage            change your ride',
      '',
      'there are more commands than this. you are a hacker, find them.',
    ].join('\n')),
    whoami: () => print('dan: offensive security, consulting, teaching, tinkering.\nyou: probably a recruiter (hi!) or a hacker (also hi).'),
    pwd: () => print('/home/dan/desk'),
    id: () => print('uid=1000(dan) gid=1000(dan) groups=1000(dan),27(sudo),1337(cptc)'),
    date: () => print(new Date().toString() + '\n(it is always 3am at this desk)'),
    uname: () => print('Linux desk 6.8.0-dan #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux'),
    echo: (a) => print(a.join(' ')),
    ping: () => print('PONG. (ICMP is allowed on this network, unlike most of the ones I test)'),
    ls: (a) => print(Object.keys(FILES).concat('resume.pdf', 'flag.txt').concat(a.some(x => x.includes('a')) ? ['.secret', '.bash_history'] : []).join('  ')),
    cd: (a) => { const k = Object.keys(FILES).find(f => f.replace('/', '') === (a[0] || '').replace('/', '')); if (k) print(sectionText(FILES[k])); else print('cd: this is a website, not a shell. nice try though.'); },
    cat: (a) => {
      const f = (a[0] || '').replace(/^\.\//, '').replace(/^~\//, '');
      if (!f) return print('cat: missing file. try `ls`');
      const k = Object.keys(FILES).find(x => x.replace('/', '') === f.replace('/', ''));
      if (k) return print(sectionText(FILES[k]));
      if (f === 'resume.pdf') return print('cat: resume.pdf is a binary file. try `resume` instead');
      if (f === '.secret') return print('hint: 15 flags. some you drive to, some you hack.\ntype `flags` to see what is left.');
      if (f === '.bash_history') return print('nmap -sC -sV 10.10.10.0/24\nvim report_final_FINAL_v3.docx\ngit commit -m "fix typo in exec summary"\nsudo apt install sleep\n# E: Unable to locate package sleep');
      if (f === '/etc/passwd') return print(PASSWD.join('\n'));
      if (f === '/etc/shadow') { track('term/shadow', 'shadow', true); return print(SHADOW.join('\n') + '\n\n(hashcat -m 500. it is in rockyou.)'); }
      if (f === 'flag.txt') return print('cat: flag.txt: nice try. flags are earned, not cat\'d.');
      if (f === '/etc/hosts') return print('127.0.0.1  desk\n10.0.0.66  outside  # out of scope (allegedly)');
      print(`cat: ${f}: No such file or directory`);
    },
    open: (a) => {
      const id = (a[0] || '').toLowerCase();
      const map = { about: 'about', experience: 'work', work: 'work', comps: 'comps', competitions: 'comps', certs: 'certs', lab: 'lab', teaching: 'teach', teach: 'teach', business: 'biz', biz: 'biz', contact: 'contact', outside: 'outside', antigua: 'familia', lake: 'lake', volcano: 'summit', acatenango: 'summit', soccer: 'pitch', pitch: 'pitch', dance: 'dance', salsa: 'dance', camp: 'fire', cooking: 'fire', gym: 'gym', hammock: 'hammock' };
      if (!map[id]) return print('open: where? try one of: ' + Object.keys(map).slice(0, 12).join(', ') + ' ...');
      onClose(); world?.teleport(map[id]);
    },
    resume: () => { track('resume', 'resume', true); window.open(LINKS.resume, '_blank', 'noopener'); print('opening resume.pdf ...'); },
    hire: () => { track('term/hire', 'hire', true); print('excellent choice. opening your mail client ...'); location.href = 'mailto:' + LINKS.email + '?subject=' + encodeURIComponent('We should talk'); },
    contact: () => print(sectionText('contact')),
    email: () => print(LINKS.email),
    flags: () => {
      const g = flags();
      print(`flags: ${g.size}/${TOTAL}`);
      for (const k of Object.keys(HINTS)) print(`  [${g.has(k) ? 'x' : ' '}] ${k}  ${g.has(k) ? '' : HINTS[k]}`);
    },
    submit: async (a) => {
      const id = await submit(a.join(' '));
      if (!id) return print('nope. flags look like DAN{...}');
      print(capture(id) ? `[+] correct! ${id} captured (${flags().size}/${TOTAL})` : 'already got that one ;)', 'ok');
    },
    sudo: (a) => {
      const cmd = a.join(' ');
      if (!cmd) { pending = null; return askPw(); }
      if (/make me a sandwich/.test(cmd)) return print('okay.');
      if (/^rm\b/.test(cmd)) return C.rm(a.slice(1), true);
      if (/^apt(-get)? install tank/.test(cmd)) { pending = 'tank'; return askPw(); }
      if (/^apt(-get)? install/.test(cmd)) return print('E: Unable to locate package ' + (a.at(-1) || '') + '\n(try a tank)');
      pending = null; askPw();
    },
    su: () => { pending = null; askPw(); },
    apt: (a) => print(/install/.test(a.join(' ')) ? 'E: Could not open lock file /var/lib/dpkg/lock - are you root?' : 'apt 2.7.14 (amd64)'),
    lang: (a) => { if (['en', 'es', 'nl'].includes(a[0])) { setLang(a[0]); print('ok: ' + a[0]); } else print('lang: en | es | nl'); },
    ssh: (a) => {
      if (/outside/.test(a.join(' '))) { onClose(); world?.teleport('outside'); }
      else print(`ssh: connect to host ${a.at(-1) || '?'} port 22: Connection refused (out of scope)`);
    },
    nmap: () => print([
      'Starting Nmap 7.95 ( https://nmap.org )',
      'Nmap scan report for desk (127.0.0.1)',
      'PORT     STATE  SERVICE',
      '22/tcp   open   ssh        (dan@outside, try it)',
      '80/tcp   open   about.txt',
      '443/tcp  open   engagements',
      '1337/tcp open   trophies',
      '3000/tcp open   lab',
      '8080/tcp open   teaching',
      '9001/tcp closed sleep',
      '',
      'Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds',
    ].join('\n')),
    hack: () => print('with a signed scope and rules of engagement? absolutely. without? no :)'),
    rm: (a, sudo) => {
      const s = a.join(' ');
      if (/-[a-z]*r/i.test(s) && /(^|\s)(\/\*?|\*|~)(\s|$)/.test(s)) {
        print((sudo ? '' : 'rm: you are not root, but I respect the commitment. fine.\n') + 'rm: removing everything ...');
        track('term/rmrf', 'rm -rf', true);
        setTimeout(() => act.destroy(), 500);
        return;
      }
      print('rm: nice try. this is a static site, there is nothing to delete.\n(it is also read-only, versioned in git, and I have backups.)');
    },
    progress: () => {
      const p = act.progress();
      const bar = (a, b) => '█'.repeat(Math.round(a / b * 20)).padEnd(20, '░') + ` ${a}/${b}`;
      print(['flags        ' + bar(p.flags, p.total), 'places       ' + bar(Math.min(p.seen, p.places), p.places), 'achievements ' + bar(p.ach, p.achTotal), 'CPTS         ' + bar(9, 14), 'sleep        ' + bar(1, 8)].join('\n'));
    },
    achievements: () => print(act.achievements().join('\n')),
    garage: () => act.garage(),
    tank: () => print('tanks live in the garage. find 10 flags, or install one the hacker way.'),
    cook: () => print('the camp kitchen is outside, by the fire. bring an appetite.'),
    fish: () => print('you need a boat for that. drive into any water.'),
    ps: () => print(['  PID TTY          TIME CMD', '    1 ?        99:59:59 coffee-daemon', '  420 pts/0    00:03:12 burpsuite (37 tabs)', ' 1337 pts/1    00:00:42 nmap -p- everything', ' 2026 pts/2    12:00:00 salsa_mix.m3u', ' 3141 ?        00:00:00 imposter_syndrome <defunct>', ' 9001 ?        00:00:01 sleep (waiting since 2024)'].join('\n')),
    top: () => C.ps(),
    htop: () => C.ps(),
    fortune: () => print(['The S in IoT stands for security.', 'There is no cloud, it is just someone else\'s computer.', 'It is always DNS.', 'Your scope is a contract, not a suggestion.', 'Write the report like the CFO will read it, because they will.', 'If it is stupid and it works, document it anyway.'][Math.floor(Math.random() * 6)]),
    cowsay: (a) => { const s = a.join(' ') || 'moo. hire dan.'; print([' ' + '_'.repeat(s.length + 2), '< ' + s + ' >', ' ' + '-'.repeat(s.length + 2), '        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'].join('\n')); },
    sl: () => print(['      ====        ________                ___________', '  _D _|  |_______/        \\__I_I_____===__|_________|', '   |(_)---  |   H\\________/ |   |        =|___ ___|', '   /     |  |   H  |  |     |   |         ||_| |_||', '  |      |  |   H  |__--------------------| [___] |', '  | ________|___H__/__|_____/[][]~\\_______|       |', '  |/ |   |-----------I_____I [][] []  D   |=======|__', '(you meant ls. choo choo.)'].join('\n')),
    weather: () => print('Antigua Guatemala: 22°C, clear\nFuego: erupting (as usual)\nchance of volcanic ash: 40%'),
    hola: () => print('¡hola! ¿qué tal? escribe `lang es` para ver todo en español.'),
    hallo: () => print('hoi! typ `lang nl` om alles in het Nederlands te zien.'),
    make: (a) => print(`make: *** No rule to make target '${a.join(' ') || 'it'}'.  Stop.`),
    shutdown: () => { print('shutting down ... (just kidding, reloading)'); setTimeout(() => location.reload(), 900); },
    reboot: () => C.shutdown(),
    whoareyou: () => print('a website. but a very self-aware one.'),
    coffee: () => print('brewing ... ☕\nthat is coffee #4. it is 3am. this is fine.'),
    matrix: () => print('no.'),
    salsa: () => print('go outside and find the dance floor in Antigua.\n1-2-3, 5-6-7.'),
    bachata: () => C.salsa(),
    exit: () => onClose(),
    clear: () => { out.replaceChildren(); mirror.length = 0; world?.setLaptop(['dan@desk:~$ _']); },
    history: () => print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n')),
    vim: () => { mode = 'vim'; print('~\n~\n~   you are now in vim. good luck.\n~'); },
    nano: () => print('real ones use vim. (kidding. mostly.)'),
    git: () => print('fatal: not a git repository (but the site is, check GitHub)'),
    curl: () => print('<!-- you will find more in view-source than with curl, trust me -->'),
    konami: () => print('↑ ↑ ↓ ↓ ← → ← → B A. not in here though, out on the desk.'),
    quack: () => { act.duck(); print('🦆'); },
  };

  function askPw() { mode = 'pw'; input.type = 'password'; ps1.textContent = '[sudo] password for dan:'; }
  async function run(line) {
    if (mode === 'pw') {
      mode = null; input.type = 'text'; ps1.textContent = 'dan@desk:~$';
      print('[sudo] password for dan: ********');
      if (await sha256(line) === PW_HASH && pending === 'tank') {
        pending = null;
        print('Reading package lists... Done\nSetting up tank (1.0-guate) ...\n[+] tank installed. press V to open the garage, F to fire.', 'ok');
        act.unlockTank();
      } else if (await sha256(line) === PW_HASH) {
        const key = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(line + ':atitlan')));
        const bytes = H5.match(/../g).map((h, i) => parseInt(h, 16) ^ key[i]);
        const flag = String.fromCharCode(...bytes);
        print('root@desk:~# ok, you are root. that hash was cracked fair and square.\n' + flag, 'ok');
        capture('h5');
      } else if (++tries >= 3) {
        tries = 0;
        track('term/sudo-fail', 'sudo fail', true);
        print('sudo: 3 incorrect password attempts\nThis incident will be reported. (it really is, hi 👋)');
      } else print('Sorry, try again.');
      return;
    }
    if (mode === 'vim') {
      if (/^:(q!?|wq!?|x)$/.test(line)) { mode = null; print('you escaped vim. put that on your resume.'); }
      else print('~   (hint: :q!)');
      return;
    }
    print('dan@desk:~$ ' + line, 'cmd');
    if (!line.trim()) return;
    if (line.replace(/\s/g, '') === ':(){:|:&};:') { hist.push(line); return print('fork bomb detected. the desk is fine.\nyour browser tab feels judged though.'); }
    hist.push(line);
    const [cmd, ...args] = line.trim().split(/\s+/);
    const fn = C[cmd.toLowerCase()];
    track('term/' + cmd.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 20), 'terminal', true);
    if (fn) await fn(args);
    else if (/^DAN\{.*\}$/.test(line.trim())) await C.submit([line.trim()]);
    else print(`${cmd}: command not found. try \`help\``);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    hi = hist.length + 1;
    run(v);
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, Math.min(hi, hist.length) - 1); input.value = hist[hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; e.preventDefault(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(' ');
      const pool = parts.length > 1 ? [...Object.keys(FILES), '.secret', '.bash_history', '/etc/passwd', '/etc/shadow'] : Object.keys(C);
      const hit = pool.filter(x => x.startsWith(parts.at(-1)));
      if (hit.length === 1) { parts[parts.length - 1] = hit[0]; input.value = parts.join(' '); }
      else if (hit.length) print(hit.join('  '));
    }
  });

  print('dan@desk  ·  type `help` to get started');
  return {
    open() { root.hidden = false; requestAnimationFrame(() => input.focus()); },
    close() { root.hidden = true; input.blur(); },
    get isOpen() { return !root.hidden; },
  };
}
