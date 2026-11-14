// ===== data =====
const WALAS = 'LILI ERLINA';

const SISWA = [
  'ALINA MAULANA','ARUM SALSABILA','ARYANA AHMAD DANI','ASSHA OKTARANSA',
  'AULIA RAHMADHANTI','AURA FIRMAN','BUNGA NUVIANA','DAFIA AZAHRA',
  'DIDO KURNIA SAPUTRA','DINDA KHAIRANI','DIRGA ARSYAD','EKKLESIA GODELVA MANALU',
  'FATIHATUL AL HAFIL','FITRI RAMADANI','FRESLY RAMADHAN OZIL','FYORA AYU ANDYNI',
  'GHAIDA HADISTI','HANDIKA PUTRA','LIVIA MAILANI','MUHAMMAD ALFIAN SAPUTRA',
  'MUHAMMAD RAGIL RAHMAN','MUHAMMAD FIRMANSYAH','MUHAMMAD REGA ARIYANDI',
  'NAJWA HAMIDAH','NAYLA PUTRI','NIKO FUJIAMA','NURAINI A.F','RIMA ARDIANTI',
  'SHAFA AULIA','SILFIA PUTRI ANUGRAH','TASYA NAIFAH','VANYA AZZAHRA',
  'WINDA MARSALA','WINDI PUTRI CANTIKA','YAAFI PRATAMA','ZAKILA AULIA PUTRI',
  'ZILDJIAN SHAUQI ZAHY'
];

const AVATAR_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle class="fg" cx="32" cy="24" r="12"/>
  <path class="fg" d="M8 60c2-14 12-22 24-22s22 8 24 22z"/>
