const guessStoreKey = "genderRevealGuesses";
const chatStoreKey = "genderRevealChats";
const configStoreKey = "genderRevealConfig";
const ktvStoreKey = "genderRevealKtvInside";
const ferrisStoreKey = "genderRevealFerrisState";
const ferrisRideMs = 20_000;
const catFerrisRideMs = 10_000;
const catFerrisCooldownMs = 12_000;
const ferrisCapacity = 6;
const ferrisWheelScale = 0.78;
const ferrisControllerLeaseMs = 6000;
const blessingText = "柏亨媽媽生日快樂";
const defaultFirebaseRoomId = normalizeRoomId(window.__PARTY_ROOM_ID__) || "party-room-1";
const localClientId = createClientId();
const stalePlayerMs = 120_000;
const chatRetentionMs = 12 * 60 * 60 * 1000;
const maxRemoteChats = 120;
const stallStatusDefs = [
  { selector: ".food-pizza", action: "吃", item: "披薩" },
  { selector: ".food-cake", action: "吃", item: "蛋糕" },
  { selector: ".food-fried", action: "吃", item: "炸物" },
  { selector: ".drink-boba", action: "喝", item: "珍珠奶茶" },
  { selector: ".drink-coffee", action: "喝", item: "咖啡" },
  { selector: ".drink-herbal", action: "喝", item: "青草茶" },
  { selector: ".blessing-stall", action: "送", item: "生日祝福" },
];

function detectDesktopMode() {
  return window.matchMedia("(pointer:fine) and (hover:hover)").matches;
}

// 主辦碼可在這裡修改。
const HOST_PASSCODE = "party2026";

const state = {
  playerName: "",
  revealAt: null,
  answer: "",
  config: loadConfig(),
  guesses: loadJson(guessStoreKey),
  chats: loadJson(chatStoreKey),
  ktvInside: loadJson(ktvStoreKey),
  ferris: loadFerrisState(),
  ferrisAngle: 0,
  ferrisGeom: {
    hall: { centerX: 17.5, centerY: 73.5, rx: 8.3, ry: 8.3 },
    local: { centerX: 50, centerY: 50, rx: 39, ry: 39 },
  },
  player: { x: 48, y: 58 },
  walkAnim: {
    dir: "down",
    moving: false,
    seqIndex: 0,
    seq: [0, 1, 0, 2],
    tick: 0,
  },
  cats: {
    baqi: {
      x: 18,
      y: 62,
      vx: 0.06,
      vy: 0.04,
      bobPhase: 0,
      mode: "stroll",
      modeUntil: 0,
      renderOffsetY: 0,
      el: null,
      name: "巴奇",
      ferrisCooldownUntil: 0,
    },
    dubi: {
      x: 72,
      y: 44,
      vx: -0.05,
      vy: 0.045,
      bobPhase: 1.6,
      mode: "stroll",
      modeUntil: 0,
      renderOffsetY: 0,
      el: null,
      name: "嘟比",
      ferrisCooldownUntil: 0,
    },
  },
  desktop: detectDesktopMode(),
  moving: { up: false, down: false, left: false, right: false },
  mobileDrag: {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  },
  dialogCat: null,
  dialogSource: "",
  catAskCooldownUntil: 0,
  inBlessingStall: false,
  inKtvZone: false,
  inFerrisRide: false,
  ferrisPromptCooldownUntil: 0,
  blessingCards: [],
  blessingFxNextAt: 0,
  mobileChatUnread: 0,
  revealed: false,
  chatChannel: null,
  roomId: defaultFirebaseRoomId,
  remotePlayers: {},
  presence: {
    clientId: localClientId,
    playerRef: null,
    onDisconnectRef: null,
    lastSentAt: 0,
    lastSig: "",
  },
  ferrisControl: {
    isController: false,
    ref: null,
    remote: null,
    nextCheckAt: 0,
    inFlight: false,
  },
  maintenance: {
    nextAt: 0,
    running: false,
  },
  vibeFx: {
    ctx: null,
    particles: [],
    lastAt: 0,
    dpr: 1,
  },
  realtime: {
    enabled: false,
    roomRef: null,
    listeners: [],
  },
};

const el = {
  setupPanel: document.getElementById("setupPanel"),
  gamePanel: document.getElementById("gamePanel"),
  roomInput: document.getElementById("roomInput"),
  nameInput: document.getElementById("nameInput"),
  joinBtn: document.getElementById("joinBtn"),
  hostBtn: document.getElementById("hostBtn"),
  resetBtn: document.getElementById("resetBtn"),
  partyConfigTip: document.getElementById("partyConfigTip"),
  timeTip: document.getElementById("timeTip"),
  welcomeText: document.getElementById("welcomeText"),
  countdownText: document.getElementById("countdownText"),
  loungeCount: document.getElementById("loungeCount"),
  ferrisCount: document.getElementById("ferrisCount"),
  openMobileChatBtn: document.getElementById("openMobileChatBtn"),
  mobileChatBadge: document.getElementById("mobileChatBadge"),
  leaveBtn: document.getElementById("leaveBtn"),
  player: document.getElementById("player"),
  controlTip: document.getElementById("controlTip"),
  playerNameTag: document.getElementById("playerNameTag"),
  catBaqiTag: document.getElementById("catBaqiTag"),
  catDubiTag: document.getElementById("catDubiTag"),
  catBaqi: document.getElementById("catBaqi"),
  catDubi: document.getElementById("catDubi"),
  boyCount: document.getElementById("boyCount"),
  girlCount: document.getElementById("girlCount"),
  guessList: document.getElementById("guessList"),
  catDialog: document.getElementById("catDialog"),
  catName: document.getElementById("catName"),
  catLine: document.getElementById("catLine"),
  resultDialog: document.getElementById("resultDialog"),
  revealText: document.getElementById("revealText"),
  closeResult: document.getElementById("closeResult"),
  chatList: document.getElementById("chatList"),
  chatInput: document.getElementById("chatInput"),
  sendChatBtn: document.getElementById("sendChatBtn"),
  mobileChatDialog: document.getElementById("mobileChatDialog"),
  mobileChatCloseBtn: document.getElementById("mobileChatCloseBtn"),
  mobileChatList: document.getElementById("mobileChatList"),
  mobileChatInput: document.getElementById("mobileChatInput"),
  mobileSendChatBtn: document.getElementById("mobileSendChatBtn"),
  hostDialog: document.getElementById("hostDialog"),
  hostCodeInput: document.getElementById("hostCodeInput"),
  hostRoomInput: document.getElementById("hostRoomInput"),
  hostRevealInput: document.getElementById("hostRevealInput"),
  hostAnswerSelect: document.getElementById("hostAnswerSelect"),
  saveHostBtn: document.getElementById("saveHostBtn"),
  closeHostBtn: document.getElementById("closeHostBtn"),
  hostTip: document.getElementById("hostTip"),
  hall: document.getElementById("hall"),
  vibeFxCanvas: document.getElementById("vibeFxCanvas"),
  blessingTicker: document.getElementById("blessingTicker"),
  partyFxLayer: document.getElementById("partyFxLayer"),
  lodge: document.querySelector(".lodge"),
  ferrisRoot: document.querySelector(".ferris"),
  ferrisDialog: document.getElementById("ferrisDialog"),
  ferrisLine: document.getElementById("ferrisLine"),
  ferrisYesBtn: document.getElementById("ferrisYesBtn"),
  ferrisNoBtn: document.getElementById("ferrisNoBtn"),
  blessingDialog: document.getElementById("blessingDialog"),
  blessingLine: document.getElementById("blessingLine"),
  blessingSendBtn: document.getElementById("blessingSendBtn"),
  blessingCancelBtn: document.getElementById("blessingCancelBtn"),
  ferrisWheel: document.getElementById("ferrisWheel"),
  ferrisCabins: Array.from(document.querySelectorAll(".ferris-cabin")),
  stalls: stallStatusDefs.map((s) => ({ ...s, el: document.querySelector(s.selector) })),
};

state.cats.baqi.el = el.catBaqi;
state.cats.dubi.el = el.catDubi;
hydrateConfig();
init();

