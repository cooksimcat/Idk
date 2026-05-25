/* ============================================================
   VIRTUAL PET APP — app.js
   ============================================================ */

'use strict';

// ══════════════════════════════════════════════════════════════
//  상수
// ══════════════════════════════════════════════════════════════
const STORAGE_KEY  = 'petAppData_v3';
const BOX_W        = 380;
const BOX_H        = 280;
const AVATAR_W     = 80;
const AVATAR_H     = 80;
const FLOOR_Y      = 30;   // 바닥에서 아바타 하단까지 픽셀
const GRAVITY      = 0.55;

// 이미지 타입 목록
const IMG_TYPES = ['normal','cry','angry','happy','eating','sleeping','food'];

// ══════════════════════════════════════════════════════════════
//  상태
// ══════════════════════════════════════════════════════════════
let petData = {
  name: '',
  images: {           // base64 문자열
    normal: null, cry: null, angry: null, happy: null,
    eating: null, sleeping: null, food: null
  },
  stats: { hunger: 80, sleep: 70, love: 85, clean: 75 },
  firstSetupDone: false
};

// 세션 중 팝업에서 편집 중인 이미지 (아직 적용 안 된 것)
let sessionImgs = {};

// 현재 표정 ('normal' | 'cry' | 'angry' | 'happy' | 'eating')
let currentExpression = 'normal';

// 액션 잠금 (애니메이션 중 버튼 중복 방지)
let actionLocked = false;

// ── 아바타 DOM ──
let avatarWrap = null;
let avatarImgEl = null;

// ── 물리 / 이동 ──
let petX    = 100;
let petY    = FLOOR_Y;
let petVX   = 0.7;
let petVY   = 0;
let isFalling = false;
let isDragging = false;

// ── 타이머 ──
let petRunTimer    = 0;
let petWobbleTimer = 0;
let petJumpTimer   = 0;
let animRAF        = null;

// ── 더블탭 ──
let lastTapTime = 0;
let tapCount    = 0;

// ── 크롭 ──
let cropperInstance  = null;
let currentCropType  = null;

// ══════════════════════════════════════════════════════════════
//  DOM 참조
// ══════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const elPetBox        = $('petBox');
const elPetNameLabel  = $('petNameLabel');
const elNoAvatarMsg   = $('noAvatarMsg');
const elSettingsPopup = $('settingsPopup');
const elNameInput     = $('nameInput');
const elOpenSettings  = $('openSettingsBtn');
const elCloseSettings = $('closeSettingsBtn');
const elApplyBtn      = $('applyBtn');
const elCropperOverlay = $('cropperOverlay');
const elCropperImg    = $('cropperImg');
const elStatTooltip   = $('statTooltip');

// 스탯 바
const statBarEls = {
  hunger: $('barHunger'),
  sleep:  $('barSleep'),
  love:   $('barLove'),
  clean:  $('barClean'),
};
const statLabels = { hunger:'식욕', sleep:'수면', love:'애정', clean:'청결' };

// 액션 버튼
const btnSleep  = $('btnSleep');
const btnEat    = $('btnEat');
const btnShower = $('btnShower');

// 수면 오버레이
const elSleepOverlay  = $('sleepOverlay');
const elSleepAvatar   = $('sleepAvatarImg');

// 씻기 씬
const elShowerScene  = $('showerScene');
const elShowerImg    = $('showerImg');
const elCurtainImg   = $('curtainImg');
const elSparkleImg   = $('sparkleImg');

// ══════════════════════════════════════════════════════════════
//  저장 / 불러오기
// ══════════════════════════════════════════════════════════════
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(petData)); } catch(e) {
    console.warn('저장 실패 (용량 초과 가능성):', e);
  }
}
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      petData = { ...petData, ...parsed,
        images: { ...petData.images, ...parsed.images },
        stats:  { ...petData.stats,  ...parsed.stats  }
      };
    }
  } catch(e) { console.warn('불러오기 실패:', e); }
}

