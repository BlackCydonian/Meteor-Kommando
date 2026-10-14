// Meteor-Kommando — Spiel-Logik
// Einmaleins 1-10, Multiple-Choice-Antworten lösen Laser-Angriffe aus.

const TABLES = 10;
const QUESTIONS_PER_LEVEL = 10;
const BOSS_HP = 5;
const STORAGE_KEY = "meteor-kommando-progress";

const BOSS_NAMES = {
  1: "Späher-Drohne",
  2: "Zwilling-Kreuzer",
  3: "Dreizack-Fregatte",
  4: "Quadra-Panzer",
  5: "Fünfling-Zerstörer",
  6: "Hexa-Dreadnought",
  7: "Sieben-Sturmschiff",
  8: "Okto-Festung",
  9: "Neun-Titan",
  10: "Zehnfach-Mutterschiff",
};

/* ---------- Fortschritt (localStorage) ---------- */

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, stars: {} };
    const parsed = JSON.parse(raw);
    return {
      unlocked: parsed.unlocked || 1,
      stars: parsed.stars || {},
    };
  } catch (e) {
    return { unlocked: 1, stars: {} };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    /* kein Speicherplatz verfügbar – Spiel läuft trotzdem weiter */
  }
}

let progress = loadProgress();

/* ---------- Hilfsfunktionen ---------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOptions(a, b) {
  const correct = a * b;
  const candidates = new Set([
    a * (b - 1),
    a * (b + 1),
    a * b - a,
    a * b + a,
    a * b - b,
    a * b + b,
    a + b,
    correct + randInt(2, 5) * (Math.random() < 0.5 ? 1 : -1),
  ]);
  candidates.delete(correct);
  const pool = shuffle([...candidates].filter((n) => n > 0 && n !== correct));
  const wrong = [];
  for (const n of pool) {
    if (wrong.length >= 3) break;
    if (!wrong.includes(n)) wrong.push(n);
  }
  while (wrong.length < 3) {
    const n = correct + randInt(1, 9) * (Math.random() < 0.5 ? 1 : -1);
    if (n > 0 && n !== correct && !wrong.includes(n)) wrong.push(n);
  }
  return shuffle([correct, ...wrong]);
}

function starsForMistakes(mistakes) {
  if (mistakes === 0) return 3;
  if (mistakes <= 3) return 2;
  return 1;
}

/* ---------- Sternenhintergrund ---------- */

const starCanvas = document.getElementById("starfield");
const starCtx = starCanvas.getContext("2d");
let stars = [];

function resizeCanvas() {
  starCanvas.width = window.innerWidth;
  starCanvas.height = window.innerHeight;
  const count = Math.floor((window.innerWidth * window.innerHeight) / 4500);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * starCanvas.width,
    y: Math.random() * starCanvas.height,
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.02 + 0.01,
  }));
}

function drawStars(t) {
  starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
  starCtx.fillStyle = "#f4f6fb";
  for (const s of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    starCtx.globalAlpha = 0.25 + twinkle * 0.6;
    starCtx.beginPath();
    starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    starCtx.fill();
  }
  starCtx.globalAlpha = 1;
  requestAnimationFrame(drawStars);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(drawStars);

/* ---------- Partikel (Laser, Explosionen, Konfetti) ---------- */

const particleLayer = document.getElementById("particles-layer");

function fireLaser(fromEl, toEl) {
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  const x1 = from.left + from.width / 2;
  const y1 = from.top + from.height / 2;
  const x2 = to.left + to.width / 2;
  const y2 = to.top + to.height / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

  const beam = document.createElement("div");
  beam.className = "laser-beam";
  beam.style.left = `${x1}px`;
  beam.style.top = `${y1}px`;
  beam.style.height = `${len}px`;
  beam.style.transform = `rotate(${angle}deg)`;
  beam.style.opacity = "0";
  particleLayer.appendChild(beam);

  requestAnimationFrame(() => {
    beam.style.transition = "opacity 0.08s ease";
    beam.style.opacity = "1";
  });
  setTimeout(() => {
    beam.style.transition = "opacity 0.2s ease";
    beam.style.opacity = "0";
  }, 110);
  setTimeout(() => beam.remove(), 350);

  spawnBurst(x2, y2, "#ff3b3b", 16);
  spawnBurst(x2, y2, "#ffb020", 10);
}

function spawnBurst(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = randInt(3, 7);
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = color;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.boxShadow = `0 0 8px ${color}`;
    particleLayer.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const dist = randInt(40, 120);
    const endX = Math.cos(angle) * dist;
    const endY = Math.sin(angle) * dist;
    const duration = randInt(450, 750);

    p.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    requestAnimationFrame(() => {
      p.style.transform = `translate(${endX}px, ${endY}px)`;
      p.style.opacity = "0";
    });
    setTimeout(() => p.remove(), duration + 50);
  }
}

function spawnConfetti() {
  const colors = ["#4ce0d2", "#7b5fff", "#ffd166", "#f4f6fb"];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = randInt(4, 9);
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
    p.style.background = colors[randInt(0, colors.length - 1)];
    const startX = window.innerWidth / 2 + randInt(-40, 40);
    p.style.left = `${startX}px`;
    p.style.top = `${window.innerHeight * 0.3}px`;
    particleLayer.appendChild(p);

    const endX = randInt(-160, 160);
    const endY = randInt(220, 420);
    const duration = randInt(900, 1500);
    p.style.transition = `transform ${duration}ms cubic-bezier(.2,.6,.3,1), opacity ${duration}ms ease-in`;
    requestAnimationFrame(() => {
      p.style.transform = `translate(${endX}px, ${endY}px) rotate(${randInt(0, 360)}deg)`;
      p.style.opacity = "0";
    });
    setTimeout(() => p.remove(), duration + 60);
  }
}

/* ---------- Fliegende Schiffe im Hintergrund ---------- */

const ambientLayer = document.getElementById("ambient-ships");

function spawnAmbientShip() {
  const el = document.createElement("div");
  el.className = "ambient-ship";
  el.textContent = Math.random() < 0.5 ? "🚀" : "🛸";
  const topPct = randInt(6, 72);
  const duration = randInt(9000, 15000);
  const leftToRight = Math.random() < 0.5;
  el.style.top = `${topPct}%`;
  el.style.left = leftToRight ? "-12%" : "112%";
  el.style.transform = `rotate(${leftToRight ? 90 : -90}deg) scaleX(${leftToRight ? 1 : -1})`;
  ambientLayer.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transition = `left ${duration}ms linear`;
    el.style.left = leftToRight ? "112%" : "-12%";
  });
  setTimeout(() => el.remove(), duration + 200);
}

function scheduleAmbientShips() {
  spawnAmbientShip();
  setTimeout(scheduleAmbientShips, randInt(4000, 8000));
}

scheduleAmbientShips();

/* ---------- Bildschirm-Umschaltung ---------- */

const screens = {
  start: document.getElementById("screen-start"),
  map: document.getElementById("screen-map"),
  game: document.getElementById("screen-game"),
  victory: document.getElementById("screen-victory"),
};

function showScreen(name) {
  for (const key in screens) {
    screens[key].hidden = key !== name;
  }
}

/* ---------- Sternenkarte ---------- */

const planetGrid = document.getElementById("planet-grid");

function buildPlanetGrid() {
  planetGrid.innerHTML = "";
  for (let n = 1; n <= TABLES; n++) {
    const locked = n > progress.unlocked;
    const btn = document.createElement("button");
    btn.className = "planet" + (locked ? " locked" : "");
    btn.innerHTML = `
      <span class="num">${n}er</span>
      <span class="label">Reihe</span>
      <span class="stars">${renderStarString(progress.stars[n] || 0)}</span>
    `;
    if (!locked) {
      btn.addEventListener("click", () => startLevel(n));
    }
    planetGrid.appendChild(btn);
  }
}

function renderStarString(count) {
  if (!count) return "";
  return "★".repeat(count) + "☆".repeat(3 - count);
}

/* ---------- Spiel-Zustand ---------- */

const hudTable = document.getElementById("hud-table");
const hudScore = document.getElementById("hud-score-val");
const hudStreak = document.getElementById("hud-streak-val");
const progressFill = document.getElementById("progress-fill");
const bossWrap = document.getElementById("boss-wrap");
const bossSprite = document.getElementById("boss-sprite");
const bossHpFill = document.getElementById("boss-hp-fill");
const asteroidEl = document.getElementById("asteroid");
const asteroidProblem = document.getElementById("asteroid-problem");
const shipSprite = document.getElementById("ship-sprite");
const answersGrid = document.getElementById("answers");
const answerButtons = Array.from(answersGrid.querySelectorAll(".answer-btn"));

let state = null;

function startLevel(table) {
  const queue = shuffle(Array.from({ length: QUESTIONS_PER_LEVEL }, (_, i) => ({ a: table, b: i + 1 })));
  state = {
    table,
    phase: "level",
    queue,
    total: QUESTIONS_PER_LEVEL,
    answeredCorrect: 0,
    mistakes: 0,
    score: 0,
    streak: 0,
    bossHp: BOSS_HP,
    locked: false,
  };
  hudTable.textContent = `Reihe der ${table}`;
  bossWrap.hidden = true;
  bossSprite.textContent = "";
  updateHud();
  showScreen("game");
  nextQuestion();
}

function updateHud() {
  hudScore.textContent = state.score;
  hudStreak.textContent = state.streak;
  const done = state.phase === "level" ? state.answeredCorrect : state.total;
  const levelPct = Math.min(100, (state.answeredCorrect / state.total) * 70);
  const bossPct = state.phase === "boss" ? 30 * (1 - state.bossHp / BOSS_HP) : 0;
  progressFill.style.width = `${levelPct + bossPct}%`;
}