function init() {
  hydrateRoomInput();
  initVibeFx();
  updateBoard();
  renderChats();
  updatePartyConfigTip();
  updateLoungeCount();
  setupSync();

  el.joinBtn.addEventListener("click", onJoin);
  el.leaveBtn.addEventListener("click", onLeave);
  el.resetBtn.addEventListener("click", onResetGuesses);
  el.closeResult.addEventListener("click", () => el.resultDialog.close());
  el.sendChatBtn.addEventListener("click", () => sendChat("desktop"));
  el.mobileSendChatBtn?.addEventListener("click", () => sendChat("mobile"));
  el.openMobileChatBtn?.addEventListener("click", openMobileChat);
  el.openMobileChatBtn?.addEventListener("pointerup", openMobileChat);
  el.openMobileChatBtn?.addEventListener("touchend", openMobileChat, { passive: true });
  el.mobileChatCloseBtn?.addEventListener("click", (ev) => closeMobileChat(ev));
  el.mobileChatCloseBtn?.addEventListener("pointerup", (ev) => closeMobileChat(ev));
  el.mobileChatCloseBtn?.addEventListener("touchend", (ev) => closeMobileChat(ev), { passive: false });
  el.mobileChatDialog?.addEventListener("cancel", (ev) => {
    ev.preventDefault();
    closeMobileChat();
  });
  el.hostBtn.addEventListener("click", openHostDialog);
  el.saveHostBtn.addEventListener("click", saveHostConfig);
  el.closeHostBtn.addEventListener("click", () => el.hostDialog.close());
  el.ferrisYesBtn.addEventListener("click", onFerrisYes);
  el.ferrisNoBtn.addEventListener("click", onFerrisNo);
  el.blessingSendBtn.addEventListener("click", onBlessingSend);
  el.blessingCancelBtn.addEventListener("click", () => el.blessingDialog.close());

  el.chatInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") sendChat("desktop");
  });
  el.mobileChatInput?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") sendChat("mobile");
  });

  el.catDialog.querySelectorAll("button[data-guess]").forEach((button) => {
    button.addEventListener("click", () => {
      const guess = button.dataset.guess;
      if (guess !== "later") saveGuess(guess);
      el.catDialog.close();
      state.dialogCat = null;
      state.dialogSource = "";
    });
  });
  el.catDialog.addEventListener("close", () => {
    state.dialogCat = null;
    state.dialogSource = "";
  });

  el.catBaqi.addEventListener("click", () => openCatDialog(state.cats.baqi, "click"));
  el.catDubi.addEventListener("click", () => openCatDialog(state.cats.dubi, "click"));

  if (state.desktop) {
    el.controlTip.textContent = "電腦模式：方向鍵移動角色";
    window.addEventListener("keydown", onKeyChange(true));
    window.addEventListener("keyup", onKeyChange(false));
  } else {
    el.controlTip.textContent = "手機模式：拖曳方向移動，放開即停止";
    el.hall.addEventListener("pointerdown", onMobileDragStart);
    el.hall.addEventListener("pointermove", onMobileDragMove);
    el.hall.addEventListener("pointerup", onMobileDragEnd);
    el.hall.addEventListener("pointercancel", onMobileDragEnd);
    el.hall.addEventListener("pointerleave", onMobileDragEnd);
  }

  setInterval(updateCountdown, 1000);
  window.addEventListener("beforeunload", () => {
    if (!el.gamePanel.classList.contains("hidden") && state.playerName) {
      leaveKtvZone(state.playerName);
      leaveFerrisAndQueue(state.playerName);
    }
    releaseFerrisController();
    clearOwnPresence();
  });
  requestAnimationFrame(gameLoop);
  updateMobileChatBadge();
}

function setupSync() {
  clearRemotePlayers();
  if (setupFirebaseSync()) return;

  if (window.BroadcastChannel) {
    state.chatChannel = new BroadcastChannel("party-chat");
    state.chatChannel.onmessage = (event) => {
      if (event.data?.type === "chat-update") {
        const prevLen = state.chats.length;
        state.chats = loadJson(chatStoreKey);
        addUnreadFromRemote(prevLen, state.chats.length);
        renderChats();
      }
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key === chatStoreKey) {
      const prevLen = state.chats.length;
      state.chats = loadJson(chatStoreKey);
      addUnreadFromRemote(prevLen, state.chats.length);
      renderChats();
    }

    if (event.key === guessStoreKey) {
      state.guesses = loadJson(guessStoreKey);
      updateBoard();
    }

    if (event.key === configStoreKey) {
      state.config = loadConfig();
      hydrateConfig();
      updatePartyConfigTip();
      updateCountdown();
    }

    if (event.key === ktvStoreKey) {
      state.ktvInside = loadJson(ktvStoreKey);
      updateLoungeCount();
    }

    if (event.key === ferrisStoreKey) {
      state.ferris = loadFerrisState();
      updateFerrisCount();
    }
  });
}

function setupFirebaseSync() {
  const rawConfig = window.__FIREBASE_CONFIG__;
  const config =
    rawConfig && rawConfig.projectId
      ? {
          ...rawConfig,
          databaseURL:
            rawConfig.databaseURL ||
            `https://${rawConfig.projectId}-default-rtdb.firebaseio.com`,
        }
      : rawConfig;
  if (!config || !window.firebase?.database) return false;

  try {
    if (!window.firebase.apps?.length) {
      window.firebase.initializeApp(config);
    }
    const db = window.firebase.database();
    const roomId = normalizeRoomId(state.roomId) || "party-room-1";
    releaseFerrisController();
    clearRealtimeListeners();
    clearOwnPresence();
    clearRemotePlayers();
    const roomRef = db.ref(`rooms/${roomId}`);
    state.roomId = roomId;
    state.realtime.enabled = true;
    state.realtime.roomRef = roomRef;
    syncRoomQuery(roomId);

    const configRef = roomRef.child("config");
    configRef.on("value", (snap) => {
      state.config = snap.val() || null;
      hydrateConfig();
      updatePartyConfigTip();
      updateCountdown();
    });
    state.realtime.listeners.push(configRef);

    const guessesRef = roomRef.child("guesses");
    guessesRef.on("value", (snap) => {
      state.guesses = normalizeArray(snap.val());
      updateBoard();
    });
    state.realtime.listeners.push(guessesRef);

    const ktvRef = roomRef.child("ktvInside");
    ktvRef.on("value", (snap) => {
      state.ktvInside = normalizeArray(snap.val());
      updateLoungeCount();
    });
    state.realtime.listeners.push(ktvRef);

    const ferrisRef = roomRef.child("ferris");
    ferrisRef.on("value", (snap) => {
      state.ferris = normalizeFerrisState(snap.val());
      updateFerrisCount();
    });
    state.realtime.listeners.push(ferrisRef);

    const ferrisControlRef = roomRef.child("ferrisController");
    ferrisControlRef.on("value", (snap) => {
      state.ferrisControl.remote = snap.val() || null;
      state.ferrisControl.isController = isFerrisControllerLeaseActive();
    });
    state.realtime.listeners.push(ferrisControlRef);
    state.ferrisControl.ref = ferrisControlRef;
    state.ferrisControl.inFlight = false;
    state.ferrisControl.nextCheckAt = 0;

    const chatsRef = roomRef
      .child("chats")
      .orderByChild("createdAt")
      .limitToLast(80);
    chatsRef.on("value", (snap) => {
      const prevLen = state.chats.length;
      const raw = snap.val();
      const rows = normalizeArray(raw).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      state.chats = rows;
      addUnreadFromRemote(prevLen, state.chats.length);
      renderChats();
    });
    state.realtime.listeners.push(chatsRef);

    const playersRef = roomRef.child("players");
    playersRef.on("value", (snap) => {
      syncRemotePlayers(snap.val());
    });
    state.realtime.listeners.push(playersRef);

    state.presence.playerRef = playersRef.child(state.presence.clientId);
    try {
      state.presence.onDisconnectRef = state.presence.playerRef.onDisconnect();
      state.presence.onDisconnectRef.remove();
    } catch (err) {
      console.warn("onDisconnect setup failed, continue without it.", err);
    }
    state.presence.lastSentAt = 0;
    state.presence.lastSig = "";

    return true;
  } catch (err) {
    console.error("Firebase sync init failed, fallback to local mode.", err);
    state.realtime.enabled = false;
    state.realtime.roomRef = null;
    state.ferrisControl.ref = null;
    state.ferrisControl.remote = null;
    state.ferrisControl.isController = true;
    return false;
  }
}

function onJoin() {
  const roomId = normalizeRoomId(el.roomInput?.value);
  const name = el.nameInput.value.trim();

  if (!roomId) {
    el.timeTip.textContent = "請先輸入房間 ID。";
    return;
  }

  if (!name) {
    el.timeTip.textContent = "請先輸入名字。";
    return;
  }

  if (roomId !== state.roomId) {
    state.roomId = roomId;
    setupSync();
  }

  if (!state.revealAt || !state.answer) {
    el.timeTip.textContent = "主辦尚未設定揭曉時間與答案。";
    return;
  }

  state.playerName = name;
  leaveKtvZone(name);
  leaveFerrisAndQueue(name);
  state.inKtvZone = false;
  state.inBlessingStall = false;
  state.inFerrisRide = false;
  state.revealed = false;
  state.blessingCards = [];
  el.blessingTicker.innerHTML = "";
  el.timeTip.textContent = "";
  el.playerNameTag.textContent = name;
  el.playerNameTag.classList.remove("hidden");
  applyPlayerVariant(name);

  el.welcomeText.textContent = `${name}，歡迎來到派對廳`;
  el.setupPanel.classList.add("hidden");
  el.gamePanel.classList.remove("hidden");
  updateCountdown();
  updateKtvPresence();
  syncOwnPresence(true);

  postSystemChat(`${name} 進入了派對廳`);
}

