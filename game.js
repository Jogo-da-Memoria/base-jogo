// game.js - Sistema Completo de Feedback Visual e Sonssssoro (VERSÃO CORRIGIDA)
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
        this.soundEnabled = true;

        // Configurações de dificuldade
        this.difficultySettings = {
            easy: { pairs: 4, columns: 'cards-4', multiplier: 1.0, baseScore: 100, timeBonus: 50, perfectBonus: 200 },
            medium: { pairs: 6, columns: 'cards-6', multiplier: 1.5, baseScore: 150, timeBonus: 75, perfectBonus: 300 },
            hard: { pairs: 8, columns: 'cards-8', multiplier: 2.0, baseScore: 200, timeBonus: 100, perfectBonus: 400 }
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
        this.soundToggle = document.getElementById('soundToggle');
        this.soundLoader = document.getElementById('soundLoader');
        this.visualEffects = document.getElementById('visualEffects');

        // Elementos de áudio
        this.sounds = {
            flip: document.getElementById('flipSound'),
            match: document.getElementById('matchSound'),
            mismatch: document.getElementById('mismatchSound'),
            victory: document.getElementById('victorySound'),
            click: document.getElementById('clickSound')
        };

        this.init(); 
    }

    async init() {
        await this.preloadSounds();
        this.setupEventListeners();
        this.showDifficultySelection();
    }

    // ✅ PRÉ-CARREGAR SONS
    async preloadSounds() {
        try {
            this.soundLoader.style.display = 'flex';
            
            const loadPromises = Object.values(this.sounds).map(sound => {
                return new Promise((resolve) => {
                    sound.addEventListener('canplaythrough', () => resolve(), { once: true });
                    sound.load();
                    setTimeout(resolve, 2000);
                });
            });

            await Promise.all(loadPromises);
            this.setupFallbackSounds();
            
        } catch (error) {
            console.warn('Erro ao carregar sons:', error);
            this.setupFallbackSounds();
        } finally {
            this.soundLoader.style.display = 'none';
        }
    }

    setupFallbackSounds() {
        if (!this.sounds.flip.src) {
            console.log('Usando sons alternativos...');
        }
    }

    setupEventListeners() {
        this.backBtn.addEventListener('click', () => {
            this.playSound('click');
            setTimeout(() => window.location.href = 'index.html', 200);
        });

        this.restartBtn.addEventListener('click', () => {
            this.playSound('click');
            this.restartGame();
        });

        this.changeDifficultyBtn.addEventListener('click', () => {
            this.playSound('click');
            this.showDifficultySelection();
        });

        this.soundToggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.updateSoundButton();
            this.playSound('click');
        });

        document.querySelectorAll('.difficulty-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.playSound('click');
                document.querySelectorAll('.difficulty-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.currentTarget.classList.add('selected');
                const difficulty = e.currentTarget.dataset.difficulty;
                this.startGame(difficulty);
            });
        });

        this.setupHapticFeedback();
    }

    updateSoundButton() {
        this.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        this.soundToggle.setAttribute('aria-label', 
            this.soundEnabled ? 'Desativar som' : 'Ativar som');
    }

    setupHapticFeedback() {
        if ('vibrate' in navigator) {
            this.vibrate = (pattern) => navigator.vibrate(pattern);
        } else {
            this.vibrate = () => {};
        }
    }

    // ✅ SISTEMA DE SONS
    playSound(type) {
        if (!this.soundEnabled) return;

        const sound = this.sounds[type];
        if (sound && sound.readyState >= 2) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                console.warn(`Erro ao reproduzir som ${type}:`, e);
            });
        }
    }

    showDifficultySelection() {
        document.getElementById('difficultySection').style.display = 'block';
        document.getElementById('gameSection').style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.changeDifficultyBtn.style.display = 'none';
        
        document.querySelectorAll('.difficulty-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    }

    startGame(difficulty) {
        document.getElementById('difficultySection').style.display = 'none';
        document.getElementById('gameSection').style.display = 'block';
        this.restartBtn.style.display = 'block';
        this.changeDifficultyBtn.style.display = 'block';

        this.currentDifficulty = difficulty;
        const config = this.difficultySettings[difficulty];
        this.multiplier = config.multiplier;

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

        const cardValues = this.generateCardValues(config.pairs);
        const shuffledValues = this.shuffleCards(cardValues);
        this.createCards(shuffledValues);

        this.animateBoardEntrance();
    }

    animateBoardEntrance() {
        this.gameBoard.style.opacity = '0';
        this.gameBoard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            this.gameBoard.style.transition = 'all 0.5s ease';
            this.gameBoard.style.opacity = '1';
            this.gameBoard.style.transform = 'scale(1)';
        }, 100);
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

        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('is-flipped') && !card.classList.contains('matched')) {
                card.style.transform = 'scale(1.05)';
            }
        });

        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('is-flipped') && !card.classList.contains('matched')) {
                card.style.transform = 'scale(1)';
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

        this.playSound('flip');
        this.vibrate(50);

        this.flipCardWithAnimation(card, true);
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.canFlip = false;
            
            setTimeout(() => {
                this.checkForMatch();
                this.canFlip = true;
            }, 1000);
        }
    }

    flipCardWithAnimation(card, flip) {
        card.isFlipped = flip;
        
        if (flip) {
            card.element.classList.add('is-flipped');
            this.createSparkleEffect(card.element);
        } else {
            card.element.classList.remove('is-flipped');
            card.element.classList.add('mismatch-shake'); // ✅ CORRIGIDO
            setTimeout(() => {
                card.element.classList.remove('mismatch-shake');
            }, 500);
        }
    }

    createSparkleEffect(element) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-effect';
        sparkle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 12px;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
            animation: sparkleFlash 0.3s ease-out;
            pointer-events: none;
            z-index: 2;
        `;
        
        element.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 300);
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
        this.playSound('match');
        this.vibrate([100, 50, 100]);

        card1.isMatched = true;
        card2.isMatched = true;
        
        card1.element.classList.add('matched');
        card2.element.classList.add('matched');
        
        this.animateMatch(card1, card2);
        
        this.matchedPairs++;
        this.calculateScoreForMatch();
        this.updateStats();
        
        this.flippedCards = [];

        if (this.matchedPairs === this.totalPairs) {
            this.endGame();
        }
    }

    animateMatch(card1, card2) {
        card1.element.style.animation = 'matchPulse 0.6s ease';
        card2.element.style.animation = 'matchPulse 0.6s ease';
        
        this.createConnectionEffect(card1.element, card2.element);
        
        setTimeout(() => {
            card1.element.style.animation = '';
            card2.element.style.animation = '';
        }, 600);
    }

    createConnectionEffect(element1, element2) {
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();
        
        const connection = document.createElement('div');
        connection.className = 'connection-line';
        connection.style.cssText = `
            position: fixed;
            top: ${rect1.top + rect1.height / 2}px;
            left: ${rect1.left + rect1.width / 2}px;
            width: ${Math.hypot(rect2.left - rect1.left, rect2.top - rect1.top)}px;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--success), transparent);
            transform-origin: 0 0;
            transform: rotate(${Math.atan2(rect2.top - rect1.top, rect2.left - rect1.left)}rad);
            animation: connectionGlow 0.5s ease-out;
            pointer-events: none;
            z-index: 1;
        `;
        
        document.body.appendChild(connection);
        setTimeout(() => connection.remove(), 500);
    }

    handleMismatch(card1, card2) {
        this.playSound('mismatch');
        this.vibrate(200);

        card1.element.classList.add('mismatch-shake');
        card2.element.classList.add('mismatch-shake');

        setTimeout(() => {
            this.flipCardWithAnimation(card1, false);
            this.flipCardWithAnimation(card2, false);
            card1.element.classList.remove('mismatch-shake');
            card2.element.classList.remove('mismatch-shake');
            this.flippedCards = [];
        }, 600);
    }

    updateStats() {
        this.movesCount.textContent = this.moves;
        this.pairsCount.textContent = `${this.matchedPairs}/${this.totalPairs}`;
        this.currentScore.textContent = this.score;
        
        const efficiency = this.totalPairs > 0 ? 
            Math.round((this.matchedPairs / this.moves) * 100) || 0 : 0;
        this.efficiency.textContent = `${efficiency}%`;
    }

    calculateScoreForMatch() {
        const config = this.difficultySettings[this.currentDifficulty];
        
        let points = config.baseScore;
        
        const minPossibleMoves = this.totalPairs * 2;
        const efficiency = Math.max(0.5, minPossibleMoves / this.moves);
        points = Math.round(points * efficiency);
        
        points = Math.round(points * this.multiplier);
        
        this.score += points;
        
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

    calculateFinalScore() {
        const config = this.difficultySettings[this.currentDifficulty];
        let finalScore = this.score;
        
        const gameTime = Math.floor((new Date() - this.startTime) / 1000);
        const timeBonus = Math.max(0, config.timeBonus - Math.floor(gameTime / 10));
        finalScore += timeBonus;
        
        const minPossibleMoves = this.totalPairs * 2;
        if (this.moves <= minPossibleMoves) {
            finalScore += config.perfectBonus;
        }
        
        return finalScore;
    }

    endGame() {
        this.stopTimer();
        this.gameStarted = false;
        
        this.playSound('victory');
        this.vibrate([100, 50, 100, 50, 100]);

        this.createConfettiEffect();
        
        const finalScore = this.calculateFinalScore();
        const gameTime = this.timer.textContent;
        
        setTimeout(() => {
            this.showVictoryMessage(finalScore, gameTime);
        }, 1500);
    }

    createConfettiEffect() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${this.getRandomColor()};
                top: -10px;
                left: ${Math.random() * 100}%;
                animation: confettiFall ${1 + Math.random() * 2}s linear forwards;
                border-radius: 2px;
            `;
            confettiContainer.appendChild(confetti);
        }

        document.body.appendChild(confettiContainer);
        setTimeout(() => confettiContainer.remove(), 3000);
    }

    getRandomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    showVictoryMessage(finalScore, gameTime) {
        const performance = this.calculatePerformance();
        
        const victoryHTML = `
            <div class="victory-overlay">
                <div class="victory-card">
                    <div class="victory-header">
                        <div class="victory-icon">🎉</div>
                        <h2>Parabéns!</h2>
                        <p>Você completou o jogo!</p>
                    </div>
                    
                    <div class="victory-stats">
                        <div class="victory-stat">
                            <span class="stat-icon">⭐</span>
                            <div>
                                <strong>${finalScore}</strong>
                                <span>Pontuação Final</span>
                            </div>
                        </div>
                        <div class="victory-stat">
                            <span class="stat-icon">🎯</span>
                            <div>
                                <strong>${this.moves}</strong>
                                <span>Jogadas</span>
                            </div>
                        </div>
                        <div class="victory-stat">
                            <span class="stat-icon">⏱️</span>
                            <div>
                                <strong>${gameTime}</strong>
                                <span>Tempo</span>
                            </div>
                        </div>
                    </div>

                    <div class="performance-rating">
                        <span class="rating-label">Desempenho:</span>
                        <span class="rating-value ${performance.class}">${performance.text}</span>
                    </div>

                    <div class="victory-actions">
                        <button onclick="window.memoryGame.restartGame()" class="btn btn-primary victory-btn">
                            🎮 Jogar Novamente
                        </button>
                        <button onclick="window.memoryGame.showDifficultySelection()" class="btn btn-ghost victory-btn">
                            📊 Nova Dificuldade
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', victoryHTML);
        
        setTimeout(() => {
            const victoryCard = document.querySelector('.victory-card');
            victoryCard.style.transform = 'scale(1)';
            victoryCard.style.opacity = '1';
        }, 100);
    }

    calculatePerformance() {
        const minMoves = this.totalPairs * 2;
        const efficiency = (minMoves / this.moves) * 100;
        
        if (efficiency >= 90) return { text: 'PERFEITO! 🏆', class: 'perfect' };
        if (efficiency >= 75) return { text: 'EXCELENTE! ⭐', class: 'excellent' };
        if (efficiency >= 60) return { text: 'MUITO BOM! 👍', class: 'good' };
        if (efficiency >= 40) return { text: 'BOM! 💪', class: 'average' };
        return { text: 'CONTINUE PRATICANDO! 🌱', class: 'practice' };
    }

    restartGame() {
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) {
            victoryOverlay.remove();
        }
        
        this.stopTimer();
        this.startGame(this.currentDifficulty);
    }
}

// Inicializar o jogo
document.addEventListener('DOMContentLoaded', () => {
    window.memoryGame = new MemoryGame();
});