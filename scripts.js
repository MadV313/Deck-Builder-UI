let currentDeck = {};
let typeCount = {
  "Attack": 0,
  "Defense": 0,
  "Tactical": 0,
  "Loot": 0,
  "Infected": 0,
  "Trap": 0,
  "Legendary": 0
};

const useLocalStorage = true;

// -------------------- URL params & API config --------------------
const qs        = new URLSearchParams(location.search);
const RAW_TOKEN = qs.get("token") || "";
const TOKEN     = RAW_TOKEN.trim().replace(/^=+/, ""); // strip any leading '='
const UID       = qs.get("uid")   || "";
const API_BASE  = (qs.get("api") || "").replace(/\/+$/, "");

// -------------------- DOM refs --------------------
const deckContainer       = document.getElementById('deckContainer');
const saveButton          = document.getElementById('saveButton');
const saveButtonBottom    = document.getElementById('saveButtonBottom');
const totalCardsDisplay   = document.getElementById('totalCards');
const typeBreakdownDisplay= document.getElementById('typeBreakdown');
const deckSummary         = document.querySelector('.deck-summary');

let cardDataMap = {};
let savedDeck   = {};
let deckHighlightActive = false;

// -------------------- Toasts (Frosty Blue Glow) --------------------
(function ensureToastStyles(){
  if (document.getElementById('frosty-toast-styles')) return;
  const css = `
  .toast-container{
    position:fixed; right:16px; top:16px; z-index:99999; display:flex; flex-direction:column; gap:10px;
    pointer-events:none;
  }
  .toast{
    pointer-events:auto;
    min-width: 260px; max-width: 420px;
    background: rgba(5, 15, 25, 0.78);
    color:#e9faff; border:1px solid rgba(0,255,255,0.35);
    box-shadow: 0 0 18px rgba(0, 255, 255, 0.25), inset 0 0 12px rgba(0, 180, 200, 0.15);
    backdrop-filter: blur(6px);
    border-radius:14px; padding:12px 14px; font: 500 14px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial;
    display:flex; align-items:flex-start; gap:10px; opacity:0; transform: translateY(-8px);
    transition: opacity .25s ease, transform .25s ease;
  }
  .toast.show{ opacity:1; transform: translateY(0); }
  .toast .icon{
    margin-top:2px; filter: drop-shadow(0 0 6px rgba(150,240,255,0.5));
  }
  .toast.success{ border-color: rgba(0,255,255,0.5); }
  .toast.info{ border-color: rgba(120,220,255,0.5); }
  .toast.warning{ border-color: rgba(255,235,140,0.55); }
  .toast.error{
    border-color: rgba(255,140,160,0.55);
    box-shadow: 0 0 20px rgba(255,130,160,0.2), inset 0 0 12px rgba(180,0,40,0.15);
  }
  .toast .msg{ white-space:pre-wrap; }
  `;
  const style = document.createElement('style');
  style.id = 'frosty-toast-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();

function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = (type === 'success') ? '❄️' :
                     (type === 'warning') ? '⚠️' :
                     (type === 'error')   ? '✖️' : '✨';
  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.textContent = message;

  el.appendChild(icon);
  el.appendChild(msg);
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const ttl = Math.max(1800, duration|0);
  const timer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, ttl);

  // allow click to dismiss quickly
  el.addEventListener('click', () => {
    clearTimeout(timer);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200);
  });
}

// -------------------- Persisted deck (optional) --------------------
if (useLocalStorage) {
  const storedDeck = localStorage.getItem('savedDeck');
  if (storedDeck) {
    savedDeck = JSON.parse(storedDeck);
  }
}

// -------------------- Fetch helpers --------------------
async function fetchJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    console.warn(`[deckbuilder] fetch failed ${url}: ${e?.message || e}`);
    return null;
  }
}


// -------------------- API helpers for deck persistence --------------------
async function apiGetDeck() {
  if (!API_BASE || !TOKEN) return null;
  const url = `${API_BASE}/me/${encodeURIComponent(TOKEN)}/deck`;
  return await fetchJSON(url);
}

