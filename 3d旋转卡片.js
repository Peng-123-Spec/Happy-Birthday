/* ===================================================
   生辰信笺 · 剑影江湖
   3D 卷轴信笺轮播 + 以心画愿 + 水墨夜景
   =================================================== */
(function () {
  "use strict";
  if (window.__SKB_CARDS__) return;
  window.__SKB_CARDS__ = true;

  /* ============ 可自定义内容 ============ */
  var CONFIG = {
    autoRotateInterval: 4600,   // 自动轮播间隔 (ms)
    autoJumpDelay: 20000,       // 自动进入下一页的延迟 (ms)
    nextPage: "./04-生日快乐.html",
    heartFadeDelay: 3200,       // 爱心画完后停留多久淡出
    contShowDelay: 9000,        // 「展开终章」按钮出现的延迟 (ms)
    maxJumpExtend: 3            // 用户互动最多可延后自动跳转的次数
  };
  /* ========================================= */

  var $ = function (id) { return document.getElementById(id); };
  var box = $("box"), lg = document.querySelector(".lg");
  var prevBtn = document.querySelector(".prev-btn");
  var nextBtn = document.querySelector(".next-btn");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".item"));
  var hint = $("hint"), cont = $("cont"), wipe = $("wipe"),
      dots = Array.prototype.slice.call(document.querySelectorAll("#dots i"));
  var heartCv = $("canvas"), hctx = heartCv.getContext("2d");

  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  if (!box || !cards.length) return;

  /* ================= 画布：星空 / 花瓣 / 萤火 / 金尘 ================= */
  var cv = $("fx"), ctx = cv.getContext("2d"), W = 0, H = 0;
  var stars = [], petals = [], flies = [], sparks = [];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    stars.length = 0; petals.length = 0; flies.length = 0;
    var i, n = Math.round(W * H / 11000);
    for (i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * .78,
        r: rand(.4, 1.5), p: Math.random() * 6.283, s: rand(.6, 2.2) });
    }
    n = Math.round(W / 34);
    for (i = 0; i < n; i++) petals.push(newPetal(true));
    n = Math.round(W / 130);
    for (i = 0; i < n; i++) {
      flies.push({ x: Math.random() * W, y: rand(H * .3, H * .95),
        r: rand(1, 2.3), p: Math.random() * 6.283, s: rand(.3, .9),
        vx: rand(-14, 14), vy: rand(-10, 6) });
    }
  }
  function newPetal(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : -30,
      r: rand(3, 7.5), vy: rand(20, 54), vx: rand(-16, 16),
      rot: Math.random() * 6.283, vr: rand(-1.4, 1.4),
      sway: rand(.5, 1.6), ph: Math.random() * 6.283,
      c: ["255,214,226", "255,240,214", "226,200,255", "255,255,255", "255,196,160"][(Math.random() * 5) | 0],
      a: rand(.32, .8) };
  }
  function spawnSparks(x, y, n, power) {
    var c = [[255,214,130], [255,152,172], [150,236,204], [152,192,255], [222,172,255]][(Math.random() * 5) | 0];
    n = n || 46; power = power || rand(1.6, 3.4);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + rand(-.1, .1), sp = power * (.5 + Math.random() * .8);
      sparks.push({ x: x, y: y, px: x, py: y,
        vx: Math.cos(a) * sp * 62, vy: Math.sin(a) * sp * 62,
        life: 0, max: rand(.7, 1.5), c: c, w: rand(1, 2.2) });
    }
  }

  function update(dt, t) {
    var i, p;
    for (i = 0; i < petals.length; i++) {
      p = petals[i];
      p.ph += dt * p.sway;
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(p.ph) * 20) * dt;
      p.rot += p.vr * dt;
      if (p.y > H + 40 || p.x < -60 || p.x > W + 60) petals[i] = newPetal(false);
    }
    for (i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.p += dt * f.s * 2;
      f.x += (f.vx + Math.sin(f.p) * 16) * dt;
      f.y += (f.vy + Math.cos(f.p * .8) * 12) * dt;
      if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
      if (f.y < H * .2) f.y = H * .95; if (f.y > H + 20) f.y = H * .25;
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.px = s.x; s.py = s.y;
      s.life += dt;
      var dg = Math.pow(.12, dt);
      s.vx *= dg; s.vy = s.vy * dg + 150 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life >= s.max) sparks.splice(i, 1);
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var i;
    ctx.save();
    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = .28 + .72 * (.5 + .5 * Math.sin(t * st.s + st.p));
      ctx.fillStyle = "rgba(220,232,255," + (a * .85).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.2832); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < flies.length; i++) {
      var f = flies[i];
      var al = .25 + .55 * (.5 + .5 * Math.sin(f.p * 1.7));
      var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
      g.addColorStop(0, "rgba(255,236,170," + (al * .9).toFixed(3) + ")");
      g.addColorStop(1, "rgba(255,200,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 5, 0, 6.2832); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (i = 0; i < petals.length; i++) {
      var p = petals[i];
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(" + p.c + "," + p.a.toFixed(2) + ")";
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .5, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (i = 0; i < sparks.length; i++) {
      var s = sparks[i], e = s.life / s.max, al2 = (1 - e) * (1 - e);
      ctx.strokeStyle = "rgba(" + s.c.join(",") + "," + (al2 * .95).toFixed(3) + ")";
      ctx.lineWidth = s.w * (1 - e * .6);
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    ctx.restore();
  }

  var last = performance.now(), acc = 0;
  function tick(now) {
    var dt = Math.min((now - last) / 1000, .05); last = now; acc += dt;
    update(dt, acc); draw(acc);
    requestAnimationFrame(tick);
  }

  /* ================= 音效 ================= */
  var AC = null;
  function ac() {
    try {
      if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
      if (AC.state === "suspended") AC.resume();
      return AC;
    } catch (e) { return null; }
  }
  function bell(freq, dur, vol) {
    var c = ac(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(vol || .07, c.currentTime + .012);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + (dur || 1.1));
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + (dur || 1.1) + .05);
      var o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = "sine"; o2.frequency.value = freq * 2.01;
      g2.gain.setValueAtTime(0, c.currentTime);
      g2.gain.linearRampToValueAtTime((vol || .07) * .26, c.currentTime + .01);
      g2.gain.exponentialRampToValueAtTime(.0001, c.currentTime + (dur || 1.1) * .7);
      o2.connect(g2); g2.connect(c.destination);
      o2.start(); o2.stop(c.currentTime + (dur || 1.1) + .05);
    } catch (e) { }
  }

  /* ================= 轮播 ================= */
  var Y = 0, activeIdx = -1, dragged = 0;

  function setActive() {
    var idx = (((1 - Y / 120) % 3) + 3) % 3;
    if (idx === activeIdx) return;
    activeIdx = idx;
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("active", i === idx);
    }
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle("on", j === idx);
  }

  function rotate(dir) {
    Y += dir * 120;
    box.style.transform = "rotateY(" + Y + "deg)";
    setActive();
  }

  function centerOfCard() {
    var r = cards[activeIdx >= 0 ? activeIdx : 0].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ================= 以心画愿 ================= */
  var deg = 0, heartRaf = null, heartTimer = null;

  function drawHeart() {
    hctx.clearRect(0, 0, heartCv.width, heartCv.height);
    hctx.save();
    hctx.translate(200, 200);
    hctx.scale(10, -10);
    hctx.globalAlpha = .8;
    hctx.strokeStyle = "#d13a24";
    hctx.lineWidth = .34;
    hctx.shadowBlur = 7;
    hctx.shadowColor = "rgba(220, 60, 40, .9)";
    hctx.beginPath();
    for (var t = 0; t < deg; t += .01) {
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      hctx.lineTo(x, y);
    }
    hctx.stroke();
    hctx.restore();

    if (deg < Math.PI * 2) {
      deg += .03;
      heartRaf = requestAnimationFrame(drawHeart);
    } else {
      var c = centerOfCard();
      spawnSparks(c.x, c.y, 70, 2.6);
      bell(783.99, 1.6, .05);
      clearTimeout(heartTimer);
      heartTimer = setTimeout(function () {
        heartCv.classList.remove("show");
        setTimeout(function () { hctx.clearRect(0, 0, heartCv.width, heartCv.height); }, 700);
      }, CONFIG.heartFadeDelay);
    }
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      if (Date.now() - dragged < 380) return;   // 拖拽翻页时不触发画心
      ac();
      if (heartRaf) cancelAnimationFrame(heartRaf);
      clearTimeout(heartTimer);
      deg = 0;
      heartCv.classList.add("show");
      drawHeart();
      if (hint) hint.classList.add("hide");
      var c = centerOfCard();
      spawnSparks(c.x, c.y, 26, 1.4);
      bell(659.25, 1.0, .045);
      userInteracted();
    });
  });

  /* ================= 交互：按钮 / 拖拽 / 键盘 ================= */
  if (nextBtn) nextBtn.addEventListener("click", function () { rotate(-1); userInteracted(); });
  if (prevBtn) prevBtn.addEventListener("click", function () { rotate(1); userInteracted(); });

  var downX = 0, downY = 0, downT = 0;
  if (lg) {
    lg.addEventListener("pointerdown", function (e) {
      downX = e.clientX; downY = e.clientY; downT = Date.now();
    });
    lg.addEventListener("pointerup", function (e) {
      var dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) && Date.now() - downT < 900) {
        dragged = Date.now();
        rotate(dx > 0 ? 1 : -1);
        userInteracted();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { rotate(-1); userInteracted(); }
    else if (e.key === "ArrowLeft") { rotate(1); userInteracted(); }
    else if (e.key === "Enter" || e.key === " ") { goNext(); }
  });

  /* ================= 自动轮播 / 自动跳转 ================= */
  var rotTimer = null, jumpTimer = null, extendCount = 0, jumping = false;

  function startRotate() {
    stopRotate();
    rotTimer = setInterval(function () { rotate(-1); }, CONFIG.autoRotateInterval);
  }
  function stopRotate() { if (rotTimer) { clearInterval(rotTimer); rotTimer = null; } }

  function startJump() {
    stopJump();
    jumpTimer = setTimeout(goNext, CONFIG.autoJumpDelay);
  }
  function stopJump() { if (jumpTimer) { clearTimeout(jumpTimer); jumpTimer = null; } }

  function userInteracted() {
    startRotate();
    if (extendCount < CONFIG.maxJumpExtend && !jumping) {
      extendCount++;
      startJump();
    }
  }

  function goNext() {
    if (jumping) return;
    jumping = true;
    stopRotate(); stopJump();
    if (cont) cont.classList.remove("on");
    if (wipe) wipe.classList.add("on");
    bell(392, 1.4, .07);
    setTimeout(function () { location.href = CONFIG.nextPage; }, 1150);
  }

  if (cont) cont.addEventListener("click", goNext);

  /* ================= 启动 ================= */
  resize(); seed(); setActive();
  window.addEventListener("resize", function () { resize(); seed(); });
  requestAnimationFrame(tick);

  startRotate();
  startJump();
  setTimeout(function () { if (cont) cont.classList.add("on"); }, CONFIG.contShowDelay);
})();
