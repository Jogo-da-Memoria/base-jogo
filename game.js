// game.js - Lógica do tabuleiro e cartas

class MemoryGame {
  constructor() {
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameStarted = false;
    this.startTime = null;
    this.timerInterval = null;
    
    // Elementos DOM
    this.gameBoard = document.getElementById('gameBoard');
    this.difficultySection = document.getElementById('difficultySection');
    this.gameSection = document.getElementById('gameSection');
    this.movesCount = document.getElementById('movesCount');
    this.pairsCount = document.getElementById('pairsCount');
    this.timer = document.getElementById('timer');
    this.restartBtn = document.getElementById('restartBtn');
    this.backBtn = document.getElementById('backBtn');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.showDifficultySelection();
  }

  setupEventListeners() {
    // Botão voltar
    this.backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Botão reiniciar
    this.restartBtn.addEventListener('click', () => {
      this.restartGame();
    });

    // Seleção de dificuldade
    document.querySelectorAll('.difficulty-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const difficulty = e.currentTarget.dataset.difficulty;
        this.startGame(difficulty);
      });
    });
  }

  showDifficultySelection() {
    this.difficultySection.style.display = 'block';
    this.gameSection.style.display = 'none';
    this.restartBtn.style.display = 'none';
  }

  startGame(difficulty) {
    this.difficultySection.style.display = 'none';
    this.gameSection.style.display = 'block';
    this.restartBtn.style.display = 'block';

    // Configurações por dificuldade
    const config = {
      easy: { pairs: 4, columns: 'cards-4' },
      medium: { pairs: 6, columns: 'cards-6' },
      hard: { pairs: 8, columns: 'cards-8' }
    };

    this.currentConfig = config[difficulty];
    this.setupBoard();
    this.startTimer();
  }

  setupBoard() {
    this.gameBoard.innerHTML = '';
    this.gameBoard.className = `game-board ${this.currentConfig.columns}`;
    
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameStarted = true;

    this.updateStats();

    // Criar pares de cartas
    const cardValues = this.generateCardValues(this.currentConfig.pairs);
    this.createCards(cardValues);
  }

  generateCardValues(pairsCount) {
    // Emojis ou ícones para as cartas (podem ser substituídos por imagens)
    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
    const selectedEmojis = emojis.slice(0, pairsCount);
    
    // Duplicar para formar pares e embaralhar
    const cards = [...selectedEmojis, ...selectedEmojis];
    return this.shuffleArray(cards);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  createCards(cardValues) {
    cardValues.forEach((value, index) => {
      const card = this.createCardElement(value, index);
      this.gameBoard.appendChild(card);
      this.cards.push({
        element: card,
        value: value,
        isFlipped: false,
        isMatched: false
      });
    });
  }

  createCardElement(value, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-index', index);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Carta do jogo da memória');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="inner">
        <div class="card__face card__face--front">
          ${value}
        </div>
        <div class="card__face card__face--back">
          ?
        </div>
      </div>
    `;

    // Event listeners para interação
    card.addEventListener('click', () => this.handleCardClick(index));
    
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleCardClick(index);
      }
    });

    return card;
  }

  handleCardClick(index) {
    if (!this.gameStarted) return;
    
    const card = this.cards[index];
    
    // Não permitir clicar em cartas já viradas ou matched
    if (card.isFlipped || card.isMatched || this.flippedCards.length >= 2) {
      return;
    }

    this.flipCard(card, true);
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateStats();
      this.checkForMatch();
    }
  }

  flipCard(card, flip) {
    card.isFlipped = flip;
    if (flip) {
      card.element.classList.add('is-flipped');
    } else {
      card.element.classList.remove('is-flipped');
    }
  }

  checkForMatch() {
    const [card1, card2] = this.flippedCards;
    
    if (card1.value === card2.value) {
      // Match encontrado
      card1.isMatched = true;
      card2.isMatched = true;
      card1.element.classList.add('matched');
      card2.element.classList.add('matched');
      
      this.matchedPairs++;
      this.updateStats();
      this.flippedCards = [];

      // Verificar se o jogo terminou
      if (this.matchedPairs === this.currentConfig.pairs) {
        this.endGame();
      }
    } else {
      // Não é match - virar cartas de volta após delay
      setTimeout(() => {
        this.flipCard(card1, false);
        this.flipCard(card2, false);
        this.flippedCards = [];
      }, 1000);
    }
  }

  updateStats() {
    this.movesCount.textContent = `${this.moves} jogada${this.moves !== 1 ? 's' : ''}`;
    this.pairsCount.textContent = `${this.matchedPairs} par${this.matchedPairs !== 1 ? 'es' : ''}`;
  }

  startTimer() {
    this.startTime = new Date();
    this.timerInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now - this.startTime) / 1000);
      const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');
      this.timer.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  endGame() {
    this.stopTimer();
    this.gameStarted = false;
    
    setTimeout(() => {
      alert(`🎉 Parabéns! Você completou o jogo em ${this.moves} jogadas e ${this.timer.textContent} minutos!`);
    }, 500);
  }

  restartGame() {
    this.stopTimer();
    this.startGame(this.getCurrentDifficulty());
  }

  getCurrentDifficulty() {
    return Object.keys({
      easy: { pairs: 4 },
      medium: { pairs: 6 }, 
      hard: { pairs: 8 }
    }).find(key => this.currentConfig.pairs === { easy: 4, medium: 6, hard: 8 }[key]) || 'medium';
  }
}

// Inicializar o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new MemoryGame();
});