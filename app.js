var BRAND = '#0F4B47';

var STEPS = [
  { n:'01', nav:'Enter cell', img:'assets/scene-cell.png', frame:{transform:'scale(1.04)',backgroundPosition:'center 46%',filter:'saturate(.92) brightness(.82)'},
    eyebrow:'BOOT', tag:'CELL 7B', title:'Entering training cell',
    body:'A new operator steps into the calibrated tracking volume. No menus, no points. Just the workstation and the part.',
    rows:[{k:'OPERATOR',v:'Onboarding'},{k:'CELL',v:'7B · Bearing line'},{k:'TRACKING',v:'6DoF locked'}],
    status:'TRACKING · 6DoF LOCKED', pins:[], boot:true },
  { n:'02', nav:'Module appears', img:'assets/scene-cell.png', frame:{transform:'scale(1.22)',backgroundPosition:'42% 48%',filter:'saturate(1) brightness(.92)'},
    eyebrow:'MODULE 04', tag:'BOM #BH-4471', title:'Bearing housing assembly',
    body:'The exploded assembly lifts above the bench. The system recognises the module and loads its work instruction from your BOM.',
    rows:[{k:'PARTS',v:'7 identified'},{k:'SOURCE',v:'BOM #BH-4471'},{k:'EST. TIME',v:'9 min'}],
    status:'MODULE RECOGNISED',
    pins:[{x:33,y:38,label:'BEARING HOUSING',sub:'CAST IRON · 18.4 kg'},{x:58,y:30,label:'DRIVE GEAR',sub:'42T · HARDENED'},{x:72,y:64,label:'BEARING RING',sub:'SKF 6209'}] },
  { n:'03', nav:'Tool + sequence', img:'assets/scene-torque.png', frame:{transform:'scale(1.12)',backgroundPosition:'46% 40%',filter:'saturate(1) brightness(.9)'},
    eyebrow:'STEP 04 / 07', tag:'GUIDED', title:'Align bearing ring',
    body:'Only the correct tool is highlighted. The platform marks the bolt sequence in a star pattern. The worker follows, hands free of clutter.',
    rows:[{k:'TOOL',v:'Bearing puller'},{k:'SEQUENCE',v:'3 bolts · star'},{k:'TOLERANCE',v:'±0.05 mm'}],
    status:'GUIDANCE ACTIVE',
    pins:[{x:46,y:52,label:'BEARING PULLER',sub:'USE THIS TOOL'},{x:74,y:50,label:'ALIGN HERE',sub:'BORE Ø45'}] },
  { n:'04', nav:'Torque feedback', img:'assets/scene-torque.png', frame:{transform:'scale(1.55)',backgroundPosition:'54% 58%',filter:'saturate(1.02) brightness(.86)'},
    eyebrow:'STEP 04 / 07', tag:'LIVE', title:'Torque to spec',
    body:'The operator tightens with a torque wrench. The instrument verifies applied torque, alignment and sequence in real time.',
    rows:[{k:'TARGET',v:'42 Nm'},{k:'PATTERN',v:'Cross · 1-2-3'},{k:'ALIGNMENT',v:'In tolerance'}],
    status:'VERIFYING TORQUE', hasTorque:true,
    pins:[{x:52,y:56,label:'TORQUE POINT',sub:'M12 · 42 Nm'}] },
  { n:'05', nav:'Skill verified', img:'assets/scene-cell.png', frame:{transform:'scale(1.06)',backgroundPosition:'48% 46%',filter:'saturate(1.04) brightness(.92)'},
    eyebrow:'RESULT', tag:'VERIFIED', title:'Assembly skill verified',
    body:'Sequence, torque and alignment all pass. The platform finds one skill gap and personalises the next lesson around it.',
    rows:[{k:'SEQUENCE',v:'Verified'},{k:'TORQUE',v:'Within 2%'},{k:'SKILL GAP',v:'Torque sequencing'}],
    status:'NEXT LESSON PERSONALISED', verified:true,
    pins:[{x:50,y:44,label:'ASSEMBLY COMPLETE',sub:'12 / 12 CHECKS'}] }
];

