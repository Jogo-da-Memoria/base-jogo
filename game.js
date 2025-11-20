// game.js - Sistema Completo com Ranking Global e Login
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
        this.playerName = '';

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
        // ✅ VERIFICAR SE O JOGADOR ESTÁ LOGADO
        this.playerName = localStorage.getItem('memoryGamePlayer');
        if (!this.playerName) {
            window.location.href = 'index.html';
            return;
        }

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
        
        // ✅ ADICIONAR EVENT LISTENER PARA FECHAR HISTÓRICO COM ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeHistory();
                this.closeRanking();
            }
        });
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

    // ✅ ATUALIZAR A FUNÇÃO showDifficultySelection PARA LIMPAR OVERLAY
    showDifficultySelection() {
        // Fechar overlay de vitória se existir
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) {
            victoryOverlay.remove();
        }
        
        // Fechar overlay de histórico se existir
        const historyOverlay = document.querySelector('.history-overlay');
        if (historyOverlay) {
            historyOverlay.remove();
        }

        // Fechar overlay de ranking se existir
        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) {
            rankingOverlay.remove();
        }
        
        document.getElementById('difficultySection').style.display = 'block';
        document.getElementById('gameSection').style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.changeDifficultyBtn.style.display = 'none';
        
        document.querySelectorAll('.difficulty-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Parar timer se estiver rodando
        this.stopTimer();
        this.gameStarted = false;
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
            card.element.classList.add('mismatch-shake');
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

    // ✅ SISTEMA DE HISTÓRICO LOCAL - ATUALIZADO COM NOME DO JOGADOR
    saveGameHistory(finalScore, gameTime, difficulty) {
        try {
            const gameData = {
                score: finalScore,
                time: gameTime,
                moves: this.moves,
                difficulty: difficulty,
                date: new Date().toISOString(),
                efficiency: this.totalPairs > 0 ? 
                    Math.round((this.matchedPairs / this.moves) * 100) || 0 : 0,
                pairs: this.totalPairs,
                playerName: this.playerName // ✅ ADICIONAR NOME DO JOGADOR
            };

            // Recuperar histórico existente
            const history = this.getGameHistory();
            
            // Adicionar novo registro
            history.unshift(gameData);
            
            // Manter apenas os últimos 50 registros
            const limitedHistory = history.slice(0, 50);
            
            // Salvar no localStorage
            localStorage.setItem('memoryGameHistory', JSON.stringify(limitedHistory));
            
            // ✅ SALVAR NO RANKING GLOBAL
            this.updateGlobalRanking(gameData);
            
            console.log('Histórico e ranking atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    // ✅ NOVA FUNÇÃO PARA ATUALIZAR RANKING GLOBAL
    updateGlobalRanking(gameData) {
        try {
            const ranking = this.getGlobalRanking();
            const playerIndex = ranking.findIndex(entry => 
                entry.playerName === this.playerName && entry.difficulty === gameData.difficulty
            );

            const rankingEntry = {
                playerName: this.playerName,
                score: gameData.score,
                difficulty: gameData.difficulty,
                moves: gameData.moves,
                time: gameData.time,
                date: gameData.date,
                efficiency: gameData.efficiency
            };

            if (playerIndex !== -1) {
                // Atualizar score se for maior
                if (gameData.score > ranking[playerIndex].score) {
                    ranking[playerIndex] = rankingEntry;
                }
            } else {
                // Adicionar novo jogador ao ranking
                ranking.push(rankingEntry);
            }

            // Ordenar por score (maior para menor)
            ranking.sort((a, b) => b.score - a.score);
            
            // Manter apenas os top 100
            const limitedRanking = ranking.slice(0, 100);
            
            localStorage.setItem('memoryGameGlobalRanking', JSON.stringify(limitedRanking));
            
        } catch (error) {
            console.error('Erro ao atualizar ranking global:', error);
        }
    }

    // ✅ NOVA FUNÇÃO PARA OBTER RANKING GLOBAL
    getGlobalRanking() {
        try {
            const ranking = localStorage.getItem('memoryGameGlobalRanking');
            return ranking ? JSON.parse(ranking) : [];
        } catch (error) {
            console.error('Erro ao recuperar ranking global:', error);
            return [];
        }
    }

    getGameHistory() {
        try {
            const history = localStorage.getItem('memoryGameHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Erro ao recuperar histórico:', error);
            return [];
        }
    }

    clearGameHistory() {
        try {
            localStorage.removeItem('memoryGameHistory');
            this.showNotification('Histórico limpo com sucesso!', 'success');
            // Recarregar a visualização do histórico se estiver aberta
            const historyOverlay = document.querySelector('.history-overlay');
            if (historyOverlay) {
                this.showHistory();
            }
            return true;
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            this.showNotification('Erro ao limpar histórico', 'error');
            return false;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    endGame() {
        this.stopTimer();
        this.gameStarted = false;
        
        this.playSound('victory');
        this.vibrate([100, 50, 100, 50, 100]);

        this.createConfettiEffect();
        
        const finalScore = this.calculateFinalScore();
        const gameTime = this.timer.textContent;
        
        // ✅ SALVAR NO HISTÓRICO E RANKING
        this.saveGameHistory(finalScore, gameTime, this.currentDifficulty);
        
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

    // ✅ ATUALIZAR A VICTORY MESSAGE PARA CORRIGIR O BOTÃO
    showVictoryMessage(finalScore, gameTime) {
        const performance = this.calculatePerformance();
        const ranking = this.getGlobalRanking();
        const playerRank = this.getPlayerRank(ranking);
        
        const victoryHTML = `
            <div class="victory-overlay">
                <div class="victory-card">
                    <div class="victory-header">
                        <div class="victory-icon">🎉</div>
                        <h2>Parabéns, ${this.playerName}!</h2>
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

                    ${playerRank ? `
                    <div class="ranking-info">
                        <span class="ranking-label">Sua posição no ranking:</span>
                        <span class="ranking-position">${this.getRankingMedal(playerRank)}</span>
                    </div>
                    ` : ''}

                    <div class="victory-actions">
                        <button class="btn btn-primary victory-btn" data-action="restart">
                            🎮 Jogar Novamente
                        </button>
                        <button class="btn btn-secondary victory-btn" data-action="history">
                            📊 Meu Histórico
                        </button>
                        <button class="btn btn-warning victory-btn" data-action="ranking">
                            🏆 Ranking Global
                        </button>
                        <button class="btn btn-ghost victory-btn" data-action="difficulty">
                            🔄 Nova Dificuldade
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', victoryHTML);
        
        // ✅ ADICIONAR EVENT LISTENERS AOS BOTÕES
        this.setupVictoryButtons();
        
        setTimeout(() => {
            const victoryCard = document.querySelector('.victory-card');
            victoryCard.style.transform = 'scale(1)';
            victoryCard.style.opacity = '1';
        }, 100);
    }

    // ✅ NOVA FUNÇÃO PARA CONFIGURAR OS BOTÕES DE VITÓRIA
    setupVictoryButtons() {
        const victoryOverlay = document.querySelector('.victory-overlay');
        
        if (victoryOverlay) {
            victoryOverlay.addEventListener('click', (e) => {
                const button = e.target.closest('.victory-btn');
                if (!button) return;
                
                const action = button.dataset.action;
                this.playSound('click');
                
                switch (action) {
                    case 'restart':
                        this.restartGame();
                        break;
                    case 'history':
                        this.showHistory();
                        break;
                    case 'ranking':
                        this.showGlobalRanking();
                        break;
                    case 'difficulty':
                        this.showDifficultySelection();
                        break;
                }
            });
        }
    }

    // ✅ ATUALIZAR A FUNÇÃO showHistory PARA MOSTRAR APENAS DO JOGADOR ATUAL
    showHistory() {
        const history = this.getGameHistory();
        const playerHistory = history.filter(game => game.playerName === this.playerName);
        
        // Fechar overlay de vitória se existir
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) {
            victoryOverlay.remove();
        }
        
        const historyHTML = `
            <div class="history-overlay">
                <div class="history-card">
                    <div class="history-header">
                        <h2>📊 Meu Histórico - ${this.playerName}</h2>
                        <button class="btn-close" onclick="window.memoryGame.closeHistory()" aria-label="Fechar histórico">
                            ×
                        </button>
                    </div>
                    
                    <div class="history-content">
                        ${playerHistory.length === 0 ? 
                            '<div class="empty-history">🎯 Nenhuma partida registrada ainda.<br><br>Jogue uma partida para ver seu histórico!</div>' : 
                            this.generateHistoryList(playerHistory)
                        }
                    </div>
                    
                    <div class="history-actions">
                        ${playerHistory.length > 0 ? 
                            `<button onclick="window.memoryGame.clearIndividualHistory()" class="btn btn-danger">
                                🗑️ Limpar Meu Histórico
                            </button>` : 
                            ''
                        }
                        <button onclick="window.memoryGame.showGlobalRanking()" class="btn btn-warning">
                            🏆 Ver Ranking Global
                        </button>
                        <button onclick="window.memoryGame.closeHistory()" class="btn btn-ghost">
                            Voltar ao Jogo
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', historyHTML);
    }

    // ✅ NOVA FUNÇÃO PARA MOSTRAR RANKING GLOBAL
    showGlobalRanking() {
        const ranking = this.getGlobalRanking();
        
        // Fechar overlays existentes
        this.closeHistory();
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) victoryOverlay.remove();
        
        const rankingHTML = `
            <div class="ranking-overlay">
                <div class="ranking-card">
                    <div class="ranking-header">
                        <h2>🏆 Ranking Global</h2>
                        <button class="btn-close" onclick="window.memoryGame.closeRanking()" aria-label="Fechar ranking">
                            ×
                        </button>
                    </div>
                    
                    <div class="ranking-filters">
                        <button class="filter-btn active" data-filter="all">Todos</button>
                        <button class="filter-btn" data-filter="easy">Fácil</button>
                        <button class="filter-btn" data-filter="medium">Médio</button>
                        <button class="filter-btn" data-filter="hard">Difícil</button>
                    </div>
                    
                    <div class="ranking-content">
                        ${ranking.length === 0 ? 
                            '<div class="empty-ranking">🎯 Nenhuma pontuação no ranking ainda.<br><br>Seja o primeiro a entrar no ranking!</div>' : 
                            this.generateRankingList(ranking, 'all')
                        }
                    </div>
                    
                    <div class="ranking-stats">
                        <div class="stat">
                            <span class="stat-value">${ranking.length}</span>
                            <span class="stat-label">Jogadores</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${ranking[0]?.score || 0}</span>
                            <span class="stat-label">Recorde</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${this.getPlayerRank(ranking) || '-'}</span>
                            <span class="stat-label">Sua Posição</span>
                        </div>
                    </div>
                    
                    <div class="ranking-actions">
                        <button onclick="window.memoryGame.closeRanking()" class="btn btn-ghost">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', rankingHTML);
        this.setupRankingFilters();
    }

    // ✅ FUNÇÃO PARA LIMPAR HISTÓRICO INDIVIDUAL
    clearIndividualHistory() {
        if (confirm('Tem certeza que deseja limpar seu histórico individual?\n\nEsta ação não pode ser desfeita.')) {
            try {
                const history = this.getGameHistory();
                const filteredHistory = history.filter(game => game.playerName !== this.playerName);
                localStorage.setItem('memoryGameHistory', JSON.stringify(filteredHistory));
                this.closeHistory();
                this.showNotification('Seu histórico foi limpo!', 'success');
                setTimeout(() => this.showHistory(), 500);
            } catch (error) {
                this.showNotification('Erro ao limpar histórico', 'error');
            }
        }
    }

    // ✅ FUNÇÕES AUXILIARES PARA RANKING
    generateRankingList(ranking, filter = 'all') {
        const filteredRanking = filter === 'all' 
            ? ranking 
            : ranking.filter(entry => entry.difficulty === filter);
            
        return `
            <div class="ranking-list">
                ${filteredRanking.slice(0, 20).map((player, index) => `
                    <div class="ranking-item ${player.playerName === this.playerName ? 'current-player' : ''} ${index < 3 ? `top-${index + 1}` : ''}">
                        <div class="ranking-position">
                            ${this.getRankingMedal(index + 1)}
                        </div>
                        <div class="ranking-player-info">
                            <div class="player-name">
                                ${player.playerName}
                                ${player.playerName === this.playerName ? '<span class="you-badge">Você</span>' : ''}
                            </div>
                            <div class="player-stats">
                                <span>${player.moves} jogadas</span>
                                <span>•</span>
                                <span>${player.time}</span>
                                <span>•</span>
                                <span>${this.getDifficultyName(player.difficulty)}</span>
                            </div>
                        </div>
                        <div class="ranking-score">
                            ${player.score}
                            <span>pts</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getRankingMedal(position) {
        switch(position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${position}`;
        }
    }

    getPlayerRank(ranking) {
        const playerIndex = ranking.findIndex(player => player.playerName === this.playerName);
        return playerIndex !== -1 ? playerIndex + 1 : null;
    }

    setupRankingFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const rankingContent = document.querySelector('.ranking-content');
        const ranking = this.getGlobalRanking();
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                rankingContent.innerHTML = this.generateRankingList(ranking, filter);
            });
        });
    }

    closeRanking() {
        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) {
            rankingOverlay.remove();
        }
    }

    // ✅ FUNÇÕES AUXILIARES EXISTENTES
    generateHistoryList(history) {
        return `
            <div class="history-list">
                ${history.map((game, index) => `
                    <div class="history-item ${index === 0 ? 'recent' : ''}">
                        <div class="history-game-info">
                            <div class="game-main-stats">
                                <span class="game-score">${game.score} pts</span>
                                <span class="game-difficulty badge-${game.difficulty}">${this.getDifficultyName(game.difficulty)}</span>
                            </div>
                            <div class="game-details">
                                <span>${game.moves} jogadas</span>
                                <span>•</span>
                                <span>${game.time}</span>
                                <span>•</span>
                                <span>${game.efficiency}% eficiência</span>
                            </div>
                            <div class="game-date">
                                ${this.formatDate(game.date)}
                            </div>
                        </div>
                        <div class="history-rank">
                            #${index + 1}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getDifficultyName(difficulty) {
        const names = {
            easy: 'Fácil',
            medium: 'Médio',
            hard: 'Difícil'
        };
        return names[difficulty] || difficulty;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    closeHistory() {
        const historyOverlay = document.querySelector('.history-overlay');
        if (historyOverlay) {
            historyOverlay.remove();
        }
        
        // Se fecharmos o histórico durante o jogo, voltar para o jogo
        if (this.gameStarted) {
            document.getElementById('gameSection').style.display = 'block';
            document.getElementById('difficultySection').style.display = 'none';
            this.restartBtn.style.display = 'block';
            this.changeDifficultyBtn.style.display = 'block';
        }
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

    // ✅ ATUALIZAR A FUNÇÃO restartGame PARA SER MAIS ROBUSTA
    restartGame() {
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) {
            victoryOverlay.remove();
        }
        
        const historyOverlay = document.querySelector('.history-overlay');
        if (historyOverlay) {
            historyOverlay.remove();
        }

        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) {
            rankingOverlay.remove();
        }
        
        this.stopTimer();
        
        // Verificar se há uma dificuldade atual definida
        if (this.currentDifficulty) {
            this.startGame(this.currentDifficulty);
        } else {
            // Se não houver dificuldade definida, voltar para seleção
            this.showDifficultySelection();
        }
    }
}

// Inicializar o jogo
document.addEventListener('DOMContentLoaded', () => {
    window.memoryGame = new MemoryGame();
});