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

fetch('deckData.json')
  .then(response => response.json())
  .then(cards => {
    cards.forEach(cardData => {
      const card = document.createElement('div');
      card.className = 'card';
      
      const img = document.createElement('img');
      img.src = cardData.image;
      img.alt = cardData.name;
      img.className = 'card-img';

      card.appendChild(img);
      card.onclick = () => toggleCard(card, cardData.id, cardData.type);
      deckContainer.appendChild(card);

      cardDataMap[cardData.id] = cardData;
    });
  });

function toggleCard(card, id, type) {
  if (currentDeck.includes(id)) {
    currentDeck = currentDeck.filter(c => c !== id);
    typeCount[type]--;
    card.style.borderColor = 'teal';
  } else {
    currentDeck.push(id);
    typeCount[type]++;
    card.style.borderColor = 'lime';
  }
  updateDeckSummary();
  validateDeck();
}

function updateDeckSummary() {
  totalCardsDisplay.innerText = `Cards Selected: ${currentDeck.length} / (20–40)`;
  typeBreakdownDisplay.innerText = `⚔️x${typeCount["Attack"]} 🛡️x${typeCount["Defense"]} 🧭x${typeCount["Tactical"]} 🎒x${typeCount["Loot"]} ☣️x${typeCount["Infected"]} 🧨x${typeCount["Trap"]} ✨x${typeCount["Legendary"]}`;
}

function validateDeck() {
  if (currentDeck.length >= 20 && currentDeck.length <= 40) {
    saveButton.classList.remove('disabled');
    saveButton.classList.add('animate');
    saveButtonBottom.classList.remove('disabled');
    saveButtonBottom.classList.add('animate');
  } else {
    saveButton.classList.add('disabled');
    saveButton.classList.remove('animate');
    saveButtonBottom.classList.add('disabled');
    saveButtonBottom.classList.remove('animate');
  }
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
    document.querySelectorAll('.card').forEach(card => {
      card.style.borderColor = 'teal';
    });
    updateDeckSummary();
    validateDeck();
  }
}