async function apiPutDeck(deckName, deckMap) {
  if (!API_BASE || !TOKEN) return { ok:false, error:"Missing API/TOKEN" };
  const url = `${API_BASE}/me/${encodeURIComponent(TOKEN)}/deck`;
  const cards = Object.entries(deckMap)
    .map(([id, qty]) => ({ id, qty: Number(qty)||0 }))
    .filter(c => c.qty > 0)
    .sort((a,b) => parseInt(a.id) - parseInt(b.id));
  const body = { name: deckName || "My Deck", cards };
  try {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type":"application/json" }, // removed Cache-Control (CORS)
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({ ok:false, error:"Bad JSON" }));
    if (!r.ok || j?.ok === false) {
      const msg = j?.error || `${r.status} ${r.statusText}`;
      return { ok:false, error: msg, details: j?.details||null };
    }
    return j;
  } catch (e) {
    return { ok:false, error: e?.message || String(e) };
  }
}

async function apiDeleteDeck() {
  if (!API_BASE || !TOKEN) return { ok:false, error:"Missing API/TOKEN" };
  const url = `${API_BASE}/me/${encodeURIComponent(TOKEN)}/deck`;
  try {
    const r = await fetch(url, { method: "DELETE" }); // removed Cache-Control (CORS)
    const j = await r.json().catch(() => ({ ok:false, error:"Bad JSON" }));
    if (!r.ok || j?.ok === false) {
      const msg = j?.error || `${r.status} ${r.statusText}`;
      return { ok:false, error: msg };
    }
    return j;
  } catch (e) {
    return { ok:false, error: e?.message || String(e) };
  }
}


function pad3(n) { return String(n).padStart(3, "0"); }
function safe(s="") {
  return String(s)
    .normalize("NFKD")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Try to load master list (for names/types/rarity/filenames)
async function loadMaster() {
  const localCandidates = [
    "logic/CoreMasterReference.json",
    "data/CoreMasterReference.json",
    "CoreMasterReference.json"
  ];
  for (const p of localCandidates) {
    const m = await fetchJSON(p);
    if (Array.isArray(m) && m.length) return normalizeMaster(m);
  }
  if (API_BASE) {
    const apiCandidates = [
      `${API_BASE}/logic/CoreMasterReference.json`,
      `${API_BASE}/CoreMasterReference.json`
    ];
    for (const p of apiCandidates) {
      const m = await fetchJSON(p);
      if (Array.isArray(m) && m.length) return normalizeMaster(m);
    }
  }
  // GitHub fallbacks
  const fallbacks = [
    "https://madv313.github.io/Card-Collection-UI/logic/CoreMasterReference.json",
    "https://madv313.github.io/Duel-Bot/logic/CoreMasterReference.json",
    "https://raw.githubusercontent.com/MadV313/Duel-Bot/main/logic/CoreMasterReference.json"
  ];
  for (const u of fallbacks) {
    const m = await fetchJSON(u);
    if (Array.isArray(m) && m.length) return normalizeMaster(m);
  }
  // Minimal stub if all else fails
  return Array.from({ length: 127 }, (_, i) => {
    const id = pad3(i + 1);
    return { card_id: id, name: `Card ${id}`, type: "Unknown", rarity: "Common", image: `${id}_Card_Unknown.png` };
  });
}

function normalizeMaster(master) {
  return master
    .map(c => {
      const id     = pad3(c.card_id ?? c.number ?? c.id);
      const image  = c.image || c.filename || `${id}_${safe(c.name || "Card")}_${safe(c.type || "Unknown")}.png`;
      const name   = c.name || `Card ${id}`;
      const type   = c.type || "Unknown";
      const rarity = c.rarity || "Common";
      return { ...c, card_id: id, image, name, type, rarity };
    })
    .filter(c => c.card_id !== "000")
    .sort((a,b) => (parseInt(a.card_id)||0) - (parseInt(b.card_id)||0));
}

// Convert any backend shape into { [###]: qty }
function toOwnedMap(data) {
  const map = {};
  if (!data) return map;

  // Array of rows with counts
  if (Array.isArray(data)) {
    for (const row of data) {
      const id  = pad3(row.number ?? row.card_id ?? row.id);
      const qty = Number(row.owned ?? row.quantity ?? 0);
      if (!id || !Number.isFinite(qty)) continue;
      map[id] = (map[id] || 0) + qty;
    }
    return map;
  }

  // Map shape
  if (typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      const id  = pad3(k);
      const qty = Number(v);
      if (Number.isFinite(qty)) map[id] = qty;
    }
  }
  return map;
}