// ══════════════════════════════════════════════════════════════
//  초기화
// ══════════════════════════════════════════════════════════════
function init() {
  loadData();
  applyStatBars();
  applyNameLabel();

  if (petData.images.normal) {
    spawnAvatar();
  }

  // 최초 1회 팝업
  if (!petData.firstSetupDone) {
    openSettings(true);
  }

  bindEvents();
  startStatDecay();
}

// ══════════════════════════════════════════════════════════════
//  이벤트 바인딩
// ══════════════════════════════════════════════════════════════
function bindEvents() {
  // 설정 팝업
  elOpenSettings.addEventListener('click', () => openSettings(false));
  elCloseSettings.addEventListener('click', closeSettings);
  elApplyBtn.addEventListener('click', applySettings);

  // 파일 슬롯
  IMG_TYPES.forEach(type => {
    const slotEl  = $('slot' + capitalize(type));
    const fileEl  = $('file' + capitalize(type));
    if (!slotEl || !fileEl) return;

    slotEl.addEventListener('click', () => fileEl.click());
    fileEl.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => openCropper(type, ev.target.result);
      reader.readAsDataURL(file);
      fileEl.value = '';
    });
  });

  // 크롭 도구
  $('cropRotateLeft') .addEventListener('click', () => cropperInstance?.rotate(-90));
  $('cropRotateRight').addEventListener('click', () => cropperInstance?.rotate(90));
  $('cropFlipH')      .addEventListener('click', () => {
    if (!cropperInstance) return;
    const d = cropperInstance.getData();
    cropperInstance.scaleX(d.scaleX === -1 ? 1 : -1);
  });
  $('cropZoomIn') .addEventListener('click', () => cropperInstance?.zoom(0.1));
  $('cropZoomOut').addEventListener('click', () => cropperInstance?.zoom(-0.1));
  $('cropCancel') .addEventListener('click', cancelCrop);
  $('cropConfirm').addEventListener('click', confirmCrop);

  // 스탯 클릭 (직접 수치 올리기)
  document.querySelectorAll('.stat-item').forEach(item => {
    item.addEventListener('click', () => {
      const stat = item.dataset.stat;
      petData.stats[stat] = Math.min(100, petData.stats[stat] + 20);
      applyStatBars();
      updateExpression();
      saveData();
      showTooltip(item, `${statLabels[stat]} +20`);
    });
  });

  // 액션 버튼
  btnSleep .addEventListener('click', doSleep);
  btnEat   .addEventListener('click', doEat);
  btnShower.addEventListener('click', doShower);
}

// ══════════════════════════════════════════════════════════════
//  설정 팝업
// ══════════════════════════════════════════════════════════════
function openSettings(isFirst) {
  sessionImgs = { ...petData.images };
  elNameInput.value = petData.name || '';
  refreshSettingsPreviews();
  elSettingsPopup.classList.remove('hidden');
  elCloseSettings.style.display = isFirst ? 'none' : '';
}
function closeSettings() {
  elSettingsPopup.classList.add('hidden');
}
function applySettings() {
  const name = elNameInput.value.trim();
  if (!name) {
    elNameInput.focus();
    elNameInput.style.borderColor = '#e05252';
    return;
  }
  elNameInput.style.borderColor = '';
  petData.name   = name;
  petData.images = { ...petData.images, ...sessionImgs };
  petData.firstSetupDone = true;
  saveData();
  applyNameLabel();
  spawnAvatar();
  closeSettings();
}

