// game.js - Sistema Completo com Ranking Global Organizado por Dificuldade
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
        this.musicEnabled = true;
        this.musicStarted = false;
        this.playerName = '';
        this.audioContext = null;
        this.soundBuffers = {};

        // ✅ CONFIGURAÇÃO DO SUPABASE
        this.supabaseConfig = {
            url: 'https://nrvbpipvxyyuwjrjccjk.supabase.co',
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydmJwaXB2eHl5dXdqcmpjY2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDgxMTQsImV4cCI6MjA3OTUyNDExNH0.COITQUYgEpqbUYa_FmNx4MrxsgIb9mdAu-qgWTu5HWY',
            table: 'global_ranking'
        };

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
        this.musicToggle = document.getElementById('musicToggle');
        this.soundLoader = document.getElementById('soundLoader');
        this.visualEffects = document.getElementById('visualEffects');

        // Elementos de áudio
        this.sounds = {
            background: document.getElementById('musica_fundo')
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

        // ✅ VERIFICAR SE DEVE INICIAR MÚSICA
        const shouldStartMusic = localStorage.getItem('memoryGameStartMusic');
        if (shouldStartMusic === 'true') {
            this.musicStarted = false;
            this.musicEnabled = true;
            localStorage.removeItem('memoryGameStartMusic');
        }

        // ✅ CARREGAR CONFIGURAÇÕES SALVAS
        this.loadSettings();

        // ✅ INICIAR SISTEMA DE ÁUDIO
        await this.initAudioSystem();
        
        // ✅ CONFIGURAR EVENT LISTENERS
        this.setupEventListeners();
        this.showDifficultySelection();
        
        // ✅ ATUALIZAR BOTÕES DE SOM E MÚSICA
        this.updateSoundButton();
        this.updateMusicButton();
        
        if (shouldStartMusic === 'true') {
            this.startBackgroundMusic();
        }
    }

    // ✅ SISTEMA DE ÁUDIO (mantido igual)
    async initAudioSystem() {
        try {
            this.soundLoader.style.display = 'flex';
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.loadBackgroundMusic();
            await this.loadSoundEffects();
        } catch (error) {
            console.warn('Erro ao carregar sistema de áudio:', error);
        } finally {
            this.soundLoader.style.display = 'none';
        }
    }

    async loadBackgroundMusic() {
        return new Promise((resolve) => {
            const music = this.sounds.background;
            if (music.readyState >= 3) {
                resolve();
            } else {
                music.addEventListener('canplaythrough', () => resolve(), { once: true });
                music.load();
            }
            setTimeout(resolve, 3000);
        });
    }

    async loadSoundEffects() {
        const soundFiles = {
            flip: 'sounds/flip.mp3',
            match: 'sounds/match.mp3', 
            mismatch: 'sounds/mismatch.mp3',
            victory: 'sounds/victory.mp3',
            click: 'sounds/click.mp3'
        };

        const loadPromises = Object.entries(soundFiles).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.soundBuffers[name] = audioBuffer;
            } catch (error) {
                console.warn(`❌ Erro ao carregar som ${name}:`, error);
                this.createFallbackSound(name);
            }
        });

        await Promise.all(loadPromises);
    }

    createFallbackSound(type) {
        try {
            const buffer = this.audioContext.createBuffer(1, 22050, 22050);
            const data = buffer.getChannelData(0);
            let frequency = 440;
            switch(type) {
                case 'flip': frequency = 523; break;
                case 'match': frequency = 659; break;
                case 'mismatch': frequency = 392; break;
                case 'victory': frequency = 784; break;
                case 'click': frequency = 330; break;
            }
            for (let i = 0; i < 22050; i++) {
                data[i] = Math.sin(2 * Math.PI * frequency * i / 22050) * 0.5;
            }
            this.soundBuffers[type] = buffer;
        } catch (error) {
            console.warn(`❌ Não foi possível criar fallback para ${type}`);
        }
    }

    // ✅ CONFIGURAÇÕES (mantido igual)
    loadSettings() {
        const savedMusic = localStorage.getItem('memoryGameMusic');
        if (savedMusic !== null) this.musicEnabled = JSON.parse(savedMusic);
        const savedSound = localStorage.getItem('memoryGameSound');
        if (savedSound !== null) this.soundEnabled = JSON.parse(savedSound);
    }

    saveSettings() {
        localStorage.setItem('memoryGameMusic', JSON.stringify(this.musicEnabled));
        localStorage.setItem('memoryGameSound', JSON.stringify(this.soundEnabled));
    }

    // ✅ EVENT LISTENERS (mantido igual)
    setupEventListeners() {
        this.backBtn.addEventListener('click', () => {
            this.playSound('click');
            this.stopBackgroundMusic();
            setTimeout(() => window.location.href = 'index.html', 200);
        });

        this.restartBtn.addEventListener('click', () => {
            this.playSound('click');
            this.startBackgroundMusicOnInteraction();
            this.restartGame();
        });

        this.changeDifficultyBtn.addEventListener('click', () => {
            this.playSound('click');
            this.startBackgroundMusicOnInteraction();
            this.showDifficultySelection();
        });

        this.soundToggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.updateSoundButton();
            this.playSound('click');
            this.startBackgroundMusicOnInteraction();
            this.saveSettings();
        });

        if (this.musicToggle) {
            this.musicToggle.addEventListener('click', () => {
                this.playSound('click');
                this.startBackgroundMusicOnInteraction();
                this.musicEnabled = !this.musicEnabled;
                if (this.musicEnabled) {
                    this.startBackgroundMusic();
                } else {
                    this.stopBackgroundMusic();
                }
                this.updateMusicButton();
                this.saveSettings();
            });
        }

        document.querySelectorAll('.difficulty-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.playSound('click');
                this.startBackgroundMusicOnInteraction();
                document.querySelectorAll('.difficulty-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.currentTarget.classList.add('selected');
                const difficulty = e.currentTarget.dataset.difficulty;
                this.startGame(difficulty);
            });
        });

        this.setupHapticFeedback();
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeHistory();
                this.closeRanking();
            }
        });
    }

    // ✅ SISTEMA DE ÁUDIO (mantido igual)
    startBackgroundMusicOnInteraction() {
        if (this.musicEnabled && !this.musicStarted) {
            this.musicStarted = true;
            this.startBackgroundMusic();
        }
    }

    updateSoundButton() {
        this.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        this.soundToggle.setAttribute('aria-label', 
            this.soundEnabled ? 'Desativar som' : 'Ativar som');
    }

    updateMusicButton() {
        if (this.musicToggle) {
            if (this.musicEnabled) {
                this.musicToggle.textContent = '🎵';
                this.musicToggle.style.opacity = '1';
                this.musicToggle.setAttribute('aria-label', 'Desativar música de fundo');
            } else {
                this.musicToggle.textContent = '🎵';
                this.musicToggle.style.opacity = '0.5';
                this.musicToggle.setAttribute('aria-label', 'Ativar música de fundo');
            }
        }
    }

    setupHapticFeedback() {
        if ('vibrate' in navigator) {
            this.vibrate = (pattern) => navigator.vibrate(pattern);
        } else {
            this.vibrate = () => {};
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        const buffer = this.soundBuffers[type];
        if (buffer) {
            try {
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                source.buffer = buffer;
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                gainNode.gain.value = 0.7;
                source.start(0);
            } catch (error) {
                console.warn(`❌ Erro ao reproduzir som ${type}:`, error);
            }
        }
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) return;
        const music = this.sounds.background;
        if (music && music.readyState >= 2) {
            try {
                music.volume = 0.3;
                music.loop = true;
                music.currentTime = 0;
                const playPromise = music.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.musicStarted = true;
                        this.updateMusicButton();
                    }).catch(error => {
                        console.warn('❌ Erro ao iniciar música de fundo:', error);
                        this.musicStarted = false;
                    });
                }
            } catch (error) {
                console.warn('❌ Erro ao configurar música de fundo:', error);
                this.musicStarted = false;
            }
        }
    }

    stopBackgroundMusic() {
        const music = this.sounds.background;
        if (music) {
            music.pause();
            music.currentTime = 0;
            this.updateMusicButton();
        }
    }

    // ✅ JOGO PRINCIPAL (mantido igual)
    showDifficultySelection() {
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) victoryOverlay.remove();
        const historyOverlay = document.querySelector('.history-overlay');
        if (historyOverlay) historyOverlay.remove();
        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) rankingOverlay.remove();
        
        document.getElementById('difficultySection').style.display = 'block';
        document.getElementById('gameSection').style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.changeDifficultyBtn.style.display = 'none';
        
        document.querySelectorAll('.difficulty-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        this.stopTimer();
        this.gameStarted = false;

        if (this.musicEnabled && this.musicStarted) {
            this.startBackgroundMusic();
        }
    }

    startGame(difficulty) {
        this.startBackgroundMusicOnInteraction();
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

        if (this.musicEnabled && this.musicStarted) {
            this.startBackgroundMusic();
        }
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

    // ✅ SISTEMA DE RANKING GLOBAL - COMPLETAMENTE REORGANIZADO
    async saveGameHistory(finalScore, gameTime, difficulty) {
        try {
            const gameData = {
                playerName: this.playerName,
                score: finalScore,
                time: gameTime,
                moves: this.moves,
                difficulty: difficulty,
                efficiency: this.totalPairs > 0 ? 
                    Math.round((this.matchedPairs / this.moves) * 100) || 0 : 0,
                date: new Date().toISOString()
            };

            // Salvar localmente
            const history = this.getGameHistory();
            history.unshift(gameData);
            const limitedHistory = history.slice(0, 50);
            localStorage.setItem('memoryGameHistory', JSON.stringify(limitedHistory));

            // ✅ SALVAR NO RANKING GLOBAL ONLINE
            await this.saveToSupabaseRanking(gameData);
            
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    // ✅ FUNÇÃO PARA BUSCAR RANKING DO SUPABASE
    async fetchGlobalRanking() {
        try {
            const response = await fetch(
                `${this.supabaseConfig.url}/rest/v1/${this.supabaseConfig.table}?select=player_name,score,moves,game_time,difficulty,efficiency,created_at&score=gt.0&order=score.desc,moves.asc&limit=100`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': this.supabaseConfig.key,
                        'Authorization': `Bearer ${this.supabaseConfig.key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Converter formato do Supabase
            const formattedRanking = data
                .filter(player => player && player.player_name && player.player_name.trim() !== '' && player.score > 0)
                .map((player, index) => ({
                    rank: index + 1,
                    playerName: (player.player_name || 'Jogador').trim(),
                    score: parseInt(player.score) || 0,
                    moves: parseInt(player.moves) || 0,
                    time: player.game_time || '00:00',
                    difficulty: player.difficulty || 'easy',
                    efficiency: parseFloat(player.efficiency) || 0,
                    date: player.created_at || new Date().toISOString()
                }))
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return a.moves - b.moves;
                });
            
            return formattedRanking;
            
        } catch (error) {
            console.warn('❌ Erro ao buscar ranking online:', error);
            return this.getLocalRankingFallback();
        }
    }

    // ✅ FUNÇÃO PRINCIPAL DO RANKING - ABAS SEPARADAS
    async showGlobalRanking(source = 'menu') {
        try {
            this.showNotification('🔄 Carregando ranking global...', 'info');
            const globalRanking = await this.fetchGlobalRanking();
            const currentPlayer = this.playerName;
            this.closeNotification();
            
            if (!globalRanking || globalRanking.length === 0) {
                this.showEmptyRanking();
                return;
            }
            
            // ✅ FILTRAR POR DIFICULDADE
            const easyRanking = this.getRankingByDifficulty(globalRanking, 'easy');
            const mediumRanking = this.getRankingByDifficulty(globalRanking, 'medium');
            const hardRanking = this.getRankingByDifficulty(globalRanking, 'hard');
            
            const rankingHTML = `
                <div class="ranking-overlay">
                    <div class="ranking-card">
                        <div class="ranking-header">
                            <h2>🏆 Ranking Global</h2>
                            <div class="ranking-status">
                                <span class="online-badge">🌐 SUPABASE</span>
                                <span class="players-count">${globalRanking.length} jogadores</span>
                            </div>
                            <button class="btn-close" onclick="window.memoryGame.closeRanking()" aria-label="Fechar ranking">
                                ×
                            </button>
                        </div>
                        
                        <div class="ranking-tabs-container">
                            <div class="ranking-tabs-buttons">
                                <button class="tab-button active" data-tab="easy">
                                    🌱 Fácil
                                    <span class="tab-count">${easyRanking.length}</span>
                                </button>
                                <button class="tab-button" data-tab="medium">
                                    🎯 Médio
                                    <span class="tab-count">${mediumRanking.length}</span>
                                </button>
                                <button class="tab-button" data-tab="hard">
                                    🔥 Difícil
                                    <span class="tab-count">${hardRanking.length}</span>
                                </button>
                            </div>
                            
                            <div class="ranking-tabs-content">
                                <div class="tab-content active" data-tab="easy">
                                    ${this.generateRankingList(easyRanking, currentPlayer, 'easy')}
                                </div>
                                <div class="tab-content" data-tab="medium">
                                    ${this.generateRankingList(mediumRanking, currentPlayer, 'medium')}
                                </div>
                                <div class="tab-content" data-tab="hard">
                                    ${this.generateRankingList(hardRanking, currentPlayer, 'hard')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="ranking-stats">
                            <div class="stat">
                                <span class="stat-value">${globalRanking.length}</span>
                                <span class="stat-label">Total Jogadores</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${this.getPlayerRank(globalRanking, currentPlayer) || '-'}</span>
                                <span class="stat-label">Sua Posição Geral</span>
                            </div>
                        </div>
                        
                        <div class="ranking-actions">
                            <button onclick="window.memoryGame.closeRanking()" class="btn btn-ghost">
                                Fechar
                            </button>
                            <button onclick="window.memoryGame.refreshRanking()" class="btn btn-secondary">
                                🔄 Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            this.closeRanking();
            document.body.insertAdjacentHTML('beforeend', rankingHTML);
            
            // ✅ CONFIGURAR AS ABAS
            this.setupRankingTabs();
            
        } catch (error) {
            console.error('❌ Erro ao carregar ranking:', error);
            this.showNotification('❌ Erro ao carregar ranking global', 'error');
            this.showEmptyRanking();
        }
    }

    // ✅ OBTER RANKING POR DIFICULDADE
    getRankingByDifficulty(ranking, difficulty) {
        return ranking
            .filter(player => player.difficulty === difficulty)
            .sort((a, b) => {
                // Ordenar por score (decrescente) e depois por moves (crescente)
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.moves - b.moves;
            })
            .slice(0, 50); // Limitar a 50 melhores por categoria
    }

    // ✅ CONFIGURAR ABAS DO RANKING
    setupRankingTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Remover classe active de todos os botões e conteúdos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Adicionar classe active no botão e conteúdo clicados
                button.classList.add('active');
                document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
            });
        });
    }

    // ✅ GERAR LISTA DE RANKING
    generateRankingList(ranking, currentPlayer, difficulty) {
        if (ranking.length === 0) {
            return `
                <div class="empty-ranking-tab">
                    <div class="empty-icon">🎯</div>
                    <h3>Nenhuma pontuação no nível ${this.getDifficultyName(difficulty)}</h3>
                    <p>Seja o primeiro a marcar pontos nesta dificuldade!</p>
                </div>
            `;
        }

        return `
            <div class="ranking-list-container">
                <div class="ranking-list-header">
                    <h3>🏅 Melhores Jogadores - ${this.getDifficultyName(difficulty)}</h3>
                    <div class="ranking-stats-mini">
                        <span>${ranking.length} jogadores</span>
                        <span>•</span>
                        <span>Recorde: ${ranking[0]?.score || 0} pontos</span>
                    </div>
                </div>
                <div class="ranking-list">
                    ${ranking.map((player, index) => `
                        <div class="ranking-item ${player.playerName === currentPlayer ? 'current-player' : ''} ${index < 3 ? `top-${index + 1}` : ''}">
                            <div class="ranking-position">
                                ${this.getRankingMedal(index + 1)}
                            </div>
                            <div class="ranking-player-info">
                                <div class="player-name">
                                    ${player.playerName}
                                    ${player.playerName === currentPlayer ? '<span class="you-badge">Você</span>' : ''}
                                </div>
                                <div class="player-stats">
                                    <span class="stat-score">${player.score} pontos</span>
                                    <span class="stat-moves">${player.moves} jogadas</span>
                                    <span class="stat-time">${player.time}</span>
                                </div>
                            </div>
                            <div class="ranking-details">
                                <div class="player-efficiency">
                                    ${player.efficiency}% eficiência
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ✅ FUNÇÃO PARA RANKING VAZIO
    showEmptyRanking() {
        const emptyHTML = `
            <div class="ranking-overlay">
                <div class="ranking-card">
                    <div class="ranking-header">
                        <h2>🏆 Ranking Global</h2>
                        <div class="ranking-status">
                            <span class="online-badge">🌐 SUPABASE</span>
                            <span class="players-count">0 jogadores</span>
                        </div>
                        <button class="btn-close" onclick="window.memoryGame.closeRanking()" aria-label="Fechar ranking">
                            ×
                        </button>
                    </div>
                    
                    <div class="ranking-content-empty">
                        <div class="empty-ranking">
                            <div class="empty-icon">🎯</div>
                            <h3>Nenhuma pontuação no ranking ainda</h3>
                            <p>Seja o primeiro a marcar pontos!</p>
                        </div>
                    </div>
                    
                    <div class="ranking-actions">
                        <button onclick="window.memoryGame.closeRanking()" class="btn btn-ghost">
                            Fechar
                        </button>
                        <button onclick="window.memoryGame.refreshRanking()" class="btn btn-secondary">
                            🔄 Atualizar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.closeRanking();
        document.body.insertAdjacentHTML('beforeend', emptyHTML);
    }

    refreshRanking() {
        this.closeRanking();
        setTimeout(() => this.showGlobalRanking('refresh'), 300);
    }

    // ✅ SALVAR NO SUPABASE RANKING (mantido igual)
    async saveToSupabaseRanking(gameData) {
        try {
            const supabaseData = {
                player_name: gameData.playerName,
                score: gameData.score,
                moves: gameData.moves,
                game_time: gameData.time,
                difficulty: gameData.difficulty,
                efficiency: gameData.efficiency,
                created_at: new Date().toISOString()
            };

            const response = await fetch(
                `${this.supabaseConfig.url}/rest/v1/${this.supabaseConfig.table}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': this.supabaseConfig.key,
                        'Authorization': `Bearer ${this.supabaseConfig.key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(supabaseData)
                }
            );

            if (response.ok) {
                this.showNotification('🎉 Pontuação salva no ranking!', 'success');
                return true;
            } else if (response.status === 409) {
                return await this.updateExistingPlayer(gameData);
            } else {
                throw new Error(`Falha ao salvar: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar no Supabase:', error);
            this.showNotification('⚠️ Ranking salvo localmente', 'info');
            this.saveToLocalRanking(gameData);
            return false;
        }
    }

    // ✅ ATUALIZAR JOGADOR EXISTENTE (mantido igual)
    async updateExistingPlayer(gameData) {
        try {
            const searchResponse = await fetch(
                `${this.supabaseConfig.url}/rest/v1/${this.supabaseConfig.table}?player_name=eq.${encodeURIComponent(gameData.playerName)}&difficulty=eq.${gameData.difficulty}&select=id,score`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': this.supabaseConfig.key,
                        'Authorization': `Bearer ${this.supabaseConfig.key}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!searchResponse.ok) {
                throw new Error('Falha ao buscar jogador existente');
            }

            const existingPlayers = await searchResponse.json();
            if (existingPlayers.length === 0) {
                throw new Error('Jogador não encontrado para atualização');
            }

            const existingPlayer = existingPlayers[0];
            
            if (gameData.score > existingPlayer.score) {
                const updateResponse = await fetch(
                    `${this.supabaseConfig.url}/rest/v1/${this.supabaseConfig.table}?id=eq.${existingPlayer.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': this.supabaseConfig.key,
                            'Authorization': `Bearer ${this.supabaseConfig.key}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            score: gameData.score,
                            moves: gameData.moves,
                            game_time: gameData.time,
                            efficiency: gameData.efficiency,
                            created_at: new Date().toISOString()
                        })
                    }
                );

                if (updateResponse.ok) {
                    this.showNotification('🎉 Nova pontuação recorde!', 'success');
                    return true;
                } else {
                    throw new Error('Falha ao atualizar jogador');
                }
            } else {
                this.showNotification('Pontuação salva!', 'info');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar jogador:', error);
            throw error;
        }
    }

    // ✅ FALLBACK LOCAL (mantido igual)
    saveToLocalRanking(gameData) {
        try {
            const localRanking = JSON.parse(localStorage.getItem('memoryGameGlobalRanking') || '[]');
            const playerIndex = localRanking.findIndex(player => 
                player.playerName === gameData.playerName && 
                player.difficulty === gameData.difficulty
            );

            if (playerIndex !== -1) {
                if (gameData.score > localRanking[playerIndex].score) {
                    localRanking[playerIndex] = {
                        ...localRanking[playerIndex],
                        ...gameData,
                        date: new Date().toISOString()
                    };
                }
            } else {
                localRanking.push({
                    ...gameData,
                    date: new Date().toISOString()
                });
            }

            localRanking.sort((a, b) => b.score - a.score);
            const limitedRanking = localRanking.slice(0, 100);
            localStorage.setItem('memoryGameGlobalRanking', JSON.stringify(limitedRanking));
            
        } catch (error) {
            console.error('❌ Erro no fallback local:', error);
        }
    }

    getLocalRankingFallback() {
        try {
            return JSON.parse(localStorage.getItem('memoryGameGlobalRanking') || '[]');
        } catch {
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

    // ✅ FUNÇÕES AUXILIARES
    getRankingMedal(position) {
        switch(position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${position}`;
        }
    }

    getPlayerRank(ranking, playerName) {
        const playerIndex = ranking.findIndex(player => player.playerName === playerName);
        return playerIndex !== -1 ? playerIndex + 1 : null;
    }

    getDifficultyName(difficulty) {
        const names = {
            easy: 'Fácil',
            medium: 'Médio',
            hard: 'Difícil'
        };
        return names[difficulty] || difficulty;
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

    closeNotification() {
        const notification = document.querySelector('.notification');
        if (notification) {
            notification.remove();
        }
    }

    endGame() {
        this.stopTimer();
        this.gameStarted = false;
        this.playSound('victory');
        this.vibrate([100, 50, 100, 50, 100]);
        this.createConfettiEffect();
        
        const finalScore = this.calculateFinalScore();
        const gameTime = this.timer.textContent;
        
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

    showVictoryMessage(finalScore, gameTime) {
        const performance = this.calculatePerformance();
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
        this.setupVictoryButtons();
        
        setTimeout(() => {
            const victoryCard = document.querySelector('.victory-card');
            victoryCard.style.transform = 'scale(1)';
            victoryCard.style.opacity = '1';
        }, 100);
    }

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
                        this.showGlobalRanking('victory');
                        break;
                    case 'difficulty':
                        this.showDifficultySelection();
                        break;
                }
            });
        }
    }

    showHistory() {
        const history = this.getGameHistory();
        const playerHistory = history.filter(game => game.playerName === this.playerName);
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
                        <button onclick="window.memoryGame.showGlobalRanking('history')" class="btn btn-warning">
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
        if (this.gameStarted) {
            document.getElementById('gameSection').style.display = 'block';
            document.getElementById('difficultySection').style.display = 'none';
            this.restartBtn.style.display = 'block';
            this.changeDifficultyBtn.style.display = 'block';
        }
    }

    closeRanking() {
        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) {
            rankingOverlay.remove();
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

    restartGame() {
        const victoryOverlay = document.querySelector('.victory-overlay');
        if (victoryOverlay) victoryOverlay.remove();
        const historyOverlay = document.querySelector('.history-overlay');
        if (historyOverlay) historyOverlay.remove();
        const rankingOverlay = document.querySelector('.ranking-overlay');
        if (rankingOverlay) rankingOverlay.remove();
        
        this.stopTimer();
        
        if (this.musicEnabled && this.musicStarted) {
            this.startBackgroundMusic();
        }
        
        if (this.currentDifficulty) {
            this.startGame(this.currentDifficulty);
        } else {
            this.showDifficultySelection();
        }
    }

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

    clearGameHistory() {
        try {
            localStorage.removeItem('memoryGameHistory');
            this.showNotification('Histórico limpo com sucesso!', 'success');
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
}

// Inicializar o jogo
document.addEventListener('DOMContentLoaded', () => {
    window.memoryGame = new MemoryGame();
});