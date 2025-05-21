let currentDeck = [];
let typeCount = {
  "Attack": 0,
  "Defense": 0,
  "Tactical": 0,
  "Loot": 0,
  "Infected": 0,
  "Trap": 0,
  "Legendary": 0
};

const deckContainer = document.getElementById('deckContainer');
const saveButton = document.getElementById('saveButton');
const saveButtonBottom = document.getElementById('saveButtonBottom');
const totalCardsDisplay = document.getElementById('totalCards');
const typeBreakdownDisplay = document.getElementById('typeBreakdown');
const deckSummary = document.querySelector('.deck-summary');

let cardDataMap = {};

// 🔀 Toggle this to true for mock testing, false for real data
const useMockMode = true;

// 🔄 Choose data source
const dataSource = useMockMode
  ? fetch('mock_deckData.json').then(res => res.json())
  : fetch('deckData.json').then(res => res.json());

dataSource.then(cards => {
  cards.sort((a, b) => parseInt(a.card_id) - parseInt(b.card_id));
  cards.forEach(cardData => {
    const id = String(cardData.card_id); // Ensure ID is string

    const borderWrap = document.createElement('div');
    borderWrap.className = 'card-border-wrap';

    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = `images/cards/${cardData.image}`;
    img.alt = cardData.name;
    img.className = 'card-img';

    card.appendChild(img);
    borderWrap.appendChild(card);

    // ✅ Use click listener
    borderWrap.addEventListener('click', () => toggleCard(borderWrap, id, cardData.type));

    deckContainer.appendChild(borderWrap);
    cardDataMap[id] = cardData;
  });
});

function toggleCard(borderWrap, id, type) {
  id = String(id); // normalize

  // Remove limit warning if present
  borderWrap.classList.remove('limit-reached');

  if (currentDeck.includes(id)) {
    currentDeck = currentDeck.filter(c => c !== id);
    if (typeCount[type] > 0) typeCount[type]--;
    borderWrap.classList.remove('selected-card');
  } else {
    if (currentDeck.length >= 40) {
      // ❌ Max reached
      borderWrap.classList.add('limit-reached');
      if (navigator.vibrate) {
        navigator.vibrate([150]); // 🔔 Mobile vibration
      }
      setTimeout(() => borderWrap.classList.remove('limit-reached'), 600);
      alert("⚠️ You can't add more than 40 cards.");
      return;
    }

    currentDeck.push(id);
    if (!typeCount[type]) typeCount[type] = 0;
    typeCount[type]++;
    borderWrap.classList.add('selected-card');
  }

  updateDeckSummary();
  validateDeck();
}

function updateDeckSummary() {
  // Animate card count on update
  totalCardsDisplay.classList.remove('pulse');
  void totalCardsDisplay.offsetWidth; // force reflow
  totalCardsDisplay.classList.add('pulse');

  totalCardsDisplay.innerText = `Cards Selected: ${currentDeck.length} / (20–40)`;
  typeBreakdownDisplay.innerText =
    `⚔️x${typeCount["Attack"]} 🛡️x${typeCount["Defense"]} 🧭x${typeCount["Tactical"]} 🎒x${typeCount["Loot"]} ☣️x${typeCount["Infected"]} 🧨x${typeCount["Trap"]} ✨x${typeCount["Legendary"]}`;

  // Gold highlight if full
  if (currentDeck.length === 40) {
    deckSummary.classList.add('full-deck');
  } else {
    deckSummary.classList.remove('full-deck');
  }
}

function validateDeck() {
  const valid = currentDeck.length >= 20 && currentDeck.length <= 40;
  [saveButton, saveButtonBottom].forEach(btn => {
    btn.classList.toggle('disabled', !valid);
    btn.classList.toggle('animate', valid);
  });
}

function saveDeck() {
  if (currentDeck.length >= 20 && currentDeck.length <= 40) {
    alert('Deck saved successfully!');
  } else {
    alert('Deck must be between 20 and 40 cards.');
  }
}

function confirmWipe() {
  if (confirm('Are you sure you want to wipe your deck?')) {
    currentDeck = [];
    Object.keys(typeCount).forEach(key => typeCount[key] = 0);
    document.querySelectorAll('.card-border-wrap').forEach(card => {
      card.classList.remove('selected-card', 'limit-reached');
    });
    updateDeckSummary();
    validateDeck();
  }
}
