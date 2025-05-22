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

const deckContainer = document.getElementById('deckContainer');
const saveButton = document.getElementById('saveButton');
const saveButtonBottom = document.getElementById('saveButtonBottom');
const totalCardsDisplay = document.getElementById('totalCards');
const typeBreakdownDisplay = document.getElementById('typeBreakdown');
const deckSummary = document.querySelector('.deck-summary');

let cardDataMap = {};
const useMockMode = true;
let savedDeck = {};
let deckHighlightActive = false;

if (useLocalStorage) {
  const storedDeck = localStorage.getItem('savedDeck');
  if (storedDeck) {
    savedDeck = JSON.parse(storedDeck);
  }
}

const dataSource = useMockMode
  ? fetch('mock_deckData.json').then(res => res.json())
  : fetch('deckData.json').then(res => res.json());

dataSource.then(cards => {
  const grouped = {};
  cards.forEach(card => {
    const rawId = String(card.card_id);
    const baseId = rawId.replace(/-DUP\d*$/, '').replace(/-DUP$/, '');
    if (!grouped[baseId]) {
      grouped[baseId] = { ...card, card_id: baseId, quantity: 1 };
    } else {
      grouped[baseId].quantity += 1;
    }
  });

  cardDataMap = Object.values(grouped).reduce((map, c) => {
    map[c.card_id] = c;
    return map;
  }, {});

  loadAllCards();
});

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
      createCard(cardData, savedDeck[id], true, true); // ✅ highlight = true, nonInteractive = true
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
  alert(message);
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

function saveDeck() {
  const total = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  if (total < 20 || total > 40) {
    alert('Deck must be between 20 and 40 cards.');
    return;
  }

  savedDeck = { ...currentDeck };
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

    for (let i = 0; i < 12; i++) {
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

function confirmWipe() {
  if (confirm('Are you sure you want to wipe your deck?')) {
    currentDeck = {};
    Object.keys(typeCount).forEach(key => typeCount[key] = 0);
    loadAllCards();
    updateDeckSummary();
    validateDeck();
  }
}

function highlightMyDeck() {
  deckHighlightActive = !deckHighlightActive;
  document.querySelectorAll('.card-border-wrap').forEach(card => {
    const id = card.getAttribute('data-card-id');
    if (deckHighlightActive && savedDeck[id]) {
      card.classList.add('highlighted-deck-card');
    } else {
      card.classList.remove('highlighted-deck-card');
    }
  });
}

document.getElementById('myDeckButton')?.addEventListener('click', highlightMyDeck);