function clearRealtimeListeners() {
  if (!state.realtime.listeners?.length) return;
  state.realtime.listeners.forEach((ref) => ref?.off?.());
  state.realtime.listeners = [];
}

function hydrateRoomInput() {
  if (!el.roomInput) return;
  el.roomInput.value = state.roomId;
}

function normalizeRoomId(value) {
  if (!value) return "";
  return String(value).trim().replace(/\s+/g, "-").slice(0, 40);
}

function syncRoomQuery(roomId) {
  if (!roomId || !window.history?.replaceState) return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("room", roomId);
  window.history.replaceState({}, "", nextUrl);
}

function onLeave() {
  if (state.playerName) {
    leaveKtvZone(state.playerName);
    leaveFerrisAndQueue(state.playerName);
    postSystemChat(`${state.playerName} 暫時離開了派對廳`);
  }
  releaseFerrisController();
  clearOwnPresence();
  state.inKtvZone = false;
  state.inBlessingStall = false;
  state.inFerrisRide = false;
  state.blessingCards = [];
  el.blessingTicker.innerHTML = "";
  if (el.blessingDialog.open) el.blessingDialog.close();
  el.playerNameTag.classList.add("hidden");
  el.gamePanel.classList.add("hidden");
  el.setupPanel.classList.remove("hidden");
}

function onResetGuesses() {
  clearSharedValue(guessStoreKey);
  state.guesses = [];
  updateBoard();
}

function openHostDialog() {
  el.hostTip.textContent = "";
  el.hostCodeInput.value = "";
  el.hostRoomInput.value = state.roomId;
  el.hostRevealInput.value = state.revealAt
    ? toLocalInputValue(state.revealAt)
    : toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));
  el.hostAnswerSelect.value = state.answer || "男生";
  el.hostDialog.showModal();
}

function saveHostConfig() {
  const code = el.hostCodeInput.value.trim();
  const roomId = normalizeRoomId(el.hostRoomInput.value);
  const revealStr = el.hostRevealInput.value;
  const answer = el.hostAnswerSelect.value;
  const revealAt = revealStr ? new Date(revealStr) : null;

  if (code !== HOST_PASSCODE) {
    el.hostTip.textContent = "主辦碼不正確。";
    return;
  }

  if (!revealAt || Number.isNaN(revealAt.getTime())) {
    el.hostTip.textContent = "請輸入有效的揭曉時間。";
    return;
  }

  if (!roomId) {
    el.hostTip.textContent = "請輸入房號。";
    return;
  }

  if (Date.now() >= revealAt.getTime()) {
    el.hostTip.textContent = "揭曉時間必須晚於現在。";
    return;
  }

  state.config = {
    revealAt: revealAt.toISOString(),
    answer,
    updatedAt: new Date().toISOString(),
  };

  if (roomId !== state.roomId) {
    state.roomId = roomId;
    setupSync();
  }
  hydrateRoomInput();

  setSharedValue(configStoreKey, state.config);
  hydrateConfig();
  updatePartyConfigTip();
  updateCountdown();
  state.revealed = false;

  el.hostTip.textContent = "已更新主辦設定。";
  el.hostDialog.close();
}

function hydrateConfig() {
  if (!state.config?.revealAt || !state.config?.answer) {
    state.revealAt = null;
    state.answer = "";
    return;
  }

  const revealAt = new Date(state.config.revealAt);
  if (Number.isNaN(revealAt.getTime())) {
    state.revealAt = null;
    state.answer = "";
    return;
  }

  state.revealAt = revealAt;
  state.answer = state.config.answer;
}

function updatePartyConfigTip() {
  if (!state.revealAt || !state.answer) {
    el.partyConfigTip.textContent = "目前尚未開放入場，請主辦先完成設定。";
    return;
  }

  el.partyConfigTip.textContent = `主辦設定：${state.revealAt.toLocaleString()} 揭曉`;
}

function onKeyChange(down) {
  return (ev) => {
    if (!state.desktop) return;
    if (ev.key === "ArrowUp") state.moving.up = down;
    if (ev.key === "ArrowDown") state.moving.down = down;
    if (ev.key === "ArrowLeft") state.moving.left = down;
    if (ev.key === "ArrowRight") state.moving.right = down;
  };
}

function onMobileDragStart(ev) {
  if (state.desktop) return;
  state.mobileDrag.active = true;
  state.mobileDrag.pointerId = ev.pointerId;
  state.mobileDrag.startX = ev.clientX;
  state.mobileDrag.startY = ev.clientY;
  clearMobileMoveState();
  el.hall.setPointerCapture?.(ev.pointerId);
}

function onMobileDragMove(ev) {
  if (state.desktop) return;
  if (!state.mobileDrag.active) return;
  if (state.mobileDrag.pointerId !== ev.pointerId) return;

  const dx = ev.clientX - state.mobileDrag.startX;
  const dy = ev.clientY - state.mobileDrag.startY;
  const threshold = 10;

  clearMobileMoveState();
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) state.moving.right = true;
    else state.moving.left = true;
  } else if (dy > 0) {
    state.moving.down = true;
  } else {
    state.moving.up = true;
  }
}

function onMobileDragEnd(ev) {
  if (state.desktop) return;
  if (!state.mobileDrag.active) return;
  if (state.mobileDrag.pointerId !== ev.pointerId) return;
  state.mobileDrag.active = false;
  state.mobileDrag.pointerId = null;
  clearMobileMoveState();
}

function clearMobileMoveState() {
  state.moving.up = false;
  state.moving.down = false;
  state.moving.left = false;
  state.moving.right = false;
}

function gameLoop() {
  if (!el.gamePanel.classList.contains("hidden")) {
    maybeMaintainFerrisController();
    updateFerrisSystem();
    movePlayer();
    moveCats();
    maybePromptBlessingStall();
    maybeSpawnBlessingFx();
    checkCatTouchAsk();
    renderVibeFx();
    renderAll();
    syncOwnPresence();
    maybeRunRoomMaintenance();
  }
  requestAnimationFrame(gameLoop);
}

function initVibeFx() {
  const canvas = el.vibeFxCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  state.vibeFx.ctx = ctx;
  seedVibeParticles();
  resizeVibeFxCanvas();
  window.addEventListener("resize", resizeVibeFxCanvas);
}

function seedVibeParticles() {
  const count = state.desktop ? 26 : 14;
  state.vibeFx.particles = Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.008,
    vy: (Math.random() - 0.5) * 0.008,
    r: 1.5 + Math.random() * 4.8,
    a: 0.12 + Math.random() * 0.28,
    hue: 40 + Math.random() * 170,
  }));
}