</svg>`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const root = document.documentElement;
const store = {
  get(k, d = 0) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

// ===== loading =====
const loader = $('#loader');
const loaderFill = $('#loaderFill');
const typerText = $('#typerText');
const phrases = ['menyiapkan kelas...', 'memanggil walas...', 'mengabsen siswa...', 'siap main!'];
let pIdx = 0, cIdx = 0, deleting = false;

function typeLoop() {
  const word = phrases[pIdx];
  if (!deleting) {
    typerText.textContent = word.slice(0, ++cIdx);
    if (cIdx === word.length) { deleting = true; return setTimeout(typeLoop, 900); }
  } else {
    typerText.textContent = word.slice(0, --cIdx);
    if (cIdx === 0) { deleting = false; pIdx = (pIdx + 1) % phrases.length; }
  }
  setTimeout(typeLoop, deleting ? 28 : 55);
}
typeLoop();

let progress = 0;
const loadBar = setInterval(() => {
  progress = Math.min(100, progress + Math.random() * 14 + 4);
  loaderFill.style.width = progress + '%';
  if (progress >= 100) {
    clearInterval(loadBar);
    setTimeout(() => loader.classList.add('done'), 350);
  }
}, 120);

// ===== menu samping =====
const burger = $('#burger');
const drawer = $('#drawer');
const overlay = $('#overlay');

function setDrawer(open) {
  drawer.classList.toggle('open', open);
  overlay.classList.toggle('show', open);
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
overlay.addEventListener('click', () => setDrawer(false));
$$('.menu-link').forEach(a => a.addEventListener('click', () => setDrawer(false)));

// ===== tema (dari menu samping) =====
const themeBtns = $$('[data-theme-set]');
function setTheme(name) {
  if (!['dark', 'white', 'pink'].includes(name)) name = 'dark';
  root.setAttribute('data-theme', name);
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.themeSet === name));
  store.set('xifi-theme', name);
}
themeBtns.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
setTheme(store.get('xifi-theme', 'dark'));

// ===== walas =====
$('#walasName').textContent = WALAS;
$('#walasAvatar').innerHTML = AVATAR_SVG;

// ===== siswa =====
const grid = $('#studentGrid');
const searchInput = $('#searchInput');
const countText = $('#countText');
const emptyText = $('#emptyText');
$('#statSiswa').textContent = SISWA.length;

function renderStudents(list) {
  grid.innerHTML = '';
  list.forEach((name, i) => {
    const card = document.createElement('div');
    card.className = 'student';
    card.style.transitionDelay = Math.min(i * 0.03, 0.6) + 's';

    const av = document.createElement('div');
    av.className = 'avatar avatar-sm';
    av.innerHTML = AVATAR_SVG;

    const info = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'student-name';
    nm.textContent = name;
    const no = document.createElement('div');
    no.className = 'student-no';
    no.textContent = 'siswa ' + (SISWA.indexOf(name) + 1);

    info.append(nm, no);
    card.append(av, info);
    grid.appendChild(card);
  });
  countText.textContent = list.length + ' siswa';
  emptyText.hidden = list.length !== 0;
  requestAnimationFrame(() => grid.querySelectorAll('.student').forEach(el => el.classList.add('show')));
}
renderStudents(SISWA);

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toUpperCase();
  renderStudents(SISWA.filter(n => n.includes(q)));
});

// ===== pengatur tab game =====
let activeGame = 'snake';
const tabs = $$('.tab');
const panels = {
  snake: $('#panelSnake'),
  type: $('#panelType'),
  guess: $('#panelGuess'),
  tap: $('#panelTap')
};

function stopAllGames() {
  pauseSnake();
  endTap(true);
  clearInterval(typeTimer);
  typing = false;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    if (name === activeGame) return;
    stopAllGames();
    activeGame = name;
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    Object.entries(panels).forEach(([k, el]) => el.hidden = k !== name);
  });
});

// ===== 1. cacing =====
const canvas = $('#snake');
const ctx = canvas.getContext('2d');
const COLS = 20;
const CELL = canvas.width / COLS;
const scoreEl = $('#score');
const bestEl = $('#best');
const hintEl = $('#hint');
let snakeBest = +store.get('xifi-snake-best', 0);
bestEl.textContent = snakeBest;

let snake, dir, nextDir, food, score, timer = null, running = false, over = false;
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

function placeFood() {
  let f;
  do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * COLS) }; }
  while (snake.some(s => s.x === f.x && s.y === f.y));
  food = f;
}

function resetSnake() {
  pauseSnake();
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  over = false;
  scoreEl.textContent = 0;
  placeFood();
  draw();
  hintEl.textContent = 'tekan panah atau geser untuk mulai';
}

function stepSnake() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= COLS;
  const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return snakeOver();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > snakeBest) {
      snakeBest = score;
      bestEl.textContent = snakeBest;
      store.set('xifi-snake-best', snakeBest);
    }
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.fillStyle = css('--bg-2');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = css('--food');
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2);
  ctx.fill();

  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? css('--snake-head') : css('--snake-body');
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i / snake.length);
    ctx.beginPath();
    ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 6);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function startSnake() {
  if (running || over) return;
  running = true;
  hintEl.textContent = 'gunakan panah untuk mengarahkan';
  timer = setInterval(stepSnake, 110);
}
function pauseSnake() {
  clearInterval(timer);
  timer = null;
  running = false;
}
function snakeOver() {
  pauseSnake();
  over = true;
  hintEl.textContent = 'kamu kalah! tekan ulang untuk main lagi';
}

function turnSnake(x, y) {
  if (activeGame !== 'snake' || over) return;
  if (dir.x + x === 0 && dir.y + y === 0) return;
  nextDir = { x, y };
  startSnake();
}

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
};
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    setDrawer(false);
    setAi(false);
    return;
  }
  if (activeGame !== 'snake' || e.target.tagName === 'INPUT') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (KEYS[k]) { e.preventDefault(); turnSnake(...KEYS[k]); }
});

const PAD_MAP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
$$('.pad button').forEach(b => b.addEventListener('click', () => turnSnake(...PAD_MAP[b.dataset.dir])));

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
  if (Math.abs(dx) > Math.abs(dy)) turnSnake(dx > 0 ? 1 : -1, 0);
  else turnSnake(0, dy > 0 ? 1 : -1);
});

$('#resetBtn').addEventListener('click', resetSnake);

// ===== 2. ngetik =====
const SENTENCES = [
  'kelas xi fi selalu kompak dan saling membantu setiap hari',
  'belajar itu seperti naik tangga pelan tapi pasti sampai atas',
  'jangan takut salah karena dari kesalahan kita belajar banyak hal',
  'pagi ini kita mulai dengan semangat baru dan senyum yang cerah',
  'kerja sama membuat tugas terasa ringan dan menyenangkan untuk dikerjakan',
  'waktu tidak akan menunggu jadi manfaatkan setiap detiknya dengan baik'
];
const TYPE_TIME = 30;
const sampleEl = $('#sample');
const typeInput = $('#typeInput');
const tTime = $('#tTime');
const tWpm = $('#tWpm');
const tAcc = $('#tAcc');
const typeHint = $('#typeHint');
const bestWpmEl = $('#bestWpm');
let typeBest = +store.get('xifi-type-best', 0);
bestWpmEl.textContent = typeBest;

let target = '', chars = [], tLeft = TYPE_TIME, typeTimer = null, startedAt = 0, typing = false;

function newText() {
  clearInterval(typeTimer);
  target = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  sampleEl.innerHTML = '';
  chars = [...target].map(c => {
    const s = document.createElement('span');
    s.textContent = c;
    sampleEl.appendChild(s);
    return s;
  });
  typeInput.value = '';
  typeInput.disabled = false;
  tLeft = TYPE_TIME;
  tTime.textContent = TYPE_TIME;
  typing = false;
  typeHint.textContent = 'timer 30 detik mulai saat kamu mulai mengetik';
  updateStats();
}

function updateStats() {
  const typed = typeInput.value;
  let correct = 0;
  chars.forEach((span, i) => {
    span.classList.remove('ok', 'bad', 'cur');
    if (i < typed.length) {
      const good = typed[i] === target[i];
      if (good) correct++;
      span.classList.add(good ? 'ok' : 'bad');
    } else if (i === typed.length) {
      span.classList.add('cur');
    }
  });
  const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;
  const elapsed = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
  const wpm = typing ? Math.round((correct / 5) / elapsed) : 0;
  tWpm.textContent = wpm;
  tAcc.textContent = acc;
  return wpm;
}

function finishTyping(msg) {
  clearInterval(typeTimer);
  typing = false;
  typeInput.disabled = true;
  const wpm = updateStats();
  if (wpm > typeBest) {
    typeBest = wpm;
    bestWpmEl.textContent = typeBest;
    store.set('xifi-type-best', typeBest);
  }
  typeHint.textContent = msg + ' klik teks baru untuk main lagi';
}

typeInput.addEventListener('input', () => {
  if (!typing && typeInput.value.length && !typeInput.disabled) {
    typing = true;
    startedAt = Date.now();
    typeTimer = setInterval(() => {
      tLeft--;
      tTime.textContent = tLeft;
      updateStats();
      if (tLeft <= 0) finishTyping('waktu habis!');
    }, 1000);
  }
  if (!typing) return;
  updateStats();
  if (typeInput.value.length >= target.length) finishTyping('selesai!');
});
$('#typeReset').addEventListener('click', newText);

// ===== 3. tebak angka =====
const gInput = $('#gInput');
const gHint = $('#gHint');
const gTries = $('#gTries');
const gBestEl = $('#gBest');
const gGo = $('#gGo');
let guessBest = +store.get('xifi-guess-best', 0);
let secret = 0, tries = 0;
if (guessBest) gBestEl.textContent = guessBest;

function newGuess() {
  secret = Math.floor(Math.random() * 100) + 1;
  tries = 0;
  gTries.textContent = 0;
  gInput.value = '';
  gInput.disabled = false;
  gGo.disabled = false;
  gHint.textContent = 'tebak angka dari 1 sampai 100';
}

function makeGuess() {
  if (gInput.disabled) return;
  const v = Number(gInput.value);
  if (!Number.isInteger(v) || v < 1 || v > 100) {
    gHint.textContent = 'masukkan angka bulat 1 sampai 100';
    return;
  }
  tries++;
  gTries.textContent = tries;
  if (v === secret) {
    gHint.innerHTML = `benar! angkanya <b>${secret}</b> dalam ${tries} percobaan`;
    gInput.disabled = true;
    gGo.disabled = true;
    if (!guessBest || tries < guessBest) {
      guessBest = tries;
      gBestEl.textContent = guessBest;
      store.set('xifi-guess-best', guessBest);
    }
  } else {
    gHint.textContent = v < secret ? 'lebih besar dari itu' : 'lebih kecil dari itu';
    gInput.value = '';
    gInput.focus();
  }
}
gGo.addEventListener('click', makeGuess);
gInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') makeGuess(); });
$('#gReset').addEventListener('click', newGuess);

// ===== 4. tap cepat =====
const arena = $('#arena');
const arenaMsg = $('#arenaMsg');
const tapTimeEl = $('#tapTime');
const tapScoreEl = $('#tapScore');
const tapBestEl = $('#tapBest');
const tapStartBtn = $('#tapStart');
const TAP_TIME = 20;
let tapBest = +store.get('xifi-tap-best', 0);
tapBestEl.textContent = tapBest;

let tapLeft = TAP_TIME, tapScore = 0, tapTimer = null, tapRunning = false;

function spawnTarget() {
  arena.querySelectorAll('.target').forEach(t => t.remove());
  const size = 56;
  const t = document.createElement('button');
  t.className = 'target';
  t.setAttribute('aria-label', 'tap');
  t.style.left = Math.random() * Math.max(arena.clientWidth - size, 0) + 'px';
  t.style.top = Math.random() * Math.max(arena.clientHeight - size, 0) + 'px';
  t.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!tapRunning) return;
    tapScore++;
    tapScoreEl.textContent = tapScore;
    spawnTarget();
  });
  arena.appendChild(t);
}

function startTap() {
  if (tapRunning) return;
  tapRunning = true;
  tapLeft = TAP_TIME;
  tapScore = 0;
  tapTimeEl.textContent = TAP_TIME;
  tapScoreEl.textContent = 0;
  arenaMsg.hidden = true;
  tapStartBtn.disabled = true;
  spawnTarget();
  tapTimer = setInterval(() => {
    tapLeft--;
    tapTimeEl.textContent = tapLeft;
    if (tapLeft <= 0) endTap(false);
  }, 1000);
}

function endTap(silent) {
  if (!tapRunning) return;
  clearInterval(tapTimer);
  tapRunning = false;
  arena.querySelectorAll('.target').forEach(t => t.remove());
  tapStartBtn.disabled = false;
  tapStartBtn.textContent = 'main lagi';
  if (silent) return;
  arenaMsg.hidden = false;
  arenaMsg.textContent = 'selesai! skor kamu ' + tapScore;
  if (tapScore > tapBest) {
    tapBest = tapScore;
    tapBestEl.textContent = tapBest;
    store.set('xifi-tap-best', tapBest);
  }
}
tapStartBtn.addEventListener('click', startTap);

// ===== 5. panel chat ai (tombol robot di pojok kiri atas) =====
const aiFab = $('#aiFab');
const aiPanel = $('#aiPanel');
const aiLog = $('#aiLog');
const aiForm = $('#aiForm');
const aiInput = $('#aiInput');
const aiSend = $('#aiSend');
const aiClear = $('#aiClear');
const aiSize = $('#aiSize');
const aiClose = $('#aiClose');
let aiHistory = [];
let aiBusy = false;
let aiOpen = false;

function aiAddMsg(cls, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.textContent = text;
  aiLog.appendChild(el);
  aiLog.scrollTop = aiLog.scrollHeight;
  return el;
}

function aiGreet() {
  aiLog.innerHTML = '';
  aiAddMsg('bot', 'halo! aku asisten XI.FI. mau tanya apa hari ini?');
}

function setAi(open) {
  aiOpen = open;
  aiPanel.classList.toggle('open', open);
  aiFab.classList.toggle('open', open);
  aiFab.setAttribute('aria-expanded', String(open));
  aiPanel.setAttribute('aria-hidden', String(!open));
  if (open) setTimeout(() => aiInput.focus(), 350);
}

function setAiFull(full) {
  aiPanel.classList.toggle('full', full);
  aiSize.title = full ? 'layar belah' : 'layar penuh';
  aiSize.setAttribute('aria-label', aiSize.title);
  store.set('xifi-ai-full', full ? '1' : '0');
}

aiFab.addEventListener('click', () => setAi(!aiOpen));
aiClose.addEventListener('click', () => setAi(false));
aiSize.addEventListener('click', () => setAiFull(!aiPanel.classList.contains('full')));
setAiFull(store.get('xifi-ai-full', '0') === '1');

async function askAI(text) {
  if (aiBusy || !text.trim()) return;
  aiBusy = true;
  aiSend.disabled = true;
  aiAddMsg('user', text);
  const typing = aiAddMsg('typing', '...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: aiHistory.slice(-10) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'gagal');

    typing.remove();
    aiAddMsg('bot', data.reply);
    aiHistory.push({ role: 'user', text });
    aiHistory.push({ role: 'assistant', text: data.reply });
  } catch (e) {
    typing.remove();
    aiAddMsg('error', 'maaf, ai belum bisa menjawab. coba lagi sebentar lagi.');
  } finally {
    aiBusy = false;
    aiSend.disabled = false;
    aiInput.focus();
  }
}

aiForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = aiInput.value.trim();
  if (!text) return;
  aiInput.value = '';
  askAI(text);
});

$$('.chip').forEach(c => c.addEventListener('click', () => askAI(c.dataset.prompt)));

aiClear.addEventListener('click', () => {
  aiHistory = [];
  aiGreet();
});

aiGreet();

// ===== gambar ulang canvas saat tema berubah =====
new MutationObserver(() => { if (snake) draw(); })
  .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

// ===== inisialisasi game =====
resetSnake();
newText();
newGuess();

// ===== menu aktif saat scroll =====
const menuLinks = $$('.menu-link');
const sectionIds = ['beranda', 'walas', 'siswa', 'game', 'tentang'];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      menuLinks.forEach(l => l.classList.toggle('active', l.dataset.target === entry.target.id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sectionIds.forEach(id => sectionObserver.observe(document.getElementById(id)));

// ===== animasi masuk =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
$$('.reveal').forEach(el => revealObserver.observe(el));