function refreshSettingsPreviews() {
  IMG_TYPES.forEach(type => {
    const src      = sessionImgs[type] || petData.images[type];
    const previewEl = $('preview' + capitalize(type));
    const slotEl   = $('slot'    + capitalize(type));
    if (!previewEl || !slotEl) return;
    if (src) {
      previewEl.src = src;
      previewEl.classList.add('loaded');
      slotEl.classList.add('has-img');
    } else {
      previewEl.src = '';
      previewEl.classList.remove('loaded');
      slotEl.classList.remove('has-img');
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  크롭
// ══════════════════════════════════════════════════════════════
function openCropper(type, src) {
  currentCropType = type;
  elCropperImg.src = src;
  elCropperOverlay.classList.remove('hidden');

  if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
  elCropperImg.onload = () => {
    cropperInstance = new Cropper(elCropperImg, {
      aspectRatio: NaN,
      viewMode: 1,
      autoCropArea: 0.85,
      background: false,
      responsive: true,
    });
  };
}
function cancelCrop() {
  elCropperOverlay.classList.add('hidden');
  cropperInstance?.destroy(); cropperInstance = null;
  currentCropType = null;
}
function confirmCrop() {
  if (!cropperInstance || !currentCropType) return;
  const canvas = cropperInstance.getCroppedCanvas({
    fillColor: 'transparent',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });
  const b64 = canvas.toDataURL('image/png');
  sessionImgs[currentCropType] = b64;

  const previewEl = $('preview' + capitalize(currentCropType));
  const slotEl    = $('slot'    + capitalize(currentCropType));
  if (previewEl) { previewEl.src = b64; previewEl.classList.add('loaded'); }
  if (slotEl)    { slotEl.classList.add('has-img'); }

  cropperInstance.destroy(); cropperInstance = null;
  elCropperOverlay.classList.add('hidden');
  currentCropType = null;
}

// ══════════════════════════════════════════════════════════════
//  스탯
// ══════════════════════════════════════════════════════════════
function applyStatBars() {
  Object.keys(statBarEls).forEach(key => {
    const val = petData.stats[key];
    const bar = statBarEls[key];
    bar.style.width = val + '%';
    bar.className   = 'stat-bar-fill ' + (val < 30 ? 'low' : val < 60 ? 'mid' : 'high');
  });
}

function getMinStat() {
  return Math.min(...Object.values(petData.stats));
}

function updateExpression() {
  if (currentExpression === 'eating') return; // 먹는 중엔 유지
  const min = getMinStat();
  let target = 'normal';
  if      (min < 15) target = 'angry';
  else if (min < 30) target = 'cry';
  else if (min > 75) target = 'happy';

  if (target !== currentExpression) {
    currentExpression = target;
    refreshAvatarImg();
    elPetBox.classList.remove('sad-glow','angry-glow');
    if (target === 'cry')   elPetBox.classList.add('sad-glow');
    if (target === 'angry') elPetBox.classList.add('angry-glow');
  }
}

function startStatDecay() {
  setInterval(() => {
    if (!petData.images.normal) return;
    petData.stats.hunger = Math.max(0, petData.stats.hunger - 0.5);
    petData.stats.sleep  = Math.max(0, petData.stats.sleep  - 0.3);
    petData.stats.love   = Math.max(0, petData.stats.love   - 0.4);
    petData.stats.clean  = Math.max(0, petData.stats.clean  - 0.35);
    applyStatBars();
    updateExpression();
    saveData();
  }, 3000);
}

// ══════════════════════════════════════════════════════════════
//  아바타 스폰 & 이미지
// ══════════════════════════════════════════════════════════════
function spawnAvatar() {
  if (!petData.images.normal) return;
  if (avatarWrap) avatarWrap.remove();

  elNoAvatarMsg.style.display = 'none';

  avatarWrap  = document.createElement('div');
  avatarWrap.className = 'avatar-wrap';
  avatarImgEl = document.createElement('img');
  avatarImgEl.className = 'avatar-img';
  avatarImgEl.draggable = false;
  avatarWrap.appendChild(avatarImgEl);
  elPetBox.appendChild(avatarWrap);

  petX = 100; petY = FLOOR_Y; petVX = 0.7; petVY = 0; isFalling = false;

  refreshAvatarImg();
  startAnimLoop();
  setupAvatarInteractions();
  updateExpression();
}

function refreshAvatarImg() {
  if (!avatarImgEl) return;
  const src = petData.images[currentExpression] || petData.images.normal;
  if (src) avatarImgEl.src = src;
}

// ══════════════════════════════════════════════════════════════
//  애니메이션 루프
// ══════════════════════════════════════════════════════════════
function startAnimLoop() {
  if (animRAF) cancelAnimationFrame(animRAF);
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastTime) / 16, 3);
    lastTime = now;

    if (!isDragging && !actionLocked) {
      if (isFalling) {
        petVY -= GRAVITY * dt;
        petY  += petVY * dt;
        if (petY <= FLOOR_Y) {
          petY = FLOOR_Y; petVY = 0; isFalling = false;
          petData.stats.clean = Math.max(0, petData.stats.clean - 3);
          applyStatBars();
          triggerWobble();
        }
      } else {
        petX += petVX * dt;

        if (petX > BOX_W - AVATAR_W - 8) { petX = BOX_W - AVATAR_W - 8; petVX = -Math.abs(petVX); avatarWrap.classList.add('flipped'); }
        if (petX < 8)                     { petX = 8;                    petVX =  Math.abs(petVX); avatarWrap.classList.remove('flipped'); }

        petRunTimer -= dt;
        if (petRunTimer <= 0) {
          petVX = (petVX > 0 ? 1 : -1) * (Math.random() < 0.3 ? 2.2 : 0.7);
          petRunTimer = 60 + Math.random() * 120;
        }
        petWobbleTimer -= dt;
        if (petWobbleTimer <= 0) { triggerWobble(); petWobbleTimer = 90 + Math.random() * 150; }
        petJumpTimer -= dt;
        if (petJumpTimer <= 0)   { triggerJump();   petJumpTimer   = 120 + Math.random() * 200; }
      }
    }

    if (avatarWrap) {
      avatarWrap.style.left   = petX + 'px';
      avatarWrap.style.bottom = petY + 'px';
    }
    animRAF = requestAnimationFrame(loop);
  }
  animRAF = requestAnimationFrame(loop);
}

function triggerWobble() {
  if (!avatarWrap) return;
  avatarWrap.classList.remove('wobble');
  void avatarWrap.offsetWidth;
  avatarWrap.classList.add('wobble');
  setTimeout(() => avatarWrap?.classList.remove('wobble'), 400);
}
function triggerJump() {
  if (!avatarWrap || isFalling || actionLocked) return;
  avatarWrap.classList.add('jump');
  setTimeout(() => avatarWrap?.classList.remove('jump'), 400);
}

// ══════════════════════════════════════════════════════════════
//  아바타 인터랙션 (더블탭, 드래그)
// ══════════════════════════════════════════════════════════════
function setupAvatarInteractions() {
  // 더블클릭 쓰다듬기
  avatarWrap.addEventListener('click', e => {
    if (isDragging || actionLocked) return;
    const now = Date.now();
    if (now - lastTapTime < 350) {
      tapCount++;
      if (tapCount >= 2) { tapCount = 0; onPet(); }
    } else { tapCount = 1; }
    lastTapTime = now;
  });

  // 드래그 던지기
  let dragActive = false;
  let lastDragX = 0, lastDragY = 0;
  let dragVX = 0, dragVY = 0;

  function getPos(e) {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  }
  function onDown(e) {
    if (actionLocked) return;
    e.preventDefault();
    isDragging = true; dragActive = true;
    isFalling = false; petVY = 0;
    const p = getPos(e);
    lastDragX = p.x; lastDragY = p.y; dragVX = 0; dragVY = 0;
  }
  function onMove(e) {
    if (!dragActive) return;
    e.preventDefault();
    const p   = getPos(e);
    const rect = elPetBox.getBoundingClientRect();
    dragVX = p.x - lastDragX;
    dragVY = p.y - lastDragY;
    lastDragX = p.x; lastDragY = p.y;
    const relX = p.x - rect.left - AVATAR_W / 2;
    const relY = rect.bottom - p.y - AVATAR_H / 2;
    petX = Math.max(0, Math.min(BOX_W - AVATAR_W, relX));
    petY = Math.max(0, Math.min(BOX_H - AVATAR_H, relY));
  }
  function onUp() {
    if (!dragActive) return;
    dragActive = false; isDragging = false;
    if (dragVY < -3) {
      isFalling = true;
      petVY  = Math.abs(dragVY) * 1.5;
      petVX  = dragVX * 0.4 || petVX;
    }
  }

  avatarWrap.addEventListener('mousedown',  onDown);
  avatarWrap.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove',  onMove);
  document.addEventListener('touchmove',  onMove, { passive: false });
  document.addEventListener('mouseup',    onUp);
  document.addEventListener('touchend',   onUp);
}

function onPet() {
  const heart = document.createElement('div');
  heart.className = 'heart-pop';
  heart.textContent = '💗';
  avatarWrap.appendChild(heart);
  setTimeout(() => heart.remove(), 700);

  const prev = currentExpression;
  if (prev === 'normal') {
    currentExpression = 'happy';
    refreshAvatarImg();
    setTimeout(() => { currentExpression = prev; refreshAvatarImg(); }, 1500);
  }
  petData.stats.love = Math.min(100, petData.stats.love + 8);
  applyStatBars(); updateExpression(); saveData();
}

// ══════════════════════════════════════════════════════════════
//  액션: 재우기
// ══════════════════════════════════════════════════════════════
async function doSleep() {
  if (actionLocked || !avatarWrap) return;
  lockActions();

  // 수면 이미지 세팅
  const sleepSrc = petData.images.sleeping || petData.images.normal;
  elSleepAvatar.src = sleepSrc || '';

  // 별 생성
  const stars = document.createElement('div');
  stars.className = 'sleep-stars';
  const starEmojis = ['⭐','✨','🌟','💫'];
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'sleep-star';
    s.textContent = starEmojis[i % starEmojis.length];
    s.style.cssText = `left:${10+Math.random()*80}%; top:${10+Math.random()*70}%; --dur:${1.5+Math.random()}s; --delay:${Math.random()*1.5}s`;
    stars.appendChild(s);
  }
  elSleepOverlay.appendChild(stars);

  // 오버레이 표시
  elSleepOverlay.classList.remove('hidden');
  requestAnimationFrame(() => elSleepOverlay.classList.add('visible'));

  // 3초 대기
  await sleep(3000);

  // 페이드 아웃
  elSleepOverlay.classList.remove('visible');
  await sleep(650);
  elSleepOverlay.classList.add('hidden');
  stars.remove();

  // 스탯 회복
  petData.stats.sleep = Math.min(100, petData.stats.sleep + 40);
  applyStatBars(); updateExpression(); saveData();
  unlockActions();
}