// Load ownership (prefers API + token)
async function loadOwnership() {
  if (!useMockMode && API_BASE && TOKEN) {
    // Preferred routes
    let d = await fetchJSON(`${API_BASE}/me/${encodeURIComponent(TOKEN)}/collection`);
    if (d) return toOwnedMap(d);
    d = await fetchJSON(`${API_BASE}/collection?token=${encodeURIComponent(TOKEN)}`);
    if (d) return toOwnedMap(d);
  }
  if (!useMockMode && API_BASE && UID) {
    const d = await fetchJSON(`${API_BASE}/collection?userId=${encodeURIComponent(UID)}`);
    if (d) return toOwnedMap(d);
  }

  // Local fallbacks (legacy)
  const localPrimary = await fetchJSON("deckData.json");
  if (localPrimary) return toOwnedMap(localPrimary);

  if (useMockMode) {
    const mock = await fetchJSON("mock_deckData.json");
    if (mock) {
      // mock is typically a list with duplicates; collapse to counts
      const map = {};
      mock.forEach(c => {
        const id = String(c.card_id).replace(/-DUP\d*$/, '').replace(/-DUP$/, '');
        if (!id) return;
        const id3 = pad3(id);
        map[id3] = (map[id3] || 0) + 1;
      });
      return map;
    }
  }

  // Final fallback: empty (no owned cards)
  return {};
}

// -------------------- Data bootstrap --------------------
(async function init() {
  const [master, ownedMap] = await Promise.all([loadMaster(), loadOwnership()]);

  // Build the map the UI expects: only show cards you own (qty > 0)
  // and attach the filename/rarity/type for rendering/filters already used by the UI.
  cardDataMap = {};
  for (const m of master) {
    const qty = Number(ownedMap[m.card_id] || 0);
    if (qty > 0) {
      cardDataMap[m.card_id] = {
        ...m,
        quantity: qty,       // how many owned
        image: m.image       // filename used by current UI
      };
    }
  }

  // Try to fetch previously saved deck to enable "My Deck" button & highlighting
  try {
    if (API_BASE && TOKEN) {
      const resp = await apiGetDeck();
      if (resp && resp.ok && resp.deck && Array.isArray(resp.deck.cards)) {
        savedDeck = {};
        for (const c of resp.deck.cards) {
          const cid = /^\d+$/.test(String(c.id)) ? pad3(Number(c.id)) : String(c.id).padStart(3,'0');
          savedDeck[cid] = Number(c.qty)||0;
        }
        const myBtn = document.querySelector('.my-deck-button');
        if (myBtn) myBtn.classList.remove('disabled');
      }
    }
  } catch (e) {
    console.warn('[deckbuilder] init: failed to fetch saved deck', e);
  }
  // Build initial grid (owned cards)
  loadAllCards();
})();

// -------------------- Rendering (unchanged) --------------------
function loadAllCards() {
  deckContainer.innerHTML = '';
  const sorted = Object.values(cardDataMap).sort((a, b) => parseInt(a.card_id) - parseInt(b.card_id));
  sorted.forEach(card => createCard(card, card.quantity));
}

function loadSavedDeckOnly() {
  deckContainer.innerHTML = '';
  const sortedDeckIds = Object.keys(savedDeck).sort((a, b) => parseInt(a) - parseInt(b));
  sortedDeckIds.forEach(id => {
    const cardData = cardDataMap[id];
    if (cardData) {
      createCard(cardData, savedDeck[id], true, true);
    }
  });
}