var curStep = 1;
var torqueRaf = null;
var autoTimer = null;
var autoDelay = 3000;
var paused = false;
var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function el(id) { return document.getElementById(id); }

// Rebuilt once per step change — never during the torque animation.
function renderStep() {
  var s = STEPS[curStep - 1];

  var scene = el('seq-scene');
  var base = s.img.replace(/\.png$/, '');
  // Fallback first (browsers without image-set), then modern AVIF/WebP.
  scene.style.backgroundImage = "url('" + s.img + "')";
  scene.style.backgroundImage = "image-set("
    + "url('" + base + ".avif') type('image/avif'),"
    + "url('" + base + ".webp') type('image/webp'),"
    + "url('" + s.img + "') type('image/png'))";
  scene.style.transform = s.frame.transform;
  scene.style.backgroundPosition = s.frame.backgroundPosition;
  scene.style.filter = s.frame.filter;

  el('boot-overlay').style.display = s.boot ? 'block' : 'none';
  el('verified-glow').style.display = s.verified ? 'block' : 'none';

  el('card-eyebrow').textContent = s.eyebrow;
  el('card-tag').textContent = s.tag;
  el('card-title').textContent = s.title;
  el('card-body').textContent = s.body;
  el('card-rows').innerHTML = s.rows.map(function(r) {
    return '<div class="card-row"><span class="card-row-k">' + r.k + '</span><span class="card-row-v">' + r.v + '</span></div>';
  }).join('');
  el('card-status-text').textContent = s.status;

  el('seq-pins').innerHTML = s.pins.map(function(p) {
    return '<div style="position:absolute;left:' + p.x + '%;top:' + p.y + '%;animation:vtSweep .5s ease both;pointer-events:none">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="width:10px;height:10px;border-radius:50%;background:' + BRAND + ';box-shadow:0 0 10px rgba(15,75,71,.6);flex:0 0 auto;animation:vtPulse 2.4s infinite"></span>'
      + '<div style="height:1px;width:40px;background:linear-gradient(90deg,' + BRAND + ',rgba(15,75,71,0))"></div></div>'
      + '<div style="margin-top:7px;margin-left:17px;padding:6px 10px;background:rgba(255,255,255,.9);backdrop-filter:blur(6px);border:1px solid rgba(15,75,71,.25);border-left:2px solid ' + BRAND + ';color:' + BRAND + '">'
      + '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.16em">' + p.label + '</div>'
      + '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#999;margin-top:2px">' + p.sub + '</div>'
      + '</div></div>';
  }).join('');

  el('torque-gauge').style.display = s.hasTorque ? 'block' : 'none';
  if (s.hasTorque) { renderTorque(0); }

  renderSelector();
}

// Cheap per-frame update during the torque animation.
function renderTorque(torque) {
  torque = torque || 0;
  var within = torque >= 41 && torque <= 43;
  el('torque-val').textContent = torque.toFixed(1);
  el('torque-state').textContent = within ? 'WITHIN SPEC' : 'APPROACHING';
  el('torque-fill').style.width = Math.min(100, (torque / 60) * 100) + '%';
}

function renderSelector() {
  el('step-selector').innerHTML = STEPS.map(function(st, i) {
    var n = i + 1;
    var active = n === curStep;
    return '<button type="button" class="step-box" data-step="' + n + '"'
      + (active ? ' aria-current="step"' : '')
      + ' aria-label="Step ' + n + ': ' + st.nav + '">'
      + '<span class="step-n">' + st.n + '</span>'
      + '<div class="step-label">' + st.nav + '</div>'
      + '</button>';
  }).join('');
}

function runTorque() {
  var start = performance.now();
  var dur = 1700;
  function tick(now) {
    var t = Math.min(1, (now - start) / dur);
    var ease = 1 - Math.pow(1 - t, 3);
    var v = ease * 44.5;
    if (t > 0.78) { var k = (t - 0.78) / 0.22; v = 44.5 - k * 2.4; }
    renderTorque(v);
    if (t < 1) { torqueRaf = requestAnimationFrame(tick); }
  }
  torqueRaf = requestAnimationFrame(tick);
}