// ══════════════════════════════════════════════════════════════
//  액션: 먹이기
// ══════════════════════════════════════════════════════════════
async function doEat() {
  if (actionLocked || !avatarWrap) return;
  if (!petData.images.food) {
    showTooltip(btnEat, '음식 이미지를 먼저 설정해주세요!');
    return;
  }
  lockActions();

  // 음식 생성 (박스 상단 중앙)
  const foodEl = document.createElement('img');
  foodEl.className = 'food-item';
  foodEl.src = petData.images.food;
  const startX = BOX_W / 2 - 25;
  foodEl.style.left   = startX + 'px';
  foodEl.style.top    = '0px';
  elPetBox.appendChild(foodEl);

  // 음식 낙하 (물리)
  let foodY    = 0;
  let foodVY   = 0;
  let hit      = false;
  const foodGrav = 0.4;

  await new Promise(resolve => {
    function fall() {
      foodVY += foodGrav;
      foodY  += foodVY;
      foodEl.style.top = foodY + 'px';

      // 충돌 판정: 음식 위치 vs 아바타 위치
      const foodBottom = foodY + 50;
      const petTop     = BOX_H - petY - AVATAR_H;  // top 기준

      const foodL = startX, foodR = startX + 50;
      const petL  = petX,   petR  = petX + AVATAR_W;

      const overlapX = foodR > petL && foodL < petR;
      const overlapY = foodBottom >= petTop && foodY < petTop + AVATAR_H;

      if (overlapX && overlapY && !hit) {
        hit = true;
        foodEl.style.opacity = '0';
        foodEl.style.transition = 'opacity 0.3s';
        setTimeout(() => { foodEl.remove(); resolve(); }, 300);
        return;
      }

      // 박스 바닥 도달
      if (foodY + 50 >= BOX_H) {
        foodEl.remove();
        resolve();
        return;
      }
      requestAnimationFrame(fall);
    }
    requestAnimationFrame(fall);
  });

  if (hit) {
    // 먹는 표정
    const prev = currentExpression;
    currentExpression = 'eating';
    refreshAvatarImg();
    await sleep(1500);
    currentExpression = prev;
    refreshAvatarImg();

    petData.stats.hunger = Math.min(100, petData.stats.hunger + 35);
    applyStatBars(); updateExpression(); saveData();
  }

  unlockActions();
}