function resizeVibeFxCanvas() {
  const canvas = el.vibeFxCanvas;
  if (!canvas || !el.hall) return;
  const rect = el.hall.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.vibeFx.dpr = dpr;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

function renderVibeFx() {
  const { ctx, particles, dpr } = state.vibeFx;
  const canvas = el.vibeFxCanvas;
  if (!ctx || !canvas || !particles.length) return;
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;
  const now = Date.now();
  const last = state.vibeFx.lastAt || now;
  const dt = Math.min(40, now - last) / 16.67;
  state.vibeFx.lastAt = now;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const pulse = 0.5 + Math.sin(now * 0.0012) * 0.16;
  particles.forEach((p, i) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < -0.08) p.x = 1.08;
    if (p.x > 1.08) p.x = -0.08;
    if (p.y < -0.08) p.y = 1.08;
    if (p.y > 1.08) p.y = -0.08;

    const twinkle = 0.65 + Math.sin(now * 0.002 + i * 0.7) * 0.35;
    const radius = p.r * (0.85 + pulse * 0.3) * dpr;
    const x = p.x * w;
    const y = p.y * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `hsla(${p.hue}, 95%, 72%, ${p.a * twinkle})`);
    g.addColorStop(1, `hsla(${p.hue}, 95%, 72%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function movePlayer() {
  if (state.inFerrisRide) {
    updatePlayerWalkFrame(0, 0);
    return;
  }

  let dx = 0;
  let dy = 0;

  if (state.desktop) {
    const speed = 0.33;
    if (state.moving.up) dy -= speed;
    if (state.moving.down) dy += speed;
    if (state.moving.left) dx -= speed;
    if (state.moving.right) dx += speed;
  } else {
    const speed = 0.3;
    if (state.moving.up) dy -= speed;
    if (state.moving.down) dy += speed;
    if (state.moving.left) dx -= speed;
    if (state.moving.right) dx += speed;
  }

  state.player.x += dx;
  state.player.y += dy;

  state.player.x = clamp(state.player.x, 6, 90);
  state.player.y = clamp(state.player.y, 16, 84);
  updatePlayerWalkFrame(dx, dy);
}

function moveCats() {
  const t = Date.now() * 0.003;
  const now = Date.now();

  Object.values(state.cats).forEach((cat) => {
    const catRide = state.ferris.catRiders.find((r) => r.catName === cat.name);
    if (catRide) {
      const pos = getFerrisCabinPosition(catRide.cabinIndex);
      cat.x = pos.x;
      cat.y = pos.y;
      cat.renderOffsetY = 0;
      return;
    }

    updateCatBehavior(cat, now);

    const speedMul = cat.mode === "idle" ? 0 : cat.mode === "sprint" ? 2.35 : 1;
    cat.x += cat.vx * speedMul;
    cat.y += cat.vy * speedMul;

    if (cat.x < 7 || cat.x > 91) {
      cat.vx *= -1;
      cat.x = clamp(cat.x, 7, 91);
    }
    if (cat.y < 18 || cat.y > 86) {
      cat.vy *= -1;
      cat.y = clamp(cat.y, 18, 86);
    }

    const amp = cat.mode === "idle" ? 0.85 : 1.8;
    const freq = cat.mode === "idle" ? 0.65 : 1;
    cat.renderOffsetY = Math.sin(t * freq + cat.bobPhase) * amp;
  });
}

function renderAll() {
  updateKtvPresence();
  updateLoungeCount();
  updatePlayerNameTagText();
  el.player.style.left = `${state.player.x}%`;
  el.player.style.top = `${state.player.y}%`;
  const idleFloatY = state.walkAnim.moving || state.inFerrisRide ? 0 : Math.sin(Date.now() * 0.007) * 1.2;
  el.player.style.transform = `translateY(${idleFloatY}px)`;
  el.playerNameTag.style.left = `${state.player.x + 2.2}%`;
  el.playerNameTag.style.top = `${Math.max(8, state.player.y - 5)}%`;

  Object.values(state.cats).forEach((cat) => {
    cat.el.style.left = `${cat.x}%`;
    cat.el.style.top = `${cat.y}%`;
    cat.el.style.transform = `translateY(${cat.renderOffsetY || 0}px)`;
    cat.el.dataset.mode = cat.mode;
  });

  el.catBaqiTag.style.left = `${state.cats.baqi.x + 2}%`;
  el.catBaqiTag.style.top = `${Math.max(8, state.cats.baqi.y - 4)}%`;
  el.catDubiTag.style.left = `${state.cats.dubi.x + 2}%`;
  el.catDubiTag.style.top = `${Math.max(8, state.cats.dubi.y - 4)}%`;
  updateCatNameTags();

  renderFerris();
  renderRemotePlayers();
}

function updatePlayerNameTagText() {
  if (!state.playerName) return;
  const stall = getStallStatusAt(state.player.x + 1.6, state.player.y + 2.2);
  if (!stall) {
    el.playerNameTag.textContent = state.playerName;
    return;
  }
  if (stall.selector === ".blessing-stall") {
    el.playerNameTag.textContent = `${state.playerName} ㊗️ 柏亨媽媽生日快樂`;
    return;
  }
  el.playerNameTag.textContent = `${state.playerName}在${stall.action} ${stall.item}`;
}

function updateCatNameTags() {
  const baqiStall = getStallStatusAt(state.cats.baqi.x + 1.6, state.cats.baqi.y + 2.2, ["吃", "喝"]);
  const dubiStall = getStallStatusAt(state.cats.dubi.x + 1.6, state.cats.dubi.y + 2.2, ["吃", "喝"]);
  el.catBaqiTag.textContent = baqiStall ? `巴奇在偷${baqiStall.action} ${baqiStall.item}` : "巴奇";
  el.catDubiTag.textContent = dubiStall ? `嘟比在偷${dubiStall.action} ${dubiStall.item}` : "嘟比";
}

function getStallStatusAt(x, y, actionFilter = null) {
  const hallRect = el.hall?.getBoundingClientRect();
  if (!hallRect || hallRect.width === 0 || hallRect.height === 0) return null;

  const px = hallRect.left + (x / 100) * hallRect.width;
  const py = hallRect.top + (y / 100) * hallRect.height;

  for (const stall of el.stalls) {
    if (actionFilter && !actionFilter.includes(stall.action)) continue;
    const rect = stall.el?.getBoundingClientRect();
    if (!rect) continue;
    if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
      return stall;
    }
  }
  return null;
}

function maybePromptBlessingStall() {
  if (!state.playerName || state.revealed) return;
  const inStall = isPlayerInBlessingStall();
  if (!inStall) {
    state.inBlessingStall = false;
    return;
  }

  if (!state.inBlessingStall) {
    state.inBlessingStall = true;
    if (!state.inFerrisRide && !isAnyDialogOpen()) {
      openBlessingDialog();
    }
  }
}

function isPlayerInBlessingStall() {
  const stall = getStallStatusAt(state.player.x + 1.6, state.player.y + 2.2);
  return Boolean(stall && stall.selector === ".blessing-stall");
}

function openBlessingDialog() {
  el.blessingLine.textContent = `要發送祝福嗎？內容固定為「${blessingText}」。`;
  el.blessingDialog.showModal();
}

function onBlessingSend() {
  launchBlessingCard(blessingText);
  el.blessingDialog.close();
}

function launchBlessingCard(text) {
  if (!el.blessingTicker) return;
  const card = document.createElement("div");
  card.className = "blessing-card";
  card.textContent = text;
  card.style.top = `${4 + Math.random() * 12}%`;
  card.style.animationDelay = `${Math.random() * 0.35}s`;
  card.addEventListener("animationend", () => {
    card.remove();
  });
  el.blessingTicker.appendChild(card);
  state.blessingCards.push(Date.now());
  if (el.blessingTicker.children.length > 10) {
    el.blessingTicker.firstElementChild?.remove();
  }
}

function maybeSpawnBlessingFx() {
  const now = Date.now();
  if (!isSomeoneInBlessingStall()) {
    state.blessingFxNextAt = now + 500;
    return;
  }
  if (now < state.blessingFxNextAt) return;
  spawnPartyFx();
  state.blessingFxNextAt = now + randomInt(480, 1200);
}

function isSomeoneInBlessingStall() {
  const playerIn =
    Boolean(state.playerName) &&
    Boolean(getStallStatusAt(state.player.x + 1.6, state.player.y + 2.2)?.selector === ".blessing-stall");
  const baqiIn = getStallStatusAt(state.cats.baqi.x + 1.6, state.cats.baqi.y + 2.2)?.selector === ".blessing-stall";
  const dubiIn = getStallStatusAt(state.cats.dubi.x + 1.6, state.cats.dubi.y + 2.2)?.selector === ".blessing-stall";
  return playerIn || baqiIn || dubiIn;
}

function spawnPartyFx() {
  if (!el.partyFxLayer) return;
  const fx = document.createElement("div");
  fx.className = `party-fx ${Math.random() < 0.55 ? "firework" : "popper"}`;
  fx.style.left = `${6 + Math.random() * 88}%`;
  fx.style.top = `${12 + Math.random() * 72}%`;
  fx.addEventListener("animationend", () => fx.remove());
  el.partyFxLayer.appendChild(fx);
}

function isAnyDialogOpen() {
  return el.catDialog.open || el.ferrisDialog.open || el.hostDialog.open || el.resultDialog.open || el.blessingDialog.open;
}

function updatePlayerWalkFrame(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const moving = absX > 0.01 || absY > 0.01;
  const anim = state.walkAnim;

  anim.moving = moving;

  if (moving) {
    if (absX > absY) {
      anim.dir = dx > 0 ? "right" : "left";
    } else {
      anim.dir = dy > 0 ? "down" : "up";
    }

    anim.tick += 1;
    if (anim.tick >= 6) {
      anim.tick = 0;
      anim.seqIndex = (anim.seqIndex + 1) % anim.seq.length;
    }
  } else {
    anim.seqIndex = 0;
    anim.tick = 0;
  }

  const frame = anim.seq[anim.seqIndex];
  el.player.classList.remove(
    "dir-up",
    "dir-down",
    "dir-left",
    "dir-right",
    "walk-frame-0",
    "walk-frame-1",
    "walk-frame-2",
  );
  el.player.classList.add(`dir-${anim.dir}`, `walk-frame-${frame}`);
}

function checkCatTouchAsk() {
  if (el.gamePanel.classList.contains("hidden")) return;
  if (state.revealed) return;
  if (isAnyDialogOpen()) return;
  if (!state.playerName || !state.revealAt) return;
  if (hasAnsweredGuess(state.playerName)) return;
  if (Date.now() < state.catAskCooldownUntil) return;

  const touchedCat = Object.values(state.cats).find((cat) => isTouchingPlayer(cat));
  if (!touchedCat) return;

  state.catAskCooldownUntil = Date.now() + 2600;
  openCatDialog(touchedCat, "touch");
}

function openCatDialog(cat, source) {
  if (el.gamePanel.classList.contains("hidden")) return;
  if (state.revealed) return;
  if (!state.playerName || !state.revealAt) return;
  if (isAnyDialogOpen()) return;

  const msLeft = state.revealAt.getTime() - Date.now();
  if (msLeft <= 0) return;

  const answered = hasAnsweredGuess(state.playerName);
  if (source === "touch" && answered) return;

  state.dialogCat = cat;
  state.dialogSource = source;
  el.catName.textContent = cat.name;
  el.catLine.textContent = answered
    ? `${state.playerName}，要不要改一下你的猜測？`
    : `${state.playerName}，要不要猜猜是男生還是女生？`;
  el.catDialog.showModal();
}

function isTouchingPlayer(cat) {
  const dx = state.player.x - cat.x;
  const dy = state.player.y - cat.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < 4.6;
}

function updateCatBehavior(cat, now) {
  if (cat.modeUntil <= now) {
    const roll = Math.random();

    if (roll < 0.35) {
      cat.mode = "idle";
      cat.modeUntil = now + randomInt(900, 2400);
    } else if (roll < 0.85) {
      cat.mode = "stroll";
      cat.modeUntil = now + randomInt(1400, 3200);
    } else {
      cat.mode = "sprint";
      cat.modeUntil = now + randomInt(350, 900);
    }

    const turn = (Math.random() - 0.5) * 0.14;
    const nx = cat.vx * Math.cos(turn) - cat.vy * Math.sin(turn);
    const ny = cat.vx * Math.sin(turn) + cat.vy * Math.cos(turn);
    cat.vx = nx;
    cat.vy = ny;
  }

  if (cat.mode !== "idle" && Math.random() < 0.015) {
    const drift = (Math.random() - 0.5) * 0.08;
    const nx = cat.vx * Math.cos(drift) - cat.vy * Math.sin(drift);
    const ny = cat.vx * Math.sin(drift) + cat.vy * Math.cos(drift);
    cat.vx = nx;
    cat.vy = ny;
  }
}

function saveGuess(guess) {
  const label = guess === "boy" ? "男生" : "女生";
  const idx = state.guesses.findIndex((g) => g.name === state.playerName);
  const row = {
    name: state.playerName,
    guess,
    label,
    at: new Date().toLocaleString(),
  };

  if (idx >= 0) {
    state.guesses[idx] = row;
  } else {
    state.guesses.push(row);
  }

  setSharedValue(guessStoreKey, state.guesses);
  updateBoard();
}

function hasAnsweredGuess(name) {
  return state.guesses.some((guess) => guess.name === name);
}

function updateBoard() {
  const boys = state.guesses.filter((g) => g.guess === "boy").length;
  const girls = state.guesses.filter((g) => g.guess === "girl").length;

  el.boyCount.textContent = String(boys);
  el.girlCount.textContent = String(girls);

  el.guessList.innerHTML = "";
  if (!state.guesses.length) {
    const li = document.createElement("li");
    li.textContent = "目前還沒有人猜測。";
    el.guessList.appendChild(li);
    return;
  }

  [...state.guesses]
    .reverse()
    .forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name}：${item.label}（${item.at}）`;
      el.guessList.appendChild(li);
    });
}

