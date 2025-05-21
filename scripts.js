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

const deckContainer = document.getElementById('deckContainer');
const saveButton = document.getElementById('saveButton');
const saveButtonBottom = document.getElementById('saveButtonBottom');
const totalCardsDisplay = document.getElementById('totalCards');
const typeBreakdownDisplay = document.getElementById('typeBreakdown');
const deckSummary = document.querySelector('.deck-summary');

let cardDataMap = {};
const useMockMode = true;

const dataSource = useMockMode
  ? fetch('mock_deckData.json').then(res => res.json())
  : fetch('deckData.json').then(res => res.json());

dataSource.then(cards => {
  const grouped = {};

  cards.forEach(card => {
    const rawId = String(card.card_id);
    const baseId = rawId.replace(/DUP\d*$/, '').replace(/DUP$/, '');

    if (!grouped[baseId]) {
      grouped[baseId] = {
        ...card,
        card_id: baseId,
        quantity: 1
      };
    } else {
      grouped[baseId].quantity += 1;
    }
  });

  const sortedCards = Object.values(grouped).sort((a, b) => parseInt(a.card_id) - parseInt(b.card_id));
  sortedCards.forEach(cardData => {
    const id = String(cardData.card_id);

    const borderWrap = document.createElement('div');
    borderWrap.className = 'card-border-wrap';
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
    badge.innerText = `x${cardData.quantity}`;
    card.appendChild(badge);

    card.appendChild(img);
    borderWrap.appendChild(card);

    borderWrap.addEventListener('click', () =>
      toggleCard(borderWrap, id, cardData.type, cardData.quantity)
    );

    deckContainer.appendChild(borderWrap);
    cardDataMap[id] = cardData;
  });
});

function toggleCard(borderWrap, rawId, type, ownedQuantity) {
  const id = rawId.replace(/DUP\d*$/, '').replace(/DUP$/, '');
  borderWrap.classList.remove('limit-reached');

  const previousCount = currentDeck[id] || 0;

  const input = prompt(
    `You own ${ownedQuantity} of this card.\nHow many would you like to ${previousCount > 0 ? 'remove' : 'add'}?`,
    previousCount > 0 ? previousCount : 1
  );

  if (input === null) return;

  const count = parseInt(input);
  if (isNaN(count) || count < 0 || count > ownedQuantity) {
    alert(`Please enter a valid number between 0 and ${ownedQuantity}`);
    return;
  }

  const totalSelected = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
  const newTotal = totalSelected - previousCount + count;

  if (newTotal > 40) {
    borderWrap.classList.add('limit-reached');
    if (navigator.vibrate) navigator.vibrate([150]);
    setTimeout(() => borderWrap.classList.remove('limit-reached'), 600);
    alert("⚠️ You can't add more than 40 cards.");
    return;
  }

  // Update type count
  if (!typeCount[type]) typeCount[type] = 0;
  typeCount[type] = typeCount[type] - previousCount + count;

  if (count === 0) {
    delete currentDeck[id];
    borderWrap.classList.remove('selected-card');
  } else {
    currentDeck[id] = count;
    borderWrap.classList.add('selected-card');
  }

  updateDeckSummary();
  validateDeck();
}

function updateDeckSummary() {
  const total = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);

  totalCardsDisplay.classList.remove('pulse');
  void totalCardsDisplay.offsetWidth;
  totalCardsDisplay.classList.add('pulse');

  totalCardsDisplay.innerText = `Cards Selected: ${total} / (20–40)`;
  typeBreakdownDisplay.innerText =
    `⚔️x${typeCount["Attack"]} 🛡️x${typeCount["Defense"]} 🧭x${typeCount["Tactical"]} 🎒x${typeCount["Loot"]} ☣️x${typeCount["Infected"]} 🧨x${typeCount["Trap"]} ✨x${typeCount["Legendary"]}`;

  if (total === 40) {
    deckSummary.classList.add('full-deck');
  } else {
    deckSummary.classList.remove('full-deck');
  }
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
  if (total >= 20 && total <= 40) {
    alert('Deck saved successfully!');
  } else {
    alert('Deck must be between 20 and 40 cards.');
  }
}

function confirmWipe() {
  if (confirm('Are you sure you want to wipe your deck?')) {
    currentDeck = {};
    Object.keys(typeCount).forEach(key => typeCount[key] = 0);
    document.querySelectorAll('.card-border-wrap').forEach(card => {
      card.classList.remove('selected-card', 'limit-reached');
    });
    updateDeckSummary();
    validateDeck();
  }
}
