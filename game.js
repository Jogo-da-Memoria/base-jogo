// game.js - Sistema Completo de Pontuação e Níveis
class MemoryGame {
    constructor() {
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.totalPairs = 0;
        this.gameStarted = false;
        this.canFlip = true;
        this.score = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.currentDifficulty = null;
        this.multiplier = 1;

        // Configurações de dificuldade
        this.difficultySettings = {
            easy: { 
                pairs: 4, 
                columns: 'cards-4',
                multiplier: 1.0,
                baseScore: 100,
                timeBonus: 50,
                perfectBonus: 200
            },
            medium: { 
                pairs: 6, 
                columns: 'cards-6',
                multiplier: 1.5,
                baseScore: 150,
                timeBonus: 75,
                perfectBonus: 300
            },
            hard: { 
                pairs: 8, 
                columns: 'cards-8',
                multiplier: 2.0,
                baseScore: 200,
                timeBonus: 100,
                perfectBonus: 400
            }
        };

        // Elementos DOM
        this.gameBoard = document.getElementById('gameBoard');
        this.movesCount = document.getElementById('movesCount');
        this.pairsCount = document.getElementById('pairsCount');
        this.timer = document.getElementById('timer');
        this.currentScore = document.getElementById('currentScore');
        this.efficiency = document.getElementById('efficiency');
        this.difficultyBadge = document.getElementById('difficultyBadge');
        this.restartBtn = document.getElementById('restartBtn');
        this.changeDifficultyBtn = document.getElementById('changeDifficultyBtn');
        this.backBtn = document.getElementById('backBtn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showDifficultySelection();
    }

    setupEventListeners() {
        this.backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        this.restartBtn.addEventListener('click', () => {
            this.restartGame();
        });

        this.changeDifficultyBtn.addEventListener('click', () => {
            this.showDifficultySelection();
        });

        // ✅ TAREFA: Seleção de dificuldade
        document.querySelectorAll('.difficulty-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Remover seleção anterior
                document.querySelectorAll('.difficulty-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Adicionar seleção atual
                e.currentTarget.classList.add('selected');
                
                const difficulty = e.currentTarget.dataset.difficulty;
                this.startGame(difficulty);
            });
        });
    }

    showDifficultySelection() {
        document.getElementById('difficultySection').style.display = 'block';
        document.getElementById('gameSection').style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.changeDifficultyBtn.style.display = 'none';
        
        // Resetar seleção
        document.querySelectorAll('.difficulty-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    }

    // ✅ TAREFA: Iniciar jogo com dificuldade selecionada
    startGame(difficulty) {
        document.getElementById('difficultySection').style.display = 'none';
        document.getElementById('gameSection').style.display = 'block';
        this.restartBtn.style.display = 'block';
        this.changeDifficultyBtn.style.display = 'block';

        this.currentDifficulty = difficulty;
        const config = this.difficultySettings[difficulty];
        this.multiplier = config.multiplier;

        // Atualizar badge de dificuldade
        this.updateDifficultyBadge(difficulty);

        this.setupBoard(config);
        this.startTimer();
    }

    updateDifficultyBadge(difficulty) {
        const difficultyNames = {
            easy: { name: 'Fácil', class: 'badge-easy' },
            medium: { name: 'Médio', class: 'badge-medium' },
            hard: { name: 'Difícil', class: 'badge-hard' }
        };
        
        const diff = difficultyNames[difficulty];
        this.difficultyBadge.textContent = diff.name;
        this.difficultyBadge.className = `difficulty-badge ${diff.class}`;
    }

    setupBoard(config) {
        this.gameBoard.innerHTML = '';
        this.gameBoard.className = `game-board ${config.columns}`;
        
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.score = 0;
        this.totalPairs = config.pairs;
        this.gameStarted = true;
        this.canFlip = true;

        this.updateStats();

        // Gerar e embaralhar cartas
        const cardValues = this.generateCardValues(config.pairs);
        const shuffledValues = this.shuffleCards(cardValues);
        
        this.createCards(shuffledValues);
    }

    generateCardValues(pairsCount) {
        const symbols = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
        const selectedSymbols = symbols.slice(0, pairsCount);
        return [...selectedSymbols, ...selectedSymbols];
    }

    shuffleCards(cards) {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    createCards(cardValues) {
        cardValues.forEach((value, index) => {
            const card = this.createCardElement(value, index);
            this.gameBoard.appendChild(card);
            
            this.cards.push({
                element: card,
                value: value,
                isFlipped: false,
                isMatched: false,
                index: index
            });
        });
    }

    createCardElement(value, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-index', index);
        card.setAttribute('data-value', value);
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Carta ${index + 1}`);
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

        card.addEventListener('click', () => this.handleCardClick(index));
        card.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && this.canFlip) {
                e.preventDefault();
                this.handleCardClick(index);
            }
        });

        return card;
    }

    handleCardClick(index) {
        if (!this.canFlip || !this.gameStarted) return;
        
        const card = this.cards[index];
        
        if (card.isFlipped || card.isMatched || this.flippedCards.length >= 2) {
            return;
        }

        this.flipCard(card, true);
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.canFlip = false;
            
            setTimeout(() => {
                this.checkForMatch();
                this.canFlip = true;
            }, 800);
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
        if (this.flippedCards.length !== 2) return;

        const [card1, card2] = this.flippedCards;
        
        if (card1.value === card2.value) {
            this.handleMatch(card1, card2);
        } else {
            this.handleMismatch(card1, card2);
        }
    }

    handleMatch(card1, card2) {
        card1.isMatched = true;
        card2.isMatched = true;
        card1.element.classList.add('matched');
        card2.element.classList.add('matched');
        
        this.matchedPairs++;
        
        // ✅ TAREFA: Calcular pontuação em tempo real
        this.calculateScoreForMatch();
        this.updateStats();
        
        this.flippedCards = [];

        if (this.matchedPairs === this.totalPairs) {
            this.endGame();
        }
    }

    handleMismatch(card1, card2) {
        this.flipCard(card1, false);
        this.flipCard(card2, false);
        this.flippedCards = [];
    }

    // ✅ TAREFA: Sistema de pontuação
    calculateScoreForMatch() {
        const config = this.difficultySettings[this.currentDifficulty];
        
        // Pontuação base por par encontrado
        let points = config.baseScore;
        
        // Bônus por eficiência (menos jogadas)
        const minPossibleMoves = this.totalPairs * 2;
        const efficiency = Math.max(0.5, minPossibleMoves / this.moves);
        points = Math.round(points * efficiency);
        
        // Aplicar multiplicador de dificuldade
        points = Math.round(points * this.multiplier);
        
        this.score += points;
        
        // Efeito visual de pontos
        this.showScoreAnimation(points);
    }

    showScoreAnimation(points) {
        const scorePopup = document.createElement('div');
        scorePopup.className = 'score-popup';
        scorePopup.textContent = `+${points}`;
        scorePopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: bold;
            color: var(--success);
            background: rgba(16, 185, 129, 0.1);
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 1000;
            animation: scoreFloat 1s ease-out forwards;
        `;
        
        document.body.appendChild(scorePopup);
        
        setTimeout(() => {
            document.body.removeChild(scorePopup);
        }, 1000);
    }

    // ✅ TAREFA: Atualizar estatísticas em tempo real
    updateStats() {
        this.movesCount.textContent = this.moves;
        this.pairsCount.textContent = `${this.matchedPairs}/${this.totalPairs}`;
        this.currentScore.textContent = this.score;
        
        // Calcular eficiência
        const efficiency = this.totalPairs > 0 ? 
            Math.round((this.matchedPairs / this.moves) * 100) || 0 : 0;
        this.efficiency.textContent = `${efficiency}%`;
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

    // ✅ TAREFA: Cálculo final da pontuação
    calculateFinalScore() {
        const config = this.difficultySettings[this.currentDifficulty];
        let finalScore = this.score;
        
        // Bônus de tempo
        const gameTime = Math.floor((new Date() - this.startTime) / 1000);
        const timeBonus = Math.max(0, config.timeBonus - Math.floor(gameTime / 10));
        finalScore += timeBonus;
        
        // Bônus por jogo perfeito (mínimo de jogadas)
        const minPossibleMoves = this.totalPairs * 2;
        if (this.moves <= minPossibleMoves) {
            finalScore += config.perfectBonus;
        }
        
        return finalScore;
    }

    endGame() {
        this.stopTimer();
        this.gameStarted = false;
        
        const finalScore = this.calculateFinalScore();
        const gameTime = this.timer.textContent;
        
        setTimeout(() => {
            this.showResults(finalScore, gameTime);
        }, 1000);
    }

    showResults(finalScore, gameTime) {
        const resultsHTML = `
            <div class="results-overlay">
                <div class="results-card">
                    <h2>🎉 Parabéns!</h2>
                    <div class="results-stats">
                        <div class="result-item">
                            <span>Pontuação Final:</span>
                            <strong>${finalScore}</strong>
                        </div>
                        <div class="result-item">
                            <span>Jogadas:</span>
                            <span>${this.moves}</span>
                        </div>
                        <div class="result-item">
                            <span>Tempo:</span>
                            <span>${gameTime}</span>
                        </div>
                        <div class="result-item">
                            <span>Dificuldade:</span>
                            <span>${this.difficultyBadge.textContent}</span>
                        </div>
                    </div>
                    <div class="results-actions">
                        <button onclick="window.memoryGame.restartGame()" class="btn btn-primary">
                            🎮 Jogar Novamente
                        </button>
                        <button onclick="window.memoryGame.showDifficultySelection()" class="btn btn-ghost">
                            📊 Nova Dificuldade
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', resultsHTML);
    }

    restartGame() {
        // Remover overlay de resultados se existir
        const resultsOverlay = document.querySelector('.results-overlay');
        if (resultsOverlay) {
            resultsOverlay.remove();
        }
        
        this.stopTimer();
        this.startGame(this.currentDifficulty);
    }
}

// Inicializar o jogo
document.addEventListener('DOMContentLoaded', () => {
    window.memoryGame = new MemoryGame();
});