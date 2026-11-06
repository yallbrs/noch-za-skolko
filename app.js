(() => {
  "use strict";

  const ROUNDS = 10;
  const SLIDER_MIN = 1000;
  const SLIDER_STEP = 50;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString("ru-RU") + " ₽";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LISTINGS = (window.LISTINGS || []).filter((l) => l.price);
  if (!LISTINGS.length) return;

  const maxPrice = Math.max(...LISTINGS.map((l) => l.price));
  const sliderMax = maxPrice + 500;
  const sorted = [...LISTINGS].sort((a, b) => a.price - b.price);
  const median = sorted[Math.floor(sorted.length / 2)].price;

  const state = {
    deck: [],
    round: 0,
    total: 0,
    current: null,
    answered: false,
  };

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const REACTIONS = [
    ["ТЫ ЧТО, РИЕЛТОР?! 🎯", "В getPrice изErrorHandler вернулся бы домой 🏠", "Дедлайн подождёт, ты гений 💎", "Аура +999, так держать ⚡"],
    ["база", "почти канон 🫡", "ты явно листал Авито сегодня 📱", "приемлемо, стильно, модно 🤌"],
    ["ну такое, 6/10", "цена мимо, вайб на месте 🌫️", "дед инсайд, но не твой 🔫", "половина ауры улетела 🪙"],
    ["кринж 💀", "цены не угадал, но выглядел уверенно 🎭", "турист детектед 🗺️", "это перелёт в другую ценовую вселенную 🚀"],
  ];

  function pickDeck() {
    const pool = [...LISTINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, ROUNDS);
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function reviewWord(n) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "отзыв";
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "отзыва";
    return "отзывов";
  }

  function updateHud() {
    $("hud-round").textContent = `Раунд ${Math.min(state.round + 1, ROUNDS)}/${ROUNDS}`;
    $("hud-score").textContent = `Аура ${state.total}`;
  }

  /* ---------- Карусель ---------- */
  function buildCarousel(photos) {
    // свежие ноды без старых слушателей
    const oldTrack = $("carousel-track");
    const track = oldTrack.cloneNode(false);
    oldTrack.replaceWith(track);
    const dots = $("carousel-dots");
    dots.innerHTML = "";
    const list = photos.length ? photos : [null];

    list.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel__slide";
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Фото квартиры";
        img.loading = i === 0 ? "eager" : "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
          const ph = document.createElement("span");
          ph.textContent = "🏠";
          img.replaceWith(ph);
        });
        slide.appendChild(img);
      } else {
        slide.textContent = "🏠";
      }
      track.appendChild(slide);

      const dot = document.createElement("span");
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dots.appendChild(dot);
    });

    track.addEventListener("scroll", () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      [...dots.children].forEach((d, i) => d.classList.toggle("is-active", i === idx));
    }, { passive: true });
  }

  /* ---------- Раунд ---------- */
  function showRound() {
    if (state.round >= ROUNDS) { showFinal(); return; }
    state.current = state.deck[state.round];
    state.answered = false;
    updateHud();

    const l = state.current;
    $("card-title").textContent = l.title;

    const badges = $("card-badges");
    badges.innerHTML = "";
    const extra = [];
    if (l.superhost) extra.push("Суперхозяин");
    const badgeEls = extra.map((t, i) => {
      const b = document.createElement("span");
      b.className = "badge" + (i % 2 ? " badge--24h" : " badge--instant");
      b.textContent = t;
      return b;
    });
    badgeEls.forEach((b) => badges.appendChild(b));
    $("sticker-superhost").hidden = !l.superhost;

    $("fact-area").textContent = l.areaM2 ? `📐 ${String(l.areaM2).replace(".", ",")} м²` : "📐 —";
    $("fact-beds").textContent = l.beds ? `🛏 ${l.beds} ${plural(l.beds, "кровать", "кровати", "кроватей")}` : "🛏 —";
    $("fact-rating").textContent = l.rating ? `⭐ ${String(l.rating).replace(".", ",")}` : "⭐ —";
    $("fact-reviews").textContent = `💬 ${l.reviews} ${reviewWord(l.reviews)}`;

    $("street").classList.add("street--hidden");
    $("street-text").textContent = "";

    const slider = $("price-slider");
    slider.max = sliderMax;
    slider.step = SLIDER_STEP;
    slider.min = SLIDER_MIN;
    slider.value = median;
    $("price-value").textContent = fmt(median);

    buildCarousel(l.photos);

    $("screen-result").hidden = true;
    $("screen-final").hidden = true;
    const round = $("screen-round");
    round.hidden = false;

    // перезапуск pop-in анимации
    const card = $("card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  }

  $("price-slider").addEventListener("input", (e) => {
    $("price-value").textContent = fmt(+e.target.value);
  });

  function confetti() {
    if (reducedMotion) return;
    const layer = $("confetti-layer");
    const colors = ["#FFFFFF", "#0ABAB5", "#D6F4F1"];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + "s";
      c.style.transform = `rotate(${Math.random() * 180}deg)`;
      layer.appendChild(c);
      setTimeout(() => c.remove(), 2200);
    }
  }

  function countUp(el, target, ms = 900) {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    if (reducedMotion) { el.textContent = fmt(target); return; }
    requestAnimationFrame(tick);
  }

  function answer() {
    if (state.answered) return;
    state.answered = true;

    const l = state.current;
    const guess = +$("price-slider").value;
    const real = l.price;
    const err = Math.abs(guess - real) / real;
    const pts = Math.round(1000 * Math.pow(Math.max(0, 1 - err / 0.5), 2));
    state.total += pts;
    updateHud();

    // реакция
    const tier = err <= 0.05 ? 0 : err <= 0.15 ? 1 : err <= 0.35 ? 2 : 3;
    const reaction = REACTIONS[tier][Math.floor(Math.random() * 4)];

    const badge = $("result-badge");
    badge.className = "result__badge " + (tier <= 1 ? "result__badge--good" : tier >= 3 ? "result__badge--bad" : "");
    badge.textContent = tier <= 1 ? "✓" : tier >= 3 ? "💀" : "≈";

    $("result-reaction").textContent = reaction;
    countUp($("result-price"), real);

    const diffEl = $("result-diff");
    if (guess === real) {
      diffEl.textContent = "в точку 0 ₽ 🎯";
      diffEl.className = "result__diff result__diff--good";
    } else if (guess > real) {
      diffEl.textContent = `перелёт +${(guess - real).toLocaleString("ru-RU")} ₽ 💸`;
      diffEl.className = "result__diff result__diff--bad";
    } else {
      diffEl.textContent = `сэкономлено −${(real - guess).toLocaleString("ru-RU")} ₽ 😎`;
      diffEl.className = "result__diff result__diff--good";
    }

    $("result-points").textContent = pts;
    $("result-street").textContent = "📍 " + (l.street || "Калининград");
    $("result-link").href = l.url;

    $("screen-round").hidden = true;
    const result = $("screen-result");
    result.hidden = false;

    const card = $("result-card");
    card.classList.remove("shake");
    if (tier >= 3 && !reducedMotion) { void card.offsetWidth; card.classList.add("shake"); }
    if (tier === 0) confetti();

    $("btn-next").textContent = state.round + 1 >= ROUNDS ? "К итогу →" : "Дальше →";
  }

  /* ---------- Финал ---------- */
  function rankFor(total) {
    if (total < 2000) return "NPC-турист 🧍";
    if (total < 4000) return "Турист с Авито 📱";
    if (total < 6000) return "Знаток хат 🗝️";
    if (total < 8000) return "Риелтор-сигма 🕶️";
    return "Хозяин Калининграда 👑";
  }

  function showFinal() {
    updateHud();
    $("screen-round").hidden = true;
    $("screen-result").hidden = true;
    $("screen-final").hidden = false;

    countUp($("final-score"), state.total, 1200);
    $("final-rank").textContent = rankFor(state.total);

    const best = +(storage.get("hata-record") || 0);
    let recMsg;
    if (state.total > best) {
      storage.set("hata-record", String(state.total));
      recMsg = `🏆 Новый рекорд! (было ${best.toLocaleString("ru-RU")})`;
    } else {
      recMsg = `Рекорд: ${best.toLocaleString("ru-RU")} ауры`;
    }
    $("final-record").textContent = recMsg;
    confetti();
  }

  function share() {
    const text = `НОЧЬ ЗА СКОЛЬКО? 🌙\nМоя аура: ${state.total.toLocaleString("ru-RU")} — «${rankFor(state.total)}»\nУгадай цены ночи в Калининграде лучше меня!`;
    const done = () => {};
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      try { navigator.clipboard.writeText(text); } catch {}
    }
  }

  /* ---------- Обвязка ---------- */
  $("btn-lock").addEventListener("click", answer);
  $("btn-next").addEventListener("click", () => { state.round++; showRound(); });
  $("btn-restart").addEventListener("click", startGame);
  $("btn-share").addEventListener("click", share);

  function startGame() {
    state.deck = pickDeck();
    state.round = 0;
    state.total = 0;
    showRound();
  }

  startGame();
})();