function nextQuestion() {
  state.locked = false;
  answerButtons.forEach((b) => {
    b.disabled = false;
    b.classList.remove("correct", "wrong");
  });

  if (state.phase === "level") {
    if (state.queue.length === 0) {
      startBoss();
      return;
    }
    state.currentQuestion = state.queue[0];
  } else {
    state.currentQuestion = { a: state.table, b: randInt(1, 10) };
  }

  const { a, b } = state.currentQuestion;
  asteroidProblem.textContent = `${b} × ${a}`;
  asteroidEl.classList.remove("hit");
  asteroidEl.classList.remove("enter");
  void asteroidEl.offsetWidth;
  asteroidEl.classList.add("enter");
  setTimeout(() => asteroidEl.classList.remove("enter"), 500);

  const options = generateOptions(a, b);
  answerButtons.forEach((btn, i) => {
    btn.textContent = options[i];
    btn.onclick = () => handleAnswer(options[i], a * b, btn);
  });
}

function startBoss() {
  state.phase = "boss";
  bossWrap.hidden = false;
  bossSprite.textContent = "👽";
  document.getElementById("boss-name").textContent = BOSS_NAMES[state.table];
  bossHpFill.style.width = "100%";
  updateHud();
  nextQuestion();
}

function handleAnswer(chosen, correctValue, btn) {
  if (state.locked) return;
  state.locked = true;
  answerButtons.forEach((b) => (b.disabled = true));

  if (chosen === correctValue) {
    btn.classList.add("correct");
    state.score += 10 + state.streak * 2;
    state.streak += 1;
    fireLaser(shipSprite, state.phase === "boss" ? bossSprite : asteroidEl);

    if (state.phase === "level") {
      state.answeredCorrect += 1;
      state.queue.shift();
      asteroidEl.classList.add("hit");
      setTimeout(() => {
        updateHud();
        nextQuestion();
      }, 420);
    } else {
      state.bossHp -= 1;
      bossHpFill.style.width = `${Math.max(0, (state.bossHp / BOSS_HP) * 100)}%`;
      updateHud();
      if (state.bossHp <= 0) {
        setTimeout(() => finishLevel(), 500);
      } else {
        setTimeout(() => nextQuestion(), 420);
      }
    }
  } else {
    btn.classList.add("wrong");
    state.mistakes += 1;
    state.streak = 0;
    updateHud();
    shipSprite.classList.remove("shield");
    void shipSprite.offsetWidth;
    shipSprite.classList.add("shield");

    const target = state.phase === "boss" ? bossSprite : asteroidEl;
    target.classList.remove("shake");
    void target.offsetWidth;
    target.classList.add("shake");

    setTimeout(() => {
      state.locked = false;
      answerButtons.forEach((b) => {
        b.disabled = false;
        if (b !== btn) b.classList.remove("wrong");
      });
      btn.classList.remove("wrong");
      shipSprite.classList.remove("shield");
      target.classList.remove("shake");
    }, 500);
  }
}

function finishLevel() {
  spawnConfetti();
  const earned = starsForMistakes(state.mistakes);
  const previous = progress.stars[state.table] || 0;
  progress.stars[state.table] = Math.max(previous, earned);
  if (state.table === progress.unlocked && state.table < TABLES) {
    progress.unlocked = state.table + 1;
  }
  saveProgress(progress);

  document.getElementById("victory-title").textContent = `Reihe der ${state.table} gemeistert!`;
  document.getElementById("victory-sub").textContent =
    state.mistakes === 0
      ? "Perfekt! Kein einziger Fehlschuss."
      : `Geschafft mit ${state.mistakes} Fehlschuss${state.mistakes === 1 ? "" : "en"}.`;

  const starSpans = document.querySelectorAll("#victory-stars span");
  starSpans.forEach((s, i) => s.classList.toggle("earned", i < earned));

  const nextBtn = document.getElementById("btn-victory-next");
  if (state.table < TABLES) {
    nextBtn.hidden = false;
    nextBtn.onclick = () => startLevel(state.table + 1);
  } else {
    nextBtn.hidden = true;
  }

  showScreen("victory");
}

/* ---------- Navigation ---------- */

document.getElementById("btn-play").addEventListener("click", () => {
  buildPlanetGrid();
  showScreen("map");
});

document.getElementById("btn-map-back").addEventListener("click", () => showScreen("start"));

document.getElementById("btn-game-back").addEventListener("click", () => {
  buildPlanetGrid();
  showScreen("map");
});

document.getElementById("btn-victory-map").addEventListener("click", () => {
  buildPlanetGrid();
  showScreen("map");
});

showScreen("start");
