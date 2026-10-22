
/* ========================================================================
   光岳楼 · 金色粒子 WebGL 场景（供六幕长卷内嵌使用）
   用法：
     var lh = LightHouse.init(canvas, { bloom:true });
     // 每帧
     lh.frame(u, t, m);
   u = 本幕内进度 0..1，t = 全局秒，m = {x,y} 归一化鼠标(0..1)
   内部 API：
     lh.burst()        触发一次“万点齐飞”
     lh.setMouse(nx,ny)
     lh.size
   ======================================================================== */
window.LightHouse = (function(){
  'use strict';

  var AW = 1600, AH = 900;

  /* ---------- 一、离屏画线稿 ---------- */
  var art = document.createElement('canvas');
  art.width = AW; art.height = AH;
  var g = art.getContext('2d');

  var C_D = 'rgba(150,112,58,1)', C_M = 'rgba(206,150,74,1)',
      C_B = 'rgba(255,214,138,1)', C_H = 'rgba(255,246,214,1)',
      C_R = 'rgba(255,170,88,1)';

  function L(a,b,c,d){ g.beginPath(); g.moveTo(a,b); g.lineTo(c,d); g.stroke(); }
  function Q(a,b,cx,cy,c,d){ g.beginPath(); g.moveTo(a,b); g.quadraticCurveTo(cx,cy,c,d); g.stroke(); }
  function CI(x,y,r){ g.beginPath(); g.arc(x,y,r,0,6.2832); g.stroke(); }

  function roof(cx, eaveY, hw, hgt, col){
    var tip = hgt*0.22, sag = hgt*0.10;
    g.strokeStyle = col; g.lineWidth = 6; g.lineCap='round';
    Q(cx-hw, eaveY-tip, cx-hw*0.5, eaveY+sag, cx, eaveY+sag*1.15);
    Q(cx, eaveY+sag*1.15, cx+hw*0.5, eaveY+sag, cx+hw, eaveY-tip);
    g.lineWidth = 2.6;
    Q(cx-hw*0.95, eaveY-tip+15, cx-hw*0.48, eaveY+sag+15, cx, eaveY+sag*1.15+15);
    Q(cx, eaveY+sag*1.15+15, cx+hw*0.48, eaveY+sag+15, cx+hw*0.95, eaveY-tip+15);
    var ry = eaveY - hgt;
    g.lineWidth = 4;
    Q(cx-hw*0.46, ry+7, cx, ry-6, cx+hw*0.46, ry+7);
    g.lineWidth = 2.8;
    Q(cx-hw*0.46, ry+7, cx-hw*0.78, ry+hgt*0.32, cx-hw, eaveY-tip);
    Q(cx+hw*0.46, ry+7, cx+hw*0.78, ry+hgt*0.32, cx+hw, eaveY-tip);
    g.lineWidth = 3; CI(cx-hw*0.46, ry+2, 5); CI(cx+hw*0.46, ry+2, 5);
    g.lineWidth = 1.4;
    var nt = Math.round(hw/8);
    for (var i=-nt;i<=nt;i++){
      var t = i/nt;
      var xt = cx + t*hw*0.46, yt = ry+7 - Math.abs(t)*3;
      var xb = cx + t*hw*0.94, yb = eaveY + sag*(1-Math.abs(t)*0.86) - tip*Math.pow(Math.abs(t),3.2);
      g.beginPath(); g.moveTo(xt,yt); g.lineTo(xb,yb); g.stroke();
    }
  }
  function storey(cx, topY, botY, hw, colCol, colWin){
    var h = botY - topY;
    g.strokeStyle = colCol; g.lineWidth = 5; L(cx-hw, topY, cx+hw, topY);
    g.lineWidth = 3; L(cx-hw, botY, cx+hw, botY);
    var nc = 6;
    for (var i=0;i<=nc;i++){ var x = cx-hw + 2*hw*i/nc; g.lineWidth = 4; L(x, topY, x, botY); }
    g.strokeStyle = colWin; g.lineWidth = 1.7;
    for (var k=0;k<nc;k++){
      var x0 = cx-hw+2*hw*k/nc, x1 = cx-hw+2*hw*(k+1)/nc;
      var m = (x0+x1)/2, w2 = (x1-x0)*0.30;
      for (var yy=topY+h*0.26; yy<botY-5; yy+=11) L(m-w2, yy, m+w2, yy);
      for (var vx=m-w2; vx<=m+w2+0.1; vx+=w2/1.6) L(vx, topY+h*0.26, vx, botY-7);
    }
  }
  function merlons(x0, x1, yTop, h){
    g.strokeStyle = C_B; g.lineWidth = 3.4;
    var w = 42, gp = 32, x = x0;
    while (x < x1-10){
      var xr = Math.min(x+w, x1);
      g.beginPath(); g.moveTo(x, yTop+h); g.lineTo(x, yTop); g.lineTo(xr, yTop); g.lineTo(xr, yTop+h); g.stroke();
      x += w + gp;
    }
  }
  function bricks(y0, y1, acx, asp, ar){
    g.lineWidth = 2.3;
    var row = 0;
    for (var y=y0; y<=y1; y+=24){
      var ho = 0;
      if (y > asp) ho = ar;
      else if (y > asp-ar) ho = Math.sqrt(Math.max(0, ar*ar-(asp-y)*(asp-y)));
      g.globalAlpha = 0.88;
      if (ho>0){ L(0,y,acx-ho,y); L(acx+ho,y,AW,y); } else L(0,y,AW,y);
      g.globalAlpha = 0.62;
      var off = (row%2)?18:0;
      for (var x=off; x<AW; x+=36){
        var h2 = 0;
        if (y > asp) h2 = ar;
        else if (y > asp-ar) h2 = Math.sqrt(Math.max(0, ar*ar-(asp-y)*(asp-y)));
        if (h2>0 && x > acx-h2-6 && x < acx+h2+6) continue;
        L(x,y,x,y+24);
      }
      g.globalAlpha = 1; row++;
    }
  }

  function drawTower(){
    g.clearRect(0,0,AW,AH);
    g.lineCap='round'; g.lineJoin='round';
    var CX=800, GROUND=890, WT=500, BX0=486, BX1=1114, BT=470, SPR=800, AR=112;

    g.strokeStyle = C_D; g.lineWidth = 2.4;
    L(0,GROUND,AW,GROUND);
    for (var i=0;i<AW;i+=26) L(i,GROUND,i-9,GROUND+16);

    g.strokeStyle='rgba(116,84,40,1)'; g.lineWidth=1.6;
    Q(20,300,220,262,430,300); Q(1170,330,1370,292,1580,330); Q(120,200,340,172,560,206);

    g.strokeStyle=C_D; g.lineWidth=4;
    L(0,WT,BX0,WT); L(BX1,WT,AW,WT);
    bricks(WT+12, GROUND-4, CX, SPR, AR);
    merlons(0, BX0-4, WT-42, 42); merlons(BX1+4, AW, WT-42, 42);
    g.strokeStyle=C_M; g.lineWidth=2.6;
    L(0,WT-42,BX0-4,WT-42); L(BX1+4,WT-42,AW,WT-42);

    g.strokeStyle=C_B; g.lineWidth=4.5;
    g.beginPath(); g.moveTo(BX0,GROUND); g.lineTo(BX0,BT); g.lineTo(BX1,BT); g.lineTo(BX1,GROUND); g.stroke();
    g.lineWidth=2.6; L(BX0-16,BT,BX1+16,BT); L(BX0-16,BT+16,BX1+16,BT+16);

    g.strokeStyle=C_H; g.lineWidth=6;
    g.beginPath(); g.moveTo(CX-AR,GROUND-2); g.lineTo(CX-AR,SPR); g.arc(CX,SPR,AR,Math.PI,0); g.lineTo(CX+AR,GROUND-2); g.stroke();
    g.lineWidth=2.4; g.strokeStyle=C_M;
    g.beginPath(); g.moveTo(CX-AR-14,GROUND-2); g.lineTo(CX-AR-14,SPR); g.arc(CX,SPR,AR+14,Math.PI,0); g.lineTo(CX+AR+14,GROUND-2); g.stroke();
    g.lineWidth=1.8;
    for (var mx=-AR+18; mx<=AR-18; mx+=18){
      var yy = SPR + Math.sqrt(Math.max(0, AR*AR-mx*mx));
      L(CX+mx, GROUND-4, CX+mx, Math.max(yy+6, SPR+26));
    }

    g.strokeStyle=C_H; g.lineWidth=4; g.strokeRect(664,618,272,58);
    g.lineWidth=2; g.strokeRect(674,626,252,42);
    g.lineWidth=3.4;
    g.strokeRect(724,634,34,26); g.strokeRect(774,634,34,26);
    g.strokeRect(824,634,34,26); g.strokeRect(874,634,34,26);

    [636,964].forEach(function(sx){
      g.strokeStyle=C_M; g.lineWidth=2.6;
      CI(sx,726,30); CI(sx,726,20); L(sx-15,726,sx+15,726); L(sx,711,sx,741);
    });

    g.strokeStyle=C_B; g.lineWidth=4;
    L(CX-300,BT,CX+300,BT); L(CX-300,BT-12,CX+300,BT-12);

    storey(CX,368,458,250,C_M,C_D);
    g.strokeStyle=C_R; g.lineWidth=3;
    L(CX-268,436,CX+268,436);
    for (var rr=CX-266; rr<=CX+266; rr+=17) L(rr,436,rr,452);
    L(CX-268,452,CX+268,452);

    roof(CX,368,292,74,C_B);
    [-206,-108,108,206].forEach(function(dx){
      g.strokeStyle=C_R; g.lineWidth=3;
      CI(CX+dx,392,13); L(CX+dx,379,CX+dx,370); L(CX+dx,405,CX+dx,414);
    });
    storey(CX,294,368,184,C_M,C_D);
    roof(CX,294,224,60,C_B);
    [-150,-60,60,150].forEach(function(dx){ g.strokeStyle=C_R; g.lineWidth=2.6; CI(CX+dx,314,10); });

    storey(CX,162,294,128,C_M,C_D);
    g.strokeStyle=C_R; g.lineWidth=2.6;
    [-96,-32,32,96].forEach(function(dx){ CI(CX+dx,268,11); });

    roof(CX,162,190,58,C_B);
    g.strokeStyle=C_H; g.lineWidth=5; L(CX-92,104,CX+92,104);
    g.lineWidth=3; CI(CX,96,15); CI(CX,96,7);
    g.lineWidth=3.4;
    Q(CX-92,104,CX-108,88,CX-96,72); Q(CX+92,104,CX+108,88,CX+96,72);
    g.lineWidth=2.4; CI(CX-178,148,6); CI(CX+178,148,6);
    g.strokeStyle=C_B; g.lineWidth=3.4; L(CX-148,200,CX+148,200);
  }

  /* 第二张线稿：金色「生日快乐」 */
  function drawBirthday(){
    g.clearRect(0,0,AW,AH);
    g.lineCap='round'; g.lineJoin='round';
    g.textAlign='center'; g.textBaseline='middle';
    g.strokeStyle = C_M; g.lineWidth = 3;
    g.strokeRect(70, 300, AW-140, 300);
    g.lineWidth = 1.4;
    g.strokeRect(86, 316, AW-172, 268);
    g.fillStyle = C_H;
    g.font = '700 210px "STKaiti","KaiTi","Songti SC","STSong",serif';
    g.fillText('生日快乐', AW/2, 452);
    g.fillStyle = C_B;
    g.font = '400 58px "STKaiti","KaiTi","Songti SC",serif';
    g.fillText('愿 你 岁 岁 长 安 · 常 乐 无 忧', AW/2, 236);
    g.strokeStyle = C_R; g.lineWidth = 4;
    g.strokeRect(AW-232, 660, 96, 96);
    g.fillStyle = C_R;
    g.font = '400 40px "STKaiti","KaiTi",serif';
    g.fillText('岁', AW-206, 690); g.fillText('安', AW-206, 736);
    g.fillText('平', AW-170, 690); g.fillText('康', AW-170, 736);
    g.fillStyle = C_B;
    for (var i=0;i<420;i++){
      var x = Math.random()*AW, y = Math.random()*AH;
      if (y>300 && y<600) continue;
      g.globalAlpha = 0.35 + Math.random()*0.5;
      g.fillRect(x, y, 2.2, 2.2);
    }
    g.globalAlpha = 1;
  }

  function sampleArt(){
    var d = g.getImageData(0,0,AW,AH).data, out = [];
    for (var y=0;y<AH;y+=2){
      for (var x=0;x<AW;x+=2){
        var o = (y*AW+x)*4;
        if (d[o+3] < 60) continue;
        var lum = (d[o]*0.299 + d[o+1]*0.587 + d[o+2]*0.114) / 255;
        out.push(x/AW, y/AH, lum);
      }
    }
    return out;
  }

  /* ---------- 着色器 ---------- */
  var VS = [
  'attribute float aRnd;',
  'attribute float aSize;',
  'attribute vec3 aColor;',
  'attribute vec3 aPosB;',
  'uniform float uTime;',
  'uniform vec2 uMouse;',
  'uniform float uBurst;',
  'uniform float uGather;',
  'uniform float uMorph;',
  'uniform float uDpr;',
  'uniform float uPpu;',
  'uniform float uDist;',
  'varying vec3 vCol;',
  'varying float vA;',
  'void main(){',
  '  vec3 p = mix(position, aPosB, uMorph);',
  '  float t = uTime;',
  '  float ph = aRnd * 6.2832;',
  '  p.x += sin(t*0.90 - p.y*0.0036)*6.0 + sin(t*0.47 + p.x*0.0021)*3.5;',
  '  p.y += cos(t*0.78 - p.x*0.0031)*5.0 + cos(t*0.41 + p.y*0.0019)*3.0;',
  '  p.z += sin(t*0.55 + p.x*0.002)*16.0;',
  '  vec2 m0 = uMouse.x >= 20000.0 ? vec2(0.0) : uMouse.xy;',
  '  vec2 d = p.xy - m0;',
  '  float dl = length(d);',
  '  float infl = smoothstep(165.0, 0.0, dl) * (uMouse.x >= 20000.0 ? 0.0 : 1.0);',
  '  p.xy += normalize(d + vec2(0.0001)) * infl * (52.0 + 26.0*sin(t*4.0));',
  '  p.z += infl * 90.0;',
  '  vec2 dir = p.xy + vec2(0.0001);',
  '  p.xy += normalize(dir) * uBurst * (260.0 + aRnd*1100.0);',
  '  p.z += uBurst * (320.0 + aRnd*1100.0);',
  '  p.x += sin(aRnd*47.0) * (1.0-uGather) * 520.0;',
  '  p.y += cos(aRnd*61.0) * (1.0-uGather) * 380.0;',
  '  p.z += sin(aRnd*37.0) * (1.0-uGather) * 720.0;',
  '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
  '  gl_Position = projectionMatrix * mv;',
  '  float breathe = 0.78 + 0.55 * (0.5 + 0.5*sin(t*1.7 + p.y*0.0055 + p.x*0.0022));',
  '  gl_PointSize = aSize * uDpr * uPpu * breathe * (uDist / max(600.0, -mv.z));',
  '  float flick = 0.5 + 0.5 * sin(t*1.9 + p.y*0.006 + p.x*0.003) * 0.75 + 0.25*sin(t*3.1 + ph*5.0);',
  '  float sweep = 0.5 + 0.5 * sin(t*1.15 - (p.y*0.010 + p.x*0.004));',
  '  float ring = smoothstep(0.35, 0.0, abs(sin(t*0.8 - length(p.xy)*0.006)));',
  '  vA = (0.30 + 0.70*flick) * (0.55 + 0.90*sweep) + ring*0.55 + infl*1.9;',
  '  vA *= (1.0 + uBurst*0.60) * uGather;',
  '  vCol = aColor * (0.60 + 0.85*flick) * (0.65 + 0.55*sweep);',
  '}'
  ].join('\n');

  var FS = [
  'varying vec3 vCol;',
  'varying float vA;',
  'void main(){',
  '  vec2 c = gl_PointCoord - 0.5;',
  '  float d = length(c);',
  '  if (d > 0.5) discard;',
  '  float a = smoothstep(0.5, 0.0, d);',
  '  a = pow(a, 1.30);',
  '  float core = smoothstep(0.19, 0.0, d);',
  '  vec3 col = vCol * (0.85 + 0.55 * a) + vec3(1.0, 0.94, 0.78) * core * 1.05;',
  '  gl_FragColor = vec4(col, clamp(a * vA, 0.0, 1.0));',
  '}'
  ].join('\n');

  /* ---------- 初始化 ---------- */
  function init(canvas, opt){
    opt = opt || {};
    drawTower();
    var SA = sampleArt();
    drawBirthday();
    var SB = sampleArt();

    var N = Math.min(260000, Math.floor(SA.length/3));
    var pos = new Float32Array(N*3);
    var posB = new Float32Array(N*3);
    var nB = Math.floor(SB.length/3);
    var aRnd = new Float32Array(N);
    var aSz  = new Float32Array(N);
    var aCol = new Float32Array(N*3);

    var W = canvas.clientWidth || window.innerWidth;
    var H = canvas.clientHeight || window.innerHeight;

    var FOV = 40, vh = 900, vw = 1600, camDist = 1400;
    function fit(){
      vh = Math.max(900, 1600 * (H/W)) * 1.04;
      vw = vh * (W/H);
      camDist = (vh/2) / Math.tan(FOV*Math.PI/360);
    }
    fit();

    var s = Math.max(vh/AH, vw/AW);
    for (var i=0;i<N;i++){
      var o = (i % Math.floor(SA.length/3)) * 3;
      var u = SA[o], v = SA[o+1], l = SA[o+2];
      pos[i*3]   = (u-0.5)*AW*s + (Math.random()-0.5)*2;
      pos[i*3+1] = -(v-0.5)*AH*s + (Math.random()-0.5)*2;
      pos[i*3+2] = (Math.random()-0.5)*70;
      if (nB > 0){
        var ob = (i % nB) * 3;
        posB[i*3]   = (SB[ob]-0.5)*AW*s + (Math.random()-0.5)*2;
        posB[i*3+1] = -(SB[ob+1]-0.5)*AH*s + (Math.random()-0.5)*2;
        posB[i*3+2] = (Math.random()-0.5)*70;
      }
      aRnd[i] = Math.random();
      aSz[i] = (l > 0.72 ? 3.4 : 2.5) * (0.7 + Math.random()*0.7);
      var wm = 0.55 + l*0.45;
      aCol[i*3] = 1.0;
      aCol[i*3+1] = 0.60 + wm*0.24;
      aCol[i*3+2] = 0.22 + wm*0.30;
    }

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setSize(W, H);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    renderer.setClearColor(0x000000, 0);

    var camera = new THREE.PerspectiveCamera(FOV, W/H, 10, 12000);
    camera.position.set(0,0,camDist);
    var scene = new THREE.Scene();

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(aRnd,1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSz,1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aCol,3));
    geo.setAttribute('aPosB',  new THREE.BufferAttribute(posB,3));

    var uniform = {
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(99999,99999) },
      uBurst:  { value: 0 },
      uGather: { value: 0 },
      uMorph:  { value: 0 },
      uDpr:    { value: Math.min(window.devicePixelRatio||1, 2) },
      uPpu:    { value: H/vh },
      uDist:   { value: camDist }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniform,
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);

    var composer = null;
    if (opt.bloom !== false && window.THREE.EffectComposer){
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W,H), 1.25, 0.60, 0.08));
      } catch(e){ composer = null; }
    }

    var mx = 99999, my = 99999, burst = 0;

    var api = {
      canvas: canvas,
      get size(){ return { w: W, h: H }; },

      resize: function(w, h){
        W = w; H = h;
        fit();
        camera.aspect = W/H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
        if (composer) composer.setSize(W, H);
        uniform.uPpu.value = H/vh;
        uniform.uDist.value = camDist;
      },

      setMorph: function(k){ uniform.uMorph.value = k; },
      zoom: function(k){
        if (points) points.scale.setScalar(k);
      },
      setMouse: function(nx, ny){
        mx = (nx - 0.5) * vw;
        my = -(ny - 0.5) * vh;
      },
      clearMouse: function(){ mx = 99999; my = 99999; },
      burst: function(){ burst = 2.2; },

      frame: function(u, t, gather){
        burst = Math.max(0, burst - 0.006);
        uniform.uTime.value = t;
        uniform.uBurst.value = burst;
        uniform.uGather.value = (gather === undefined) ? Math.min(1, u/0.22) : gather;
        uniform.uMouse.value.set(mx, my);

        camera.position.x = Math.sin(t*0.17) * vw * 0.055;
        camera.position.y = Math.cos(t*0.13) * vh * 0.045;
        camera.position.z = camDist + Math.sin(t*0.09) * 95;
        camera.lookAt(Math.sin(t*0.11)*26, Math.cos(t*0.07)*16, 0);
        camera.rotation.z += Math.sin(t*0.06) * 0.008;

        if (composer) composer.render();
        else renderer.render(scene, camera);
      },

      dispose: function(){
        if (geo) geo.dispose();
        if (mat) mat.dispose();
        if (renderer) renderer.dispose();
      }
    };
    return api;
  }

  return { init: init };
})();