function createCard(cardData, countOverride = null, highlight = false, nonInteractive = false) {
  const id = String(cardData.card_id);
  const borderWrap = document.createElement('div');
  borderWrap.className = 'card-border-wrap';
  if (highlight) borderWrap.classList.add('highlighted-deck-card');
  borderWrap.setAttribute('data-card-id', id);
  borderWrap.setAttribute('data-quantity', cardData.quantity);

  const card = document.createElement('div');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = `images/cards/${cardData.image}`;
  img.alt = cardData.name;
  img.className = 'card-img';

  const badge = document.createElement('div');
  badge.className = 'quantity-badge';
  badge.innerText = `x${countOverride ?? cardData.quantity}`;
  badge.id = `badge-${id}`;

  card.appendChild(img);
  card.appendChild(badge);
  borderWrap.appendChild(card);

  if (!nonInteractive) {
    borderWrap.addEventListener('click', () =>
      toggleCard(borderWrap, id, cardData.type, cardData.quantity)
    );
  }

  deckContainer.appendChild(borderWrap);
}

// -------------------- Interactions (unchanged) --------------------
function toggleCard(borderWrap, rawId, type, ownedQuantity) {
  const id = rawId.replace(/-DUP\d*$/, '').replace(/-DUP$/, '');
  borderWrap.classList.remove('limit-reached', 'shake');
  void borderWrap.offsetWidth;

  const currentSelected = currentDeck[id] || 0;
  const maxAllowed = Math.min(ownedQuantity, 5);
  const totalCardsNow = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  if (totalCardsNow >= 40 && currentSelected === 0) {
    showWarning(borderWrap, isMobile, "⚠️ Your deck already has 40 cards. Remove one before adding more.");
    return;
  }

  let desiredCount;
  if (ownedQuantity === 1) {
    desiredCount = currentSelected > 0 ? 0 : 1;
  } else {
    const input = prompt(
      `You own ${ownedQuantity} of this card.\nCurrently selected: ${currentSelected}.\nEnter new desired quantity (0 to ${maxAllowed}):`,
      currentSelected
    );
    if (input === null) return;

    const parsed = parseInt(input);
    if (isNaN(parsed) || parsed < 0 || parsed > maxAllowed) {
      showWarning(borderWrap, isMobile, `⚠️ You can only add up to ${maxAllowed} of this card.`);
      return;
    }
    desiredCount = parsed;
  }

  const newTotal = totalCardsNow - currentSelected + desiredCount;
  if (newTotal > 40) {
    showWarning(borderWrap, isMobile, "⚠️ You can't add more than 40 cards.");
    return;
  }

  if (!typeCount[type]) typeCount[type] = 0;
  typeCount[type] = typeCount[type] - currentSelected + desiredCount;

  if (desiredCount === 0) {
    delete currentDeck[id];
    borderWrap.classList.remove('selected-card');
  } else {
    currentDeck[id] = desiredCount;
    borderWrap.classList.add('selected-card');
  }

  updateDeckSummary();
  validateDeck();
}

function showWarning(borderWrap, isMobile, message) {
  borderWrap.classList.remove('limit-reached', 'shake');
  void borderWrap.offsetWidth;
  borderWrap.classList.add('limit-reached', 'shake');
  if (isMobile && navigator.vibrate) navigator.vibrate([200]);
  setTimeout(() => borderWrap.classList.remove('limit-reached', 'shake'), 600);
  showToast(message, 'warning', 3000);
}

function updateDeckSummary() {
  const total = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  totalCardsDisplay.classList.remove('pulse');
  void totalCardsDisplay.offsetWidth;
  totalCardsDisplay.classList.add('pulse');

  totalCardsDisplay.innerText = `Cards Selected: ${total} / (20–40)`;
  typeBreakdownDisplay.innerText =
    `⚔️x${typeCount["Attack"]} 🛡️x${typeCount["Defense"]} 🧭x${typeCount["Tactical"]} 🎒x${typeCount["Loot"]} ☣️x${typeCount["Infected"]} 🧨x${typeCount["Trap"]} ✨x${typeCount["Legendary"]}`;
  deckSummary.classList.toggle('full-deck', total === 40);
}