// ══════════════════════════════════════════════════════════════
//  액션: 씻기기
// ══════════════════════════════════════════════════════════════
async function doShower() {
  if (actionLocked || !avatarWrap) return;
  lockActions();

  // 1. 아바타를 왼쪽 끝으로 이동 (애니메이션)
  const targetX = 20;
  avatarWrap.style.transition = 'left 0.8s ease-in-out';
  avatarWrap.style.left = targetX + 'px';
  petX = targetX;
  avatarWrap.classList.remove('flipped');

  await sleep(850);
  avatarWrap.style.transition = '';

  // 2. 샤워 씬 표시
  elShowerScene.classList.add('visible');
  elCurtainImg.src = 'assets/ui/curtain-open.png';
  elSparkleImg.classList.add('hidden');

  await sleep(600);

  // 3. 아바타 커튼 안으로 (왼쪽 더 이동 - 샤워 씬 뒤로)
  avatarWrap.style.transition = 'left 0.5s ease-in';
  petX = 8;
  avatarWrap.style.left = petX + 'px';
  // z-index 낮춰서 커튼 뒤로
  avatarWrap.style.zIndex = '7';

  await sleep(500);
  avatarWrap.style.transition = '';

  // 4. 커튼 닫기
  elCurtainImg.style.transition = 'opacity 0.4s';
  elCurtainImg.src = 'assets/ui/curtain-closed.png';

  await sleep(500);

  // 5. 반짝 효과
  elSparkleImg.classList.remove('hidden');
  await sleep(1500);
  elSparkleImg.classList.add('hidden');

  // 6. 커튼 열기
  elCurtainImg.src = 'assets/ui/curtain-open.png';
  await sleep(400);

  // 7. 아바타 원위치
  avatarWrap.style.zIndex = '5';
  avatarWrap.style.transition = 'left 0.8s ease-out';
  petX = 100;
  avatarWrap.style.left = petX + 'px';

  await sleep(850);
  avatarWrap.style.transition = '';

  // 8. 씻기 씬 숨기기
  elShowerScene.classList.remove('visible');
  elCurtainImg.style.transition = '';

  // 스탯 회복
  petData.stats.clean = Math.min(100, petData.stats.clean + 40);
  applyStatBars(); updateExpression(); saveData();
  unlockActions();
}

// ══════════════════════════════════════════════════════════════
//  유틸
// ══════════════════════════════════════════════════════════════
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function lockActions() {
  actionLocked = true;
  [btnSleep, btnEat, btnShower].forEach(b => b.disabled = true);
}
function unlockActions() {
  actionLocked = false;
  [btnSleep, btnEat, btnShower].forEach(b => b.disabled = false);
}

function applyNameLabel() {
  if (petData.name) {
    elPetNameLabel.textContent = petData.name;
    elPetNameLabel.classList.remove('empty');
  } else {
    elPetNameLabel.textContent = '이름 없음';
    elPetNameLabel.classList.add('empty');
  }
}

function showTooltip(el, text) {
  const rect = el.getBoundingClientRect();
  elStatTooltip.textContent = text;
  elStatTooltip.style.left  = rect.left + 'px';
  elStatTooltip.style.top   = (rect.bottom + 6) + 'px';
  elStatTooltip.classList.add('show');
  setTimeout(() => elStatTooltip.classList.remove('show'), 1500);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ══════════════════════════════════════════════════════════════
//  시작
// ══════════════════════════════════════════════════════════════
init();