function updateCountdown() {
  if (!state.revealAt || el.gamePanel.classList.contains("hidden")) return;

  const diff = state.revealAt.getTime() - Date.now();

  if (diff <= 0) {
    el.countdownText.textContent = `時間到，答案已揭曉，是${state.answer}！`;
    if (!state.revealed) {
      state.revealed = true;
      if (el.catDialog.open) el.catDialog.close();
      el.revealText.textContent = `公布答案：${state.answer}！感謝大家參加。`;
      el.resultDialog.showModal();
      postSystemChat(`答案揭曉：${state.answer}`);
    }
    return;
  }

  const hh = Math.floor(diff / 1000 / 60 / 60);
  const mm = Math.floor((diff / 1000 / 60) % 60);
  const ss = Math.floor((diff / 1000) % 60);
  el.countdownText.textContent = `距離揭曉還有 ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function sendChat(source = "desktop") {
  const inputEl = source === "mobile" ? el.mobileChatInput : el.chatInput;
  const text = inputEl?.value.trim() || "";
  if (!text) return;

  if (!state.playerName) {
    el.timeTip.textContent = "請先輸入名字並進入派對廳，再聊天。";
    return;
  }

  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: state.playerName,
    text,
    at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: Date.now(),
    system: false,
  };

  pushChat(msg);
  inputEl.value = "";
}

function postSystemChat(text) {
  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: "系統",
    text,
    at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: Date.now(),
    system: true,
  };
  pushChat(msg);
}

function pushChat(msg) {
  state.chats.push(msg);
  state.chats = state.chats.slice(-80);
  setSharedChat(msg);

  if (state.chatChannel) {
    state.chatChannel.postMessage({ type: "chat-update" });
  }

  const own = state.playerName && msg.name === state.playerName;
  if (!state.desktop && !own && !el.mobileChatDialog?.open) {
    state.mobileChatUnread += 1;
    updateMobileChatBadge();
  }

  renderChats();
}

function renderChats() {
  renderChatList(el.chatList);
  if (el.mobileChatList) renderChatList(el.mobileChatList);
}

function renderChatList(listEl) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!state.chats.length) {
    const row = document.createElement("div");
    row.className = "chat-item";
    row.textContent = "還沒有聊天訊息。";
    listEl.appendChild(row);
    return;
  }

  state.chats.forEach((msg) => {
    const row = document.createElement("div");
    const own = state.playerName && msg.name === state.playerName;
    row.className = `chat-item ${own ? "me" : ""}`.trim();

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    meta.textContent = `${msg.name} · ${msg.at}`;

    const text = document.createElement("div");
    text.textContent = msg.text;

    row.append(meta, text);
    listEl.appendChild(row);
  });

  listEl.scrollTop = listEl.scrollHeight;
}

function openMobileChat() {
  state.mobileChatUnread = 0;
  updateMobileChatBadge();
  renderChats();
  const d = el.mobileChatDialog;
  if (!d) return;
  d.setAttribute("open", "open");
  d.style.display = "flex";
  try {
    if (typeof d.showModal === "function" && !d.open) {
      d.showModal();
    }
  } catch {
    // Fallback for browsers with partial dialog support.
    d.setAttribute("open", "open");
    d.style.display = "flex";
  }
}

function closeMobileChat(ev) {
  ev?.preventDefault?.();
  ev?.stopPropagation?.();
  const d = el.mobileChatDialog;
  if (!d) return;
  try {
    if (typeof d.close === "function" && d.open) {
      d.close();
    }
  } catch {
    // ignore
  }
  d.removeAttribute("open");
  d.style.display = "";
}

function addUnreadFromRemote(prevLen, nextLen) {
  if (state.desktop) return;
  if (el.mobileChatDialog?.open) return;
  if (nextLen <= prevLen) return;
  state.mobileChatUnread += nextLen - prevLen;
  updateMobileChatBadge();
}

function updateMobileChatBadge() {
  if (!el.mobileChatBadge) return;
  const n = state.mobileChatUnread;
  if (n <= 0) {
    el.mobileChatBadge.classList.add("hidden");
    el.mobileChatBadge.textContent = "0";
    return;
  }
  el.mobileChatBadge.classList.remove("hidden");
  el.mobileChatBadge.textContent = n > 99 ? "99+" : String(n);
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.values(value);
}

function syncOwnPresence(force = false) {
  if (!state.realtime.enabled || !state.presence.playerRef || !state.playerName) return;
  if (el.gamePanel.classList.contains("hidden")) return;

  const variant = getPlayerVariant(state.playerName);
  const frame = state.walkAnim.seq[state.walkAnim.seqIndex] ?? 0;
  const payload = {
    id: state.presence.clientId,
    name: state.playerName,
    x: Number(state.player.x.toFixed(2)),
    y: Number(state.player.y.toFixed(2)),
    dir: state.walkAnim.dir,
    frame,
    moving: Boolean(state.walkAnim.moving),
    type: variant.type,
    head: variant.head,
    body: variant.body,
    updatedAt: Date.now(),
  };

  const now = Date.now();
  const sig = `${payload.name}|${payload.x}|${payload.y}|${payload.dir}|${payload.frame}|${payload.moving}|${payload.type}`;
  const changed = sig !== state.presence.lastSig;
  if (!force && !changed && now - state.presence.lastSentAt < 1800) return;
  if (!force && changed && now - state.presence.lastSentAt < 120) return;

  state.presence.lastSig = sig;
  state.presence.lastSentAt = now;
  state.presence.playerRef.set(payload);
}

function clearOwnPresence() {
  try {
    state.presence.playerRef?.remove?.();
  } catch {
    // ignore
  }
  state.presence.playerRef = null;
  state.presence.onDisconnectRef = null;
  state.presence.lastSig = "";
  state.presence.lastSentAt = 0;
}

function syncRemotePlayers(raw) {
  const now = Date.now();
  const incoming = raw && typeof raw === "object" ? raw : {};
  const keepIds = new Set();

  Object.entries(incoming).forEach(([id, row]) => {
    if (!row || typeof row !== "object") return;
    if (id === state.presence.clientId) return;
    if (!row.name) return;
    if (row.updatedAt && now - row.updatedAt > stalePlayerMs) return;

    keepIds.add(id);
    const exists = state.remotePlayers[id];
    const next = {
      id,
      name: String(row.name).slice(0, 20),
      x: clamp(Number(row.x) || 48, 6, 90),
      y: clamp(Number(row.y) || 58, 16, 84),
      dir: ["up", "down", "left", "right"].includes(row.dir) ? row.dir : "down",
      frame: [0, 1, 2].includes(Number(row.frame)) ? Number(row.frame) : 0,
      moving: Boolean(row.moving),
      type: [0, 1, 2].includes(Number(row.type)) ? Number(row.type) : getPlayerVariant(row.name).type,
      head: typeof row.head === "string" ? row.head : getPlayerVariant(row.name).head,
      body: typeof row.body === "string" ? row.body : getPlayerVariant(row.name).body,
      phase: exists?.phase ?? Math.abs(stringHash(id)) % 360,
      el: exists?.el || null,
      tagEl: exists?.tagEl || null,
    };
    if (!next.el || !next.tagEl) {
      const built = createRemoteAvatar(next);
      next.el = built.el;
      next.tagEl = built.tagEl;
    }
    state.remotePlayers[id] = next;
  });

  Object.keys(state.remotePlayers).forEach((id) => {
    if (keepIds.has(id)) return;
    removeRemoteAvatar(id);
  });
}

function createRemoteAvatar(player) {
  const avatar = document.createElement("div");
  avatar.className = "avatar player remote-player dir-down walk-frame-0";
  avatar.innerHTML =
    '<div class="sprite human"><span class="head"></span><span class="body"></span><span class="foot left"></span><span class="foot right"></span></div>';

  const tag = document.createElement("div");
  tag.className = "name-tag remote-name-tag";

  el.hall.appendChild(avatar);
  el.hall.appendChild(tag);
  applyVariantToAvatar(avatar, player);
  return { el: avatar, tagEl: tag };
}

function removeRemoteAvatar(id) {
  const player = state.remotePlayers[id];
  if (!player) return;
  player.el?.remove?.();
  player.tagEl?.remove?.();
  delete state.remotePlayers[id];
}

function clearRemotePlayers() {
  Object.keys(state.remotePlayers).forEach((id) => removeRemoteAvatar(id));
}

function maybeRunRoomMaintenance() {
  if (!state.realtime.enabled || !state.realtime.roomRef || !state.playerName) return;
  if (state.maintenance.running) return;
  const now = Date.now();
  if (now < state.maintenance.nextAt) return;
  state.maintenance.nextAt = now + 45_000;
  runRoomMaintenance();
}

async function runRoomMaintenance() {
  if (!state.realtime.roomRef) return;
  state.maintenance.running = true;
  try {
    await Promise.all([cleanupStaleRemotePlayers(), cleanupOldChats()]);
  } catch (err) {
    console.warn("Room maintenance failed.", err);
  } finally {
    state.maintenance.running = false;
  }
}

async function cleanupStaleRemotePlayers() {
  if (!state.realtime.roomRef) return;
  const snap = await state.realtime.roomRef.child("players").once("value");
  const rows = snap.val();
  if (!rows || typeof rows !== "object") return;
  const now = Date.now();
  const tasks = [];
  Object.entries(rows).forEach(([id, row]) => {
    if (id === state.presence.clientId) return;
    if (!row || typeof row !== "object") return;
    const updatedAt = Number(row.updatedAt) || 0;
    if (updatedAt <= 0 || now - updatedAt > stalePlayerMs) {
      tasks.push(state.realtime.roomRef.child(`players/${id}`).remove());
    }
  });
  if (tasks.length) await Promise.allSettled(tasks);
}

async function cleanupOldChats() {
  if (!state.realtime.roomRef) return;
  const snap = await state.realtime.roomRef.child("chats").once("value");
  const raw = snap.val();
  if (!raw || typeof raw !== "object") return;
  const entries = Object.entries(raw)
    .map(([id, row]) => ({ id, createdAt: Number(row?.createdAt) || 0 }))
    .sort((a, b) => a.createdAt - b.createdAt);
  if (!entries.length) return;

  const cutoff = Date.now() - chatRetentionMs;
  const removeIds = new Set(entries.filter((e) => e.createdAt > 0 && e.createdAt < cutoff).map((e) => e.id));
  const overflow = entries.length - maxRemoteChats;
  if (overflow > 0) {
    entries.slice(0, overflow).forEach((e) => removeIds.add(e.id));
  }
  if (!removeIds.size) return;

  const tasks = Array.from(removeIds).map((id) => state.realtime.roomRef.child(`chats/${id}`).remove());
  await Promise.allSettled(tasks);
}

function renderRemotePlayers() {
  const now = Date.now();
  Object.values(state.remotePlayers).forEach((p) => {
    if (!p.el || !p.tagEl) return;
    p.el.style.left = `${p.x}%`;
    p.el.style.top = `${p.y}%`;
    const floatY = p.moving ? 0 : Math.sin(now * 0.006 + p.phase) * 1.05;
    p.el.style.transform = `translateY(${floatY}px)`;

    p.el.classList.remove(
      "dir-up",
      "dir-down",
      "dir-left",
      "dir-right",
      "walk-frame-0",
      "walk-frame-1",
      "walk-frame-2",
    );
    p.el.classList.add(`dir-${p.dir}`, `walk-frame-${p.frame}`);
    applyVariantToAvatar(p.el, p);

    p.tagEl.style.left = `${p.x + 2.2}%`;
    p.tagEl.style.top = `${Math.max(8, p.y - 5)}%`;
    p.tagEl.textContent = formatPlayerStatusText(p.name, p.x, p.y);
  });
}

function formatPlayerStatusText(name, x, y) {
  const stall = getStallStatusAt(x + 1.6, y + 2.2);
  if (!stall) return name;
  if (stall.selector === ".blessing-stall") return `${name} ㊗️ 柏亨媽媽生日快樂`;
  return `${name}在${stall.action} ${stall.item}`;
}

function applyVariantToAvatar(avatarEl, variant) {
  if (!avatarEl || !variant) return;
  avatarEl.style.setProperty("--creature-head", variant.head);
  avatarEl.style.setProperty("--creature-body", variant.body);
  avatarEl.classList.remove("creature-type-0", "creature-type-1", "creature-type-2");
  avatarEl.classList.add(`creature-type-${variant.type}`);
}

function getRealtimePathByKey(key) {
  if (key === configStoreKey) return "config";
  if (key === guessStoreKey) return "guesses";
  if (key === ktvStoreKey) return "ktvInside";
  if (key === ferrisStoreKey) return "ferris";
  return null;
}

function setSharedValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (!state.realtime.enabled || !state.realtime.roomRef) return;
  const path = getRealtimePathByKey(key);
  if (!path) return;
  state.realtime.roomRef.child(path).set(value);
}

function clearSharedValue(key) {
  localStorage.removeItem(key);
  if (!state.realtime.enabled || !state.realtime.roomRef) return;
  const path = getRealtimePathByKey(key);
  if (!path) return;
  state.realtime.roomRef.child(path).set([]);
}

function setSharedChat(msg) {
  localStorage.setItem(chatStoreKey, JSON.stringify(state.chats));
  if (!state.realtime.enabled || !state.realtime.roomRef) return;
  state.realtime.roomRef.child("chats").push(msg);
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(configStoreKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function onFerrisYes() {
  if (!state.playerName) return;
  const inZone = isInsideFerrisZone(state.player.x, state.player.y);
  if (!inZone) {
    el.ferrisDialog.close();
    return;
  }

  enqueueOrBoardFerris(state.playerName);
  el.ferrisDialog.close();
}

function onFerrisNo() {
  state.ferrisPromptCooldownUntil = Date.now() + 6000;
  el.ferrisDialog.close();
}

function saveKtvInside() {
  setSharedValue(ktvStoreKey, state.ktvInside);
  updateLoungeCount();
}

function updateLoungeCount() {
  if (!el.loungeCount) return;
  const total = state.ktvInside.length + catsInKtvCount();
  el.loungeCount.textContent = `${total} 人`;
  el.lodge?.classList.toggle("party-on", total > 0);
}

function updateFerrisCount() {
  if (!el.ferrisCount) return;
  const occupied = state.ferris.riders.length + state.ferris.catRiders.length;
  el.ferrisCount.textContent = `${occupied}/${ferrisCapacity}`;
}

function updateKtvPresence() {
  if (!state.playerName || el.gamePanel.classList.contains("hidden")) return;

  const inZone = isInsideKtvZone(state.player.x, state.player.y);
  if (inZone && !state.inKtvZone) {
    enterKtvZone(state.playerName);
    state.inKtvZone = true;
  } else if (!inZone && state.inKtvZone) {
    leaveKtvZone(state.playerName);
    state.inKtvZone = false;
  }
}

function enterKtvZone(name) {
  const names = new Set(state.ktvInside.map((p) => p.name));
  if (!names.has(name)) {
    state.ktvInside.push({ name, at: new Date().toISOString() });
    saveKtvInside();
  }
}

function leaveKtvZone(name) {
  const next = state.ktvInside.filter((p) => p.name !== name);
  if (next.length !== state.ktvInside.length) {
    state.ktvInside = next;
    saveKtvInside();
  }
}

function isInsideKtvZone(x, y) {
  const left = 63;
  const right = 92;
  const top = 14;
  const bottom = 47;
  return x >= left && x <= right && y >= top && y <= bottom;
}

function updateFerrisSystem() {
  if (!state.playerName) {
    updateFerrisCount();
    return;
  }

  const now = Date.now();
  state.ferrisAngle = (state.ferrisAngle + 0.0032) % (Math.PI * 2);
  state.ferrisGeom = readFerrisGeometry();
  const isController = isFerrisSimulationController();

  if (!isController) {
    maybePromptFerrisRide();
    syncLocalFerrisRideState();
    updateFerrisCount();
    return;
  }

  let changed = false;
  const expiredNames = [];
  const ridersBefore = state.ferris.riders.length;
  state.ferris.riders = state.ferris.riders.filter((rider) => {
    const alive = now - rider.startAt < ferrisRideMs;
    if (!alive) expiredNames.push(rider.name);
    return alive;
  });
  if (state.ferris.riders.length !== ridersBefore) changed = true;

  const catBefore = state.ferris.catRiders.length;
  const expiredCatNames = [];
  state.ferris.catRiders = state.ferris.catRiders.filter((rider) => {
    const endAt = Number(rider.endAt) || (Number(rider.startAt) || 0) + catFerrisRideMs;
    const alive = now < endAt;
    if (!alive) expiredCatNames.push(rider.catName);
    return alive;
  });
  if (state.ferris.catRiders.length !== catBefore) changed = true;

  if (changed) {
    if (expiredNames.includes(state.playerName)) {
      state.inFerrisRide = false;
      state.player.x = 40;
      state.player.y = 78;
      state.moving.up = false;
      state.moving.down = false;
      state.moving.left = false;
      state.moving.right = false;
    }
    expiredCatNames.forEach((catName) => {
      const cat = Object.values(state.cats).find((c) => c.name === catName);
      if (!cat) return;
      state.ferris.catCooldownUntil = state.ferris.catCooldownUntil || {};
      const nextCooldownAt = now + catFerrisCooldownMs;
      state.ferris.catCooldownUntil[catName] = Math.max(
        Number(state.ferris.catCooldownUntil[catName]) || 0,
        nextCooldownAt,
      );
      cat.ferrisCooldownUntil = Math.max(Number(cat.ferrisCooldownUntil) || 0, nextCooldownAt);
      // Move cats just outside the Ferris zone so they don't instantly re-board.
      cat.x = 36 + Math.random() * 6;
      cat.y = 78 + Math.random() * 8;
    });
  }

  if (fillFerrisFromQueue(now)) changed = true;
  if (autoBoardCatsToFerris(now)) changed = true;
  if (changed) saveFerrisState();

  maybePromptFerrisRide();
  syncLocalFerrisRideState();
  updateFerrisCount();
}

function maybePromptFerrisRide() {
  if (isAnyDialogOpen()) return;
  if (state.inFerrisRide) return;
  if (Date.now() < state.ferrisPromptCooldownUntil) return;
  if (!isInsideFerrisZone(state.player.x, state.player.y)) return;
  if (isInFerrisQueue(state.playerName)) return;

  const alreadyRiding = state.ferris.riders.some((r) => r.name === state.playerName);
  if (alreadyRiding) return;

  const available = ferrisCapacity - (state.ferris.riders.length + state.ferris.catRiders.length);
  el.ferrisLine.textContent =
    available > 0
      ? `要搭乘摩天輪嗎？目前空位 ${available} 個。`
      : `摩天輪目前客滿，排隊中 ${state.ferris.queue.length} 人，要排隊嗎？`;
  el.ferrisDialog.showModal();
}

function fillFerrisFromQueue(now) {
  let changed = false;
  while (state.ferris.riders.length + state.ferris.catRiders.length < ferrisCapacity && state.ferris.queue.length > 0) {
    const next = state.ferris.queue.shift();
    const cabin = getFreeFerrisCabin();
    if (cabin < 0) break;
    state.ferris.riders.push({
      name: next.name,
      startAt: now,
      cabinIndex: cabin,
    });
    changed = true;
  }
  return changed;
}

function enqueueOrBoardFerris(name) {
  pruneExpiredFerrisOccupancy(Date.now());
  if (state.ferris.riders.some((r) => r.name === name)) return;
  if (isInFerrisQueue(name)) return;

  if (state.ferris.riders.length + state.ferris.catRiders.length < ferrisCapacity) {
    const cabin = getFreeFerrisCabin();
    if (cabin >= 0) {
      state.ferris.riders.push({
        name,
        startAt: Date.now(),
        cabinIndex: cabin,
      });
    }
  } else {
    state.ferris.queue.push({ name, at: Date.now() });
  }

  saveFerrisState();
}

function pruneExpiredFerrisOccupancy(now) {
  let changed = false;
  const nextRiders = state.ferris.riders.filter((r) => now - Number(r.startAt || 0) < ferrisRideMs);
  if (nextRiders.length !== state.ferris.riders.length) {
    state.ferris.riders = nextRiders;
    changed = true;
  }
  const nextCatRiders = state.ferris.catRiders.filter((r) => {
    const endAt = Number(r.endAt) || (Number(r.startAt) || 0) + catFerrisRideMs;
    return now < endAt;
  });
  if (nextCatRiders.length !== state.ferris.catRiders.length) {
    state.ferris.catRiders = nextCatRiders;
    changed = true;
  }
  if (changed) saveFerrisState();
}

function leaveFerrisAndQueue(name) {
  const nextRiders = state.ferris.riders.filter((r) => r.name !== name);
  const nextQueue = state.ferris.queue.filter((q) => q.name !== name);
  if (nextRiders.length !== state.ferris.riders.length || nextQueue.length !== state.ferris.queue.length) {
    state.ferris.riders = nextRiders;
    state.ferris.queue = nextQueue;
    fillFerrisFromQueue(Date.now());
    saveFerrisState();
  }
}

function isInsideFerrisZone(x, y) {
  const g = state.ferrisGeom?.hall;
  if (g && Number.isFinite(g.centerX) && Number.isFinite(g.centerY) && Number.isFinite(g.rx) && Number.isFinite(g.ry)) {
    const dx = x - g.centerX;
    const dy = y - g.centerY;
    const nx = dx / (g.rx * 1.35 || 1);
    const ny = dy / (g.ry * 1.35 || 1);
    return nx * nx + ny * ny <= 1;
  }
  const left = 2;
  const right = 38;
  const top = 52;
  const bottom = 96;
  return x >= left && x <= right && y >= top && y <= bottom;
}

function isInFerrisQueue(name) {
  return state.ferris.queue.some((q) => q.name === name);
}

function getFreeFerrisCabin() {
  const used = new Set([
    ...state.ferris.riders.map((r) => r.cabinIndex),
    ...state.ferris.catRiders.map((r) => r.cabinIndex),
  ]);
  for (let i = 0; i < ferrisCapacity; i += 1) {
    if (!used.has(i)) return i;
  }
  return -1;
}

function syncLocalFerrisRideState() {
  const rider = state.ferris.riders.find((r) => r.name === state.playerName);
  state.inFerrisRide = Boolean(rider);
  if (!rider) return;

  const pos = getFerrisCabinPosition(rider.cabinIndex);
  state.player.x = pos.x;
  state.player.y = pos.y;
}

function renderFerris() {
  if (!el.ferrisCabins.length) return;
  if (el.ferrisWheel) {
    el.ferrisWheel.style.transform = `translate(-50%, -50%) rotate(${state.ferrisAngle}rad)`;
  }
  el.ferrisCabins.forEach((cabinEl, idx) => {
    const pos = getFerrisCabinPosition(idx, "local");
    cabinEl.style.left = `${pos.x}%`;
    cabinEl.style.top = `${pos.y}%`;
    const occupied =
      state.ferris.riders.some((r) => r.cabinIndex === idx) ||
      state.ferris.catRiders.some((r) => r.cabinIndex === idx);
    cabinEl.classList.toggle("occupied", occupied);
  });
}

function getFerrisCabinPosition(index, space = "hall") {
  const geom = space === "local" ? state.ferrisGeom.local : state.ferrisGeom.hall;
  const { centerX, centerY, rx, ry } = geom;
  const angle = state.ferrisAngle + (Math.PI * 2 * index) / ferrisCapacity;
  return {
    x: centerX + Math.cos(angle) * rx,
    y: centerY + Math.sin(angle) * ry,
  };
}

function readFerrisGeometry() {
  const hallRect = el.hall?.getBoundingClientRect();
  const ferrisRect = el.ferrisRoot?.getBoundingClientRect();
  if (
    !hallRect ||
    !ferrisRect ||
    hallRect.width === 0 ||
    hallRect.height === 0 ||
    ferrisRect.width === 0 ||
    ferrisRect.height === 0
  ) {
    return state.ferrisGeom;
  }

  // Use ferris container geometry + fixed wheel scale so cabin radius stays stable.
  const wheelCenterX = ferrisRect.left + ferrisRect.width * 0.5;
  const wheelCenterY = ferrisRect.top + ferrisRect.height * 0.5;
  const radiusPx = Math.min(ferrisRect.width, ferrisRect.height) * (ferrisWheelScale * 0.5);
  return {
    hall: {
      centerX: ((wheelCenterX - hallRect.left) / hallRect.width) * 100,
      centerY: ((wheelCenterY - hallRect.top) / hallRect.height) * 100,
      rx: (radiusPx / hallRect.width) * 100,
      ry: (radiusPx / hallRect.height) * 100,
    },
    local: {
      centerX: ((wheelCenterX - ferrisRect.left) / ferrisRect.width) * 100,
      centerY: ((wheelCenterY - ferrisRect.top) / ferrisRect.height) * 100,
      rx: (radiusPx / ferrisRect.width) * 100,
      ry: (radiusPx / ferrisRect.height) * 100,
    },
  };
}

function saveFerrisState() {
  state.ferris = normalizeFerrisState(state.ferris);
  setSharedValue(ferrisStoreKey, state.ferris);
  updateFerrisCount();
}

function loadFerrisState() {
  const raw = loadJson(ferrisStoreKey);
  return normalizeFerrisState(raw);
}

function normalizeFerrisState(raw) {
  if (!raw || typeof raw !== "object") {
    return { riders: [], queue: [], catRiders: [], catCooldownUntil: {} };
  }
  const riders = Array.isArray(raw.riders)
    ? raw.riders
        .filter((r) => r && typeof r === "object" && typeof r.name === "string")
        .map((r) => ({
          name: r.name.slice(0, 20),
          startAt: Number.isFinite(Number(r.startAt)) ? Number(r.startAt) : 0,
          cabinIndex: clamp(Math.floor(Number(r.cabinIndex) || 0), 0, ferrisCapacity - 1),
        }))
    : [];
  const queue = Array.isArray(raw.queue)
    ? raw.queue
        .filter((q) => q && typeof q === "object" && typeof q.name === "string")
        .map((q) => ({
          name: q.name.slice(0, 20),
          at: Number(q.at) || Date.now(),
        }))
    : [];
  const catRiders = Array.isArray(raw.catRiders)
    ? raw.catRiders
        .filter((r) => r && typeof r === "object" && typeof r.catName === "string")
        .map((r) => ({
          catName: r.catName,
          startAt: Number.isFinite(Number(r.startAt)) ? Number(r.startAt) : 0,
          endAt: Number.isFinite(Number(r.endAt))
            ? Number(r.endAt)
            : (Number.isFinite(Number(r.startAt)) ? Number(r.startAt) : 0) + catFerrisRideMs,
          cabinIndex: clamp(Math.floor(Number(r.cabinIndex) || 0), 0, ferrisCapacity - 1),
        }))
    : [];
  const catCooldownUntil =
    raw.catCooldownUntil && typeof raw.catCooldownUntil === "object"
      ? Object.fromEntries(
          Object.entries(raw.catCooldownUntil)
            .filter(([name]) => typeof name === "string")
            .map(([name, ts]) => [name, Number(ts) || 0]),
        )
      : {};
  const dedupCatMap = new Map();
  catRiders.forEach((r) => {
    const prev = dedupCatMap.get(r.catName);
    if (!prev) {
      dedupCatMap.set(r.catName, r);
      return;
    }
    // Keep the one that expires later, avoid stale duplicate flipping.
    dedupCatMap.set(r.catName, (Number(r.endAt) || 0) >= (Number(prev.endAt) || 0) ? r : prev);
  });
  const dedupCatRiders = Array.from(dedupCatMap.values());
  return { riders, queue, catRiders: dedupCatRiders, catCooldownUntil };
}

function isFerrisSimulationController() {
  if (!state.realtime.enabled) return true;
  const lease = state.ferrisControl.remote;
  const now = Date.now();
  const hasActiveLease = Boolean(lease && Number(lease.until) > now && lease.ownerId);
  if (hasActiveLease) return lease.ownerId === state.presence.clientId;
  if (!state.playerName || el.gamePanel.classList.contains("hidden")) return false;
  const ids = [state.presence.clientId, ...Object.keys(state.remotePlayers)].sort();
  return ids[0] === state.presence.clientId;
}

function maybeMaintainFerrisController() {
  if (!state.realtime.enabled || !state.realtime.roomRef) {
    state.ferrisControl.isController = true;
    return;
  }
  if (!state.playerName || el.gamePanel.classList.contains("hidden")) {
    state.ferrisControl.isController = false;
    return;
  }

  const now = Date.now();
  if (state.ferrisControl.inFlight) return;
  if (now < state.ferrisControl.nextCheckAt) return;

  const ref = state.ferrisControl.ref;
  if (!ref) return;
  state.ferrisControl.nextCheckAt = now + 1500;
  state.ferrisControl.inFlight = true;

  ref.transaction(
    (current) => {
      const t = Date.now();
      const ownerId = current?.ownerId || "";
      const until = Number(current?.until) || 0;
      const expired = until < t;
      if (!ownerId || expired || ownerId === state.presence.clientId) {
        return {
          ownerId: state.presence.clientId,
          until: t + ferrisControllerLeaseMs,
          updatedAt: t,
        };
      }
      return;
    },
    (err, committed, snap) => {
      state.ferrisControl.inFlight = false;
      if (err) {
        state.ferrisControl.isController = false;
        return;
      }
      const lease = snap?.val?.() || state.ferrisControl.remote;
      state.ferrisControl.remote = lease;
      if (committed) {
        state.ferrisControl.isController = true;
        return;
      }
      state.ferrisControl.isController = isFerrisControllerLeaseActive();
    },
    false,
  );
}

function isFerrisControllerLeaseActive() {
  if (!state.realtime.enabled) return true;
  const lease = state.ferrisControl.remote;
  if (!lease || typeof lease !== "object") return false;
  return lease.ownerId === state.presence.clientId && Number(lease.until) > Date.now();
}

function releaseFerrisController() {
  if (!state.realtime.enabled || !state.ferrisControl.ref) return;
  state.ferrisControl.ref.transaction((current) => {
    if (current && current.ownerId === state.presence.clientId) return null;
    return;
  });
  state.ferrisControl.isController = false;
}

function autoBoardCatsToFerris(now) {
  let changed = false;
  Object.values(state.cats).forEach((cat) => {
    const alreadyRiding = state.ferris.catRiders.some((r) => r.catName === cat.name);
    if (alreadyRiding) return;
    const sharedCooldownUntil = Number(state.ferris.catCooldownUntil?.[cat.name]) || 0;
    const localCooldownUntil = Number(cat.ferrisCooldownUntil) || 0;
    if (now < Math.max(sharedCooldownUntil, localCooldownUntil)) return;
    if (!isInsideFerrisZone(cat.x, cat.y)) return;
    if (state.ferris.riders.length + state.ferris.catRiders.length >= ferrisCapacity) return;
    const cabin = getFreeFerrisCabin();
    if (cabin < 0) return;
    const endAt = now + catFerrisRideMs;
    const cooldownUntil = endAt + catFerrisCooldownMs;
    state.ferris.catCooldownUntil = state.ferris.catCooldownUntil || {};
    state.ferris.catCooldownUntil[cat.name] = Math.max(
      Number(state.ferris.catCooldownUntil[cat.name]) || 0,
      cooldownUntil,
    );
    cat.ferrisCooldownUntil = Math.max(Number(cat.ferrisCooldownUntil) || 0, cooldownUntil);

    state.ferris.catRiders.push({
      catName: cat.name,
      startAt: now,
      endAt,
      cabinIndex: cabin,
    });
    changed = true;
  });
  return changed;
}

function catsInKtvCount() {
  return Object.values(state.cats).filter((cat) => isInsideKtvZone(cat.x, cat.y)).length;
}

function applyPlayerVariant(name) {
  applyVariantToAvatar(el.player, getPlayerVariant(name));
}

function getPlayerVariant(name) {
  const hash = stringHash(name);
  const palettes = [
    { head: "#ffd8ab", body: "#6bb1ff" },
    { head: "#f7f0d0", body: "#93d49f" },
    { head: "#ffd0df", body: "#b89cff" },
    { head: "#d9f1ff", body: "#65c9c2" },
  ];
  const p = palettes[Math.abs(hash) % palettes.length];
  const type = Math.abs(hash >> 2) % 3;
  return { head: p.head, body: p.body, type };
}

function stringHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function createClientId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