function startAuto() {
  clearTimeout(autoTimer);
  if (paused || reduceMotion) { return; }
  autoTimer = setTimeout(function() {
    goStep(curStep < STEPS.length ? curStep + 1 : 1);
  }, autoDelay);
}

function goStep(n) {
  n = Math.max(1, Math.min(STEPS.length, n));
  curStep = n;
  if (torqueRaf) { cancelAnimationFrame(torqueRaf); torqueRaf = null; }
  renderStep();
  if (STEPS[n - 1].hasTorque) {
    if (reduceMotion) { renderTorque(42); } else { runTorque(); }
  }
  startAuto();
}

function setPaused(p) {
  paused = p;
  var btn = el('btn-autoplay');
  if (btn) {
    btn.textContent = p ? 'Resume auto-advance' : 'Pause auto-advance';
    btn.setAttribute('aria-pressed', p ? 'true' : 'false');
  }
  var ind = el('pause-indicator');
  if (ind) { ind.style.display = (p && !reduceMotion) ? 'flex' : 'none'; }
  if (p) { clearTimeout(autoTimer); } else { startAuto(); }
}

renderStep();
// Under reduced-motion, the sequence stays paused until the user drives it.
setPaused(reduceMotion);

el('btn-prev').addEventListener('click', function() { goStep(curStep - 1); });
el('btn-next').addEventListener('click', function() { goStep(curStep + 1); });
el('btn-autoplay').addEventListener('click', function() { setPaused(!paused); });
var stageEl = document.querySelector('.stage');
if (stageEl) { stageEl.addEventListener('click', function() { setPaused(!paused); }); }
el('step-selector').addEventListener('click', function(e) {
  var b = e.target.closest('[data-step]');
  if (b) { goStep(parseInt(b.getAttribute('data-step'), 10)); }
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight') goStep(curStep + 1);
  if (e.key === 'ArrowLeft') goStep(curStep - 1);
});

if (!reduceMotion) {
  var heroPins = Array.prototype.slice.call(document.querySelectorAll('#vt-mid .vt-pin'));
  function clearPins() {
    heroPins.forEach(function(p) {
      p.classList.remove('is-active');
      p.style.setProperty('--px', '0px');
      p.style.setProperty('--py', '0px');
    });
  }
  window.addEventListener('mousemove', function(e) {
    var bg = el('vt-bg');
    var mid = el('vt-mid');
    var cx = e.clientX / window.innerWidth - 0.5;
    var cy = e.clientY / window.innerHeight - 0.5;
    bg.style.transform = 'scale(1.08) translate(' + (cx * -26) + 'px,' + (cy * -16) + 'px)';
    mid.style.transform = 'translate(' + (cx * 38) + 'px,' + (cy * 24) + 'px)';

    // Nearest pin lights up + is gently pulled toward the cursor.
    var nearest = -1, nd = 1e9, off = [];
    for (var i = 0; i < heroPins.length; i++) {
      var r = heroPins[i].getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      off[i] = { dx: dx, dy: dy };
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < nd) { nd = d; nearest = i; }
    }
    for (var j = 0; j < heroPins.length; j++) {
      var active = (j === nearest && nd < 320);
      heroPins[j].classList.toggle('is-active', active);
      var nx = active ? Math.max(-8, Math.min(8, off[j].dx * 0.05)) : 0;
      var ny = active ? Math.max(-8, Math.min(8, off[j].dy * 0.05)) : 0;
      heroPins[j].style.setProperty('--px', nx + 'px');
      heroPins[j].style.setProperty('--py', ny + 'px');
    }
  }, { passive: true });
  var heroEl = document.querySelector('.hero');
  if (heroEl) { heroEl.addEventListener('mouseleave', clearPins, { passive: true }); }
}
