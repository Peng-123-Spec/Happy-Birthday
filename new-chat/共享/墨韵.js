/* ============================================================================
   剑影江湖 · 共享运行时（墨韵.js）
   ----------------------------------------------------------------------------
   在本页 <head> 里用经典 script 引入（不要用 defer / type=module，file:// 下会被拦）：

       <link rel="stylesheet" href="共享/墨韵.css">
       <script src="共享/墨韵.js"></script>
       <script src="配置.js"></script>          <!-- 可选：集中管理文案 -->

   引入后自动获得：
     · 整套夜色背景 DOM（明月 / 远山 / 竹影 / 云雾 / 水墨 / 暗角 / 颗粒）
     · Ink.FX      粒子引擎：烟花 / 剑气 / 万剑归宗 / 孔明灯 / 冲击波 / 花瓣
     · Ink.Audio   五声音阶古琴音效（需用户先有一次点击）
     · Ink.go()    统一转场（金光 + 闪白 → 黑场 → 跳转）
     · Ink.act()   金色幕标题
     · Ink.flash() / Ink.shake() / Ink.bell() ...
     · 右上角音效开关、左上角返回（可选）
   ============================================================================ */
window.Ink = (function(){
  "use strict";

  /* ---------------------------------------------------------------- 基础工具 */
  var rand  = function(a,b){ return a + Math.random()*(b-a); };
  var pick  = function(a){ return a[(Math.random()*a.length)|0]; };
  var clamp = function(v,a,b){ return v<a?a:(v>b?b:v); };
  var $     = function(id){ return document.getElementById(id); };
  var SITE  = function(k, d){ return (window.SITE && window.SITE[k] !== undefined) ? window.SITE[k] : d; };

  /* ------------------------------------------------------------ 共享文案兜底 */
  var TEXT = {
    honorific : SITE("honorific", "少侠"),
    signature : SITE("signature", "剑心为贺 · 与君同赴此江湖"),
    backUrl   : SITE("backUrl", "./index.html")
  };

  /* ------------------------------------------------------------ 背景层 DOM */
  var BAMBOO_SVG =
    '<svg id="bamboo" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs>' +
        '<g id="inkStalk">' +
          '<rect x="-7" y="-40" width="14" height="880" rx="7" fill="#080d0b"/>' +
          '<rect x="-9" y="130" width="18" height="7" rx="3" fill="#0d1411"/>' +
          '<rect x="-9" y="300" width="18" height="7" rx="3" fill="#0d1411"/>' +
          '<rect x="-9" y="470" width="18" height="7" rx="3" fill="#0d1411"/>' +
          '<rect x="-9" y="640" width="18" height="7" rx="3" fill="#0d1411"/>' +
        '</g>' +
        '<g id="inkLeaf" fill="#080d0b">' +
          '<path d="M0 0 C 30 -20 70 -26 108 -14 C 68 8 30 14 0 0 Z"/>' +
          '<path d="M0 0 C 24 18 56 34 94 38 C 58 50 22 34 0 0 Z"/>' +
          '<path d="M0 0 C -28 -16 -66 -19 -102 -8 C -64 12 -28 12 0 0 Z"/>' +
          '<path d="M0 0 C -20 20 -48 38 -84 44 C -48 54 -18 34 0 0 Z"/>' +
        '</g>' +
      '</defs>' +
      '<g opacity=".95">' +
        '<use href="#inkStalk" transform="translate(52,0)"/>' +
        '<use href="#inkStalk" transform="translate(118,0)"/>' +
        '<use href="#inkStalk" transform="translate(1234,0)"/>' +
        '<use href="#inkStalk" transform="translate(1176,0)"/>' +
        '<use href="#inkStalk" transform="translate(300,0) scale(.82)"/>' +
        '<use href="#inkLeaf" transform="translate(88,150) scale(1.15)"/>' +
        '<use href="#inkLeaf" transform="translate(88,150) rotate(26) scale(.9)"/>' +
        '<use href="#inkLeaf" transform="translate(1200,232) rotate(180) scale(1.1)"/>' +
        '<use href="#inkLeaf" transform="translate(1200,232) rotate(150) scale(.85)"/>' +
        '<use href="#inkLeaf" transform="translate(330,398) rotate(196) scale(.8)"/>' +
      '</g>' +
    '</svg>';

  var mounted = false;
  function mountBackdrop(){
    if(mounted || !document.body) return;
    mounted = true;
    var b = document.body;
    function need(id, html, how, ref){
      if($(id)) return;
      var d = document.createElement("div");
      d.innerHTML = html;
      var node = d.firstChild;
      if(how === "before") b.insertBefore(node, ref || b.firstChild);
      else b.appendChild(node);
    }
    need("bg",    '<div id="bg"></div>',              "before");
    need("halo",  '<div id="halo"></div>',            "before");
    need("moon",  '<div id="moon"></div>',            "before");
    need("mtFar", '<div class="mt far"></div>',       "before");
    need("mtMid", '<div class="mt mid"></div>',       "before");
    need("bamboo", BAMBOO_SVG,                        "before");
    need("mtNear",'<div class="mt near"></div>',      "before");
    need("fx",    '<canvas id="fx"></canvas>',        "before");
    need("mist",  '<div id="mist"></div>',            "before");
    need("wash",  '<div id="wash"></div>',            "before");
    need("vig",   '<div id="vig"></div>');
    need("grain", '<div id="grain"></div>');
    need("inkflash", '<div id="inkflash"></div>');
    need("cine",  '<div id="cine"><i class="t"></i><i class="b"></i></div>');
    need("curtain",'<div id="curtain"></div>');
    FX.resize();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBackdrop);
  else mountBackdrop();

  /* ================================================================ 粒子引擎 */
  var cv = null, ctx = null, W = 1, H = 1;
  var stars = [], petals = [], sparks = [], swords = [], rings = [], lanterns = [], slashes = [];
  var PALETTE = [[255,214,130],[255,152,172],[150,236,204],[152,192,255],[222,172,255],[255,246,206]];

  function resize(){
    cv = $("fx");
    if(!cv){ return; }
    ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cv.style.width = W+"px"; cv.style.height = H+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function seedStars(){
    stars.length = 0;
    var n = Math.round(W*H/9000);
    for(var k=0;k<n;k++){
      stars.push({x:Math.random()*W, y:Math.random()*H*0.75,
        r:rand(0.4,1.5), p:Math.random()*Math.PI*2, s:rand(0.6,2.1)});
    }
  }
  function newPetal(anywhere){
    return {x:Math.random()*W, y:anywhere?Math.random()*H:-30,
      r:rand(3,7.5), vy:rand(22,58), vx:rand(-16,16),
      rot:Math.random()*Math.PI*2, vr:rand(-1.4,1.4),
      sway:rand(0.5,1.6), ph:Math.random()*Math.PI*2,
      c:pick(["255,214,226","255,240,214","226,200,255","255,255,255","255,196,160"]),
      a:rand(0.35,0.85)};
  }
  function seedPetals(){
    petals.length = 0;
    var n = Math.round(W/32);
    for(var k=0;k<n;k++) petals.push(newPetal(true));
  }

  function sparks_(x,y,pi,count,power){
    var c = PALETTE[((pi%PALETTE.length)+PALETTE.length)%PALETTE.length];
    count = count || 72; power = power || rand(2.1,4.4);
    for(var k=0;k<count;k++){
      var a = (k/count)*Math.PI*2 + rand(-0.06,0.06);
      var sp = power*(0.5+Math.random()*0.8);
      sparks.push({x:x,y:y,px:x,py:y,
        vx:Math.cos(a)*sp*62, vy:Math.sin(a)*sp*62,
        life:0, max:rand(0.85,1.7), c:c, w:rand(1,2.3)});
    }
    rings.push({x:x,y:y,r:2,max:rand(70,150),life:0,dur:0.75,c:c});
  }
  function firework(x,y,pi){
    sparks_(x,y, pi===undefined ? (Math.random()*PALETTE.length)|0 : pi);
  }
  function barrage(n){
    n = n || 9;
    for(var k=0;k<n;k++){
      (function(k){
        setTimeout(function(){
          firework(rand(W*0.08,W*0.92), rand(H*0.08,H*0.52), k);
        }, k*130);
      })(k);
    }
  }
  function convergeSwords(cx,cy,n){
    n = n || 64;
    for(var k=0;k<n;k++){
      var a = Math.random()*Math.PI*2;
      var d = Math.max(W,H)*rand(0.72,1.35);
      swords.push({
        sx:cx+Math.cos(a)*d, sy:cy+Math.sin(a)*d,
        cx:cx+rand(-22,22),  cy:cy+rand(-22,22),
        t:-Math.random()*0.42, dur:rand(0.5,1.0), w:rand(1.1,3.4)
      });
    }
  }
  function slash(){
    var fromLeft = Math.random()<0.5;
    slashes.push({
      x:fromLeft?-120:W+120, y:rand(H*0.15,H*0.8),
      tx:fromLeft?W+120:-120, ty:rand(H*0.15,H*0.8),
      t:0, dur:rand(0.55,0.95), len:rand(160,340), w:rand(1.6,3.6)
    });
  }
  function lantern(){
    var hue = pick([[255,214,130],[255,170,120],[255,236,180]]);
    lanterns.push({x:rand(W*0.06,W*0.94), y:H+60, vy:rand(-46,-26),
      w:rand(14,26), h:rand(20,34), life:0, max:rand(9,15), c:hue, ph:Math.random()*Math.PI*2});
  }
  function lanterns_(n){ n=n||7; for(var k=0;k<n;k++) lantern(); }
  function shockwave(x,y,c){
    rings.push({x:x,y:y,r:2,max:Math.max(W,H)*0.7,life:0,dur:1.1,c:c||[255,232,180]});
  }

  /* ---------- 内部更新/绘制 ---------- */
  function step(dt){
    var k,p;
    for(k=0;k<petals.length;k++){
      p = petals[k];
      p.ph += dt*p.sway; p.y += p.vy*dt;
      p.x += (p.vx + Math.sin(p.ph)*22)*dt;
      p.rot += p.vr*dt;
      if(p.y>H+40 || p.x<-60 || p.x>W+60) petals[k] = newPetal(false);
    }
    for(k=sparks.length-1;k>=0;k--){
      var s = sparks[k];
      s.px = s.x; s.py = s.y; s.life += dt;
      var dg = Math.pow(0.12,dt);
      s.vx *= dg; s.vy = s.vy*dg + 150*dt;
      s.x += s.vx*dt; s.y += s.vy*dt;
      if(s.life>=s.max) sparks.splice(k,1);
    }
    for(k=swords.length-1;k>=0;k--){
      var sw = swords[k]; sw.t += dt;
      if(sw.t>=sw.dur){ swords.splice(k,1); if(Math.random()<0.35) sparks_(sw.cx,sw.cy,4,10,1.1); }
    }
    for(k=rings.length-1;k>=0;k--){ rings[k].life += dt; if(rings[k].life>=rings[k].dur) rings.splice(k,1); }
    for(k=slashes.length-1;k>=0;k--){ slashes[k].t += dt; if(slashes[k].t>=slashes[k].dur) slashes.splice(k,1); }
    for(k=lanterns.length-1;k>=0;k--){
      var L = lanterns[k];
      L.life += dt; L.y += L.vy*dt; L.x += Math.sin(L.life*1.2+L.ph)*10*dt;
      if(L.life>=L.max) lanterns.splice(k,1);
    }
  }

  function render(t){
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    var k;
    ctx.save();
    for(k=0;k<stars.length;k++){
      var s = stars[k];
      var a = 0.28 + 0.72*(0.5+0.5*Math.sin(t*s.s+s.p));
      ctx.fillStyle = "rgba(220,232,255,"+(a*0.85).toFixed(3)+")";
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.2832); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for(k=0;k<petals.length;k++){
      var p = petals[k];
      ctx.save();
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = "rgba("+p.c+","+p.a.toFixed(2)+")";
      ctx.beginPath(); ctx.ellipse(0,0,p.r,p.r*0.5,0,0,6.2832); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(k=0;k<lanterns.length;k++){
      var L = lanterns[k];
      var f = clamp(L.life/1.2,0,1)*clamp((L.max-L.life)/2,0,1);
      var g = ctx.createRadialGradient(L.x,L.y,0,L.x,L.y,L.w*3.4);
      g.addColorStop(0,"rgba("+L.c.join(",")+","+(0.5*f).toFixed(3)+")");
      g.addColorStop(1,"rgba("+L.c.join(",")+",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(L.x,L.y,L.w*3.4,0,6.2832); ctx.fill();
      ctx.fillStyle = "rgba(255,232,168,"+(0.85*f).toFixed(3)+")";
      ctx.beginPath(); ctx.ellipse(L.x,L.y,L.w*0.5,L.h*0.4,0,0,6.2832); ctx.fill();
      ctx.fillStyle = "rgba(190,90,50,"+(0.5*f).toFixed(3)+")";
      ctx.fillRect(L.x-L.w*0.5,L.y+L.h*0.34,L.w,2);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(k=0;k<rings.length;k++){
      var r = rings[k], e = r.life/r.dur;
      var rad = 2 + (r.max-2)*(1-Math.pow(1-e,3));
      var al = (1-e)*0.85;
      ctx.strokeStyle = "rgba("+r.c.join(",")+","+al.toFixed(3)+")";
      ctx.lineWidth = 2.4*(1-e)+0.5;
      ctx.beginPath(); ctx.arc(r.x,r.y,rad,0,6.2832); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(k=0;k<swords.length;k++){
      var sw = swords[k];
      if(sw.t<0) continue;
      var pr = clamp(sw.t/sw.dur,0,1), ee = pr*pr*pr;
      var x = sw.sx+(sw.cx-sw.sx)*ee, y = sw.sy+(sw.cy-sw.sy)*ee;
      var dx = x-sw.sx, dy = y-sw.sy, m = Math.sqrt(dx*dx+dy*dy)||1;
      var ux = dx/m, uy = dy/m;
      var len = 110 + 220*(1-pr);
      var tx = x-ux*len, ty = y-uy*len;
      var alpha = clamp(pr*4,0,1)*clamp((1-pr)*3.2,0,1);
      var g2 = ctx.createLinearGradient(tx,ty,x,y);
      g2.addColorStop(0,"rgba(255,236,190,0)");
      g2.addColorStop(0.62,"rgba(255,214,130,"+(alpha*0.5).toFixed(3)+")");
      g2.addColorStop(1,"rgba(255,252,236,"+alpha.toFixed(3)+")");
      ctx.strokeStyle = g2; ctx.lineWidth = sw.w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(x,y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,"+(alpha*0.9).toFixed(3)+")";
      ctx.beginPath(); ctx.arc(x,y,sw.w*0.9,0,6.2832); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(k=0;k<slashes.length;k++){
      var sl = slashes[k];
      var pp = clamp(sl.t/sl.dur,0,1);
      var e2 = pp<0.5 ? 2*pp*pp : 1-Math.pow(-2*pp+2,2)/2;
      var sx = sl.x+(sl.tx-sl.x)*e2, sy = sl.y+(sl.ty-sl.y)*e2;
      var ddx = sl.tx-sl.x, ddy = sl.ty-sl.y, mm = Math.sqrt(ddx*ddx+ddy*ddy)||1;
      var uux = ddx/mm, uuy = ddy/mm;
      var aa = Math.sin(pp*Math.PI)*0.9;
      var g3 = ctx.createLinearGradient(sx-uux*sl.len, sy-uuy*sl.len, sx, sy);
      g3.addColorStop(0,"rgba(200,225,255,0)");
      g3.addColorStop(1,"rgba(236,248,255,"+aa.toFixed(3)+")");
      ctx.strokeStyle = g3; ctx.lineWidth = sl.w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx-uux*sl.len, sy-uuy*sl.len); ctx.lineTo(sx,sy); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,"+(aa*0.35).toFixed(3)+")";
      ctx.lineWidth = sl.w*3.2;
      ctx.beginPath(); ctx.moveTo(sx-uux*sl.len*0.4, sy-uuy*sl.len*0.4); ctx.lineTo(sx,sy); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for(k=0;k<sparks.length;k++){
      var s2 = sparks[k], e3 = s2.life/s2.max, a3 = (1-e3)*(1-e3);
      ctx.strokeStyle = "rgba("+s2.c.join(",")+","+(a3*0.95).toFixed(3)+")";
      ctx.lineWidth = s2.w*(1-e3*0.6);
      ctx.beginPath(); ctx.moveTo(s2.px,s2.py); ctx.lineTo(s2.x,s2.y); ctx.stroke();
    }
    ctx.restore();
  }

  var last = 0, tAcc = 0, running = false;
  function tick(now){
    if(!last) last = now;
    var dt = Math.min((now-last)/1000, 0.05); last = now; tAcc += dt;
    step(dt); render(tAcc);
    requestAnimationFrame(tick);
  }
  function start(){
    if(running) return; running = true;
    resize(); seedStars(); seedPetals();
    window.addEventListener("resize", function(){ resize(); seedStars(); seedPetals(); });
    requestAnimationFrame(tick);
  }

  /* ================================================================== 音效 */
  var AC = null, soundOn = SITE("sound", true);
  function ac(){
    if(!soundOn) return null;
    try{
      if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AC = new C(); }
      if(AC.state === "suspended") AC.resume();
      return AC;
    }catch(e){ return null; }
  }
  function bell(freq,dur,vol){
    var c = ac(); if(!c) return;
    try{
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0,c.currentTime);
      g.gain.linearRampToValueAtTime(vol||0.09, c.currentTime+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+(dur||1.2));
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime+(dur||1.2)+0.05);
      var o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = "sine"; o2.frequency.value = freq*2.01;
      g2.gain.setValueAtTime(0,c.currentTime);
      g2.gain.linearRampToValueAtTime((vol||0.09)*0.28, c.currentTime+0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+(dur||1.2)*0.7);
      o2.connect(g2); g2.connect(c.destination);
      o2.start(); o2.stop(c.currentTime+(dur||1.2)+0.05);
    }catch(e){}
  }
  function whoosh(){
    var c = ac(); if(!c) return;
    try{
      var len = Math.floor(c.sampleRate*0.5);
      var buf = c.createBuffer(1,len,c.sampleRate), d = buf.getChannelData(0);
      for(var k=0;k<len;k++) d[k] = (Math.random()*2-1)*Math.pow(1-k/len,2.2);
      var src = c.createBufferSource(); src.buffer = buf;
      var bp = c.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.setValueAtTime(2400,c.currentTime);
      bp.frequency.exponentialRampToValueAtTime(320,c.currentTime+0.45);
      bp.Q.value = 1.1;
      var g = c.createGain(); g.gain.value = 0.14;
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start();
    }catch(e){}
  }
  /* 五声音阶：宫商角徵羽 */
  var PENTA = [261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25,783.99];
  var bgmTimer = null;
  function bgm(on){
    if(bgmTimer){ clearInterval(bgmTimer); bgmTimer = null; }
    if(!on) return;
    bgmTimer = setInterval(function(){
      if(document.hidden || !soundOn) return;
      bell(PENTA[(Math.random()*PENTA.length)|0], rand(1.6,3.0), 0.018);
    }, 1500);
  }
  function setSound(on){
    soundOn = !!on;
    var b = $("inkSound");
    if(b){ b.textContent = soundOn ? "♪" : "✕"; b.style.opacity = soundOn ? "0.85" : "0.4"; }
    if(!soundOn && bgmTimer){ clearInterval(bgmTimer); bgmTimer = null; }
  }

  /* ================================================================ 通用特效 */
  function flash(strength, ms){
    var f = $("inkflash"); if(!f) return;
    f.style.transition = "none";
    f.style.opacity = String(strength);
    void f.offsetWidth;
    f.style.transition = "opacity "+(ms||720)+"ms cubic-bezier(.2,.7,.2,1)";
    f.style.opacity = "0";
  }
  function shake(ms, el){
    var t = el || document.body;
    t.classList.remove("shake");
    void t.offsetWidth;
    t.classList.add("shake");
    setTimeout(function(){ t.classList.remove("shake"); }, ms||620);
  }
  function cine(on){ var c = $("cine"); if(c) c.classList.toggle("on", !!on); }
  function curtain(on){
    var c = $("curtain"); if(!c) return;
    if(on) c.classList.remove("off"); else c.classList.add("off");
  }
  function act(title, sub){
    var old = document.querySelector(".act");
    if(old && old.parentNode) old.parentNode.removeChild(old);
    var d = document.createElement("div");
    d.className = "act";
    d.innerHTML = "<b></b><i></i>";
    d.querySelector("b").textContent = title || "";
    d.querySelector("i").textContent = sub || "";
    document.body.appendChild(d);
    void d.offsetWidth;
    d.classList.add("on");
    setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 5200);
    return d;
  }

  /* ================================================================ 转场跳转 */
  var going = false;
  function go(url, delay){
    if(going) return; going = true;
    try{
      flash(0.62, 640);
      whoosh();
      shake(420);
      convergeSwords(W/2, H/2, 42);
    }catch(e){}
    setTimeout(function(){ curtain(true); }, 220);
    setTimeout(function(){ location.href = url; }, delay===undefined ? 1500 : delay);
  }
  function reveal(){
    var doIt = function(){ var c = $("curtain"); if(c) c.classList.add("off"); };
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", doIt);
    else setTimeout(doIt, 120);
  }

  /* ================================================================ 控件注入 */
  function controls(opt){
    opt = opt || {};
    if(!$("inkSound")){
      var b = document.createElement("button");
      b.id = "inkSound"; b.className = "btn-gold"; b.title = "音效开关";
      b.textContent = soundOn ? "♪" : "✕";
      b.addEventListener("click", function(){
        setSound(!soundOn);
        if(soundOn){ ac(); bell(523.25,0.9,0.07); if(opt.bgm !== false) bgm(true); }
      });
      document.body.appendChild(b);
      setTimeout(function(){ b.classList.add("on"); }, opt.delay===undefined ? 900 : opt.delay);
    }
    if(opt.back && !$("inkBack")){
      var k = document.createElement("button");
      k.id = "inkBack"; k.className = "btn-gold";
      k.textContent = "← " + (opt.backText || "返回");
      k.addEventListener("click", function(){ go(opt.back); });
      document.body.appendChild(k);
      setTimeout(function(){ k.classList.add("on"); }, 700);
    }
    if(opt.hint && !document.querySelector(".hint-cn")){
      var h = document.createElement("div");
      h.className = "hint-cn"; h.textContent = opt.hint;
      document.body.appendChild(h);
      setTimeout(function(){ h.classList.add("on"); }, opt.hintDelay===undefined ? 2400 : opt.hintDelay);
    }
    /* 首次交互解锁音频 */
    var unlock = function(){
      ac();
      document.removeEventListener("pointerdown", unlock, true);
      if(opt.bgm !== false){ bgm(true); }
    };
    document.addEventListener("pointerdown", unlock, true);
  }

  /* ================================================================== 对外 */
  var FX = {
    resize: resize, start: start,
    sparks: sparks_, firework: firework, barrage: barrage,
    swords: convergeSwords, slash: slash,
    lantern: lantern, lanterns: lanterns_, shockwave: shockwave,
    palette: PALETTE,
    count: function(){ return {stars:stars.length,petals:petals.length,sparks:sparks.length}; }
  };

  return {
    SITE: SITE, TEXT: TEXT, PALETTE: PALETTE,
    rand: rand, pick: pick, clamp: clamp, $: $,
    FX: FX,
    bell: bell, whoosh: whoosh, bgm: bgm, ac: ac,
    soundOn: function(){ return soundOn; }, setSound: setSound,
    flash: flash, shake: shake, cine: cine, curtain: curtain, act: act,
    go: go, reveal: reveal, controls: controls,
    sound: function(){ ac(); bell(523.25,0.9,0.07); },
    text: function(t){ return t; }
  };
})();
