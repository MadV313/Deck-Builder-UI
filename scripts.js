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
    borderWrap.onclick = () => toggleCard(borderWrap, cardData.card_id, cardData.type);
    deckContainer.appendChild(borderWrap);

    cardDataMap[cardData.card_id] = cardData;
  });
});

function toggleCard(borderWrap, id, type) {
  if (currentDeck.includes(id)) {
    currentDeck = currentDeck.filter(c => c !== id);
    typeCount[type]--;
    borderWrap.classList.remove('selected-card');
  } else {
    currentDeck.push(id);
    typeCount[type]++;
    borderWrap.classList.add('selected-card');
  }
  updateDeckSummary();
  validateDeck();
}

function updateDeckSummary() {
  totalCardsDisplay.innerText = `Cards Selected: ${currentDeck.length} / (20–40)`;
  typeBreakdownDisplay.innerText = `⚔️x${typeCount["Attack"]} 🛡️x${typeCount["Defense"]} 🧭x${typeCount["Tactical"]} 🎒x${typeCount["Loot"]} ☣️x${typeCount["Infected"]} 🧨x${typeCount["Trap"]} ✨x${typeCount["Legendary"]}`;
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
      card.classList.remove('selected-card');
    });
    updateDeckSummary();
    validateDeck();
  }
}