function validateDeck() {
  const total = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  const valid = total >= 20 && total <= 40;
  [saveButton, saveButtonBottom].forEach(btn => {
    btn.classList.toggle('disabled', !valid);
    btn.classList.toggle('animate', valid);
  });
}

async function saveDeck() {  // async retained for await
  const total = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  if (total < 20 || total > 40) {
    showToast('Deck must be between 20 and 40 cards.', 'error', 3500);
    return;
  }

  const savedString = JSON.stringify(savedDeck);
  const currentString = JSON.stringify(currentDeck);
  if (savedString === currentString) {
    showToast("✅ Deck already saved.", 'info', 2200);
    return;
  }

  savedDeck = { ...currentDeck };
  // Persist remotely if API/TOKEN provided
  if (API_BASE && TOKEN) {
    try {
      const res = await apiPutDeck('My Deck', savedDeck);
      if (!res?.ok) {
        showToast(`Failed to save deck: ${res?.error || 'Unknown error'}`, 'error', 4000);
        return;
      }
    } catch (e) {
      showToast(`Failed to save deck: ${e?.message || e}`, 'error', 4000);
      return;
    }
  }
  if (useLocalStorage) {
    localStorage.setItem('savedDeck', JSON.stringify(savedDeck));
  }

  const cards = document.querySelectorAll('.card-border-wrap');
  cards.forEach(card => card.classList.add('slide-out-left'));

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const shuffleDelay = isMobile ? 600 : 0;

  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    deckContainer.innerHTML = '';

    const pile = document.createElement('div');
    pile.className = 'deck-pile';
    deckContainer.appendChild(pile);

    for (let i = 0; i < 7; i++) {
      const shuffleCard = document.createElement('img');
      shuffleCard.src = 'images/cards/000_CardBack_Unique.png';
      shuffleCard.className = 'shuffle-card';
      shuffleCard.style.animationDelay = `${i * 0.45 + shuffleDelay / 1000}s`;
      pile.appendChild(shuffleCard);
    }

    const toast = document.createElement('div');
    toast.className = 'deck-toast';
    toast.innerText = '✅ Deck Saved!';
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 1800 + shuffleDelay);
    setTimeout(() => {
      toast.classList.remove('show');
      toast.remove();
      pile.classList.add('slide-up');

      setTimeout(() => {
        requestAnimationFrame(() => {
          document.body.style.overflow = '';
          deckContainer.innerHTML = '';
          currentDeck = {};
          Object.keys(typeCount).forEach(key => typeCount[key] = 0);
          loadSavedDeckOnly();
          updateDeckSummary();
          validateDeck();
        });
      }, 1200);
    }, 4000 + shuffleDelay);
  }, 600);
}

async function confirmWipe() {  // async retained for await
  if (confirm('Are you sure you want to wipe your deck?')) {
    // Try remote wipe first
    if (API_BASE && TOKEN) {
      try {
        const res = await apiDeleteDeck();
        if (!res?.ok) {
          showToast(`Failed to wipe deck on server: ${res?.error || 'Unknown error'}`, 'error', 4000);
          return;
        }
      } catch (e) {
        showToast(`Failed to wipe deck on server: ${e?.message || e}`, 'error', 4000);
        return;
      }
    }
    currentDeck = {};
    Object.keys(typeCount).forEach(key => typeCount[key] = 0);
    loadAllCards();
    updateDeckSummary();
    validateDeck();
    showToast('🧊 Deck wiped.', 'success', 2200);
  }
}

function highlightMyDeck() {
  if (deckHighlightActive) {
    showToast("📘 Currently viewing saved deck.", 'info', 2000);
    return;
  }

  deckHighlightActive = true;
  document.querySelectorAll('.card-border-wrap').forEach(card => {
    const id = card.getAttribute('data-card-id');
    if (savedDeck[id]) {
      card.classList.add('highlighted-deck-card');
    }
  });
}

document.getElementById('myDeckButton')?.addEventListener('click', highlightMyDeck);
