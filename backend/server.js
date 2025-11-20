const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MIDDLEWARE CORRIGIDO
app.use(helmet({
    contentSecurityPolicy: false // Desabilita CSP para evitar conflitos
}));

// ✅ CORS CONFIGURADO PARA PRODUÇÃO
app.use(cors({
    origin: [
        'https://seu-site.netlify.app', // SEU SITE NO NETLIFY
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// ✅ REMOVIDO: app.use(express.static('../frontend')); // Isso causa problemas

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/memory-game';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// Model do Ranking
const rankingSchema = new mongoose.Schema({
    playerName: { type: String, required: true, trim: true },
    score: { type: Number, required: true },
    moves: { type: Number, required: true },
    time: { type: String, required: true },
    difficulty: { type: String, required: true },
    efficiency: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    ip: { type: String }
});

const Ranking = mongoose.model('Ranking', rankingSchema);

// ✅ ROTA DE TESTE
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 API do Jogo da Memória funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Rotas da API
app.get('/api/ranking/global', async (req, res) => {
    try {
        const rankings = await Ranking.find()
            .sort({ score: -1, moves: 1, time: 1 })
            .limit(100)
            .select('playerName score moves time difficulty efficiency date');
        
        res.json(rankings);
    } catch (error) {
        console.error('Erro ao buscar ranking global:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking global' });
    }
});

app.get('/api/ranking/player/:playerName', async (req, res) => {
    try {
        const rankings = await Ranking.find({ 
            playerName: new RegExp(req.params.playerName, 'i') 
        })
        .sort({ score: -1, date: -1 })
        .limit(20);
        
        res.json(rankings);
    } catch (error) {
        console.error('Erro ao buscar ranking do jogador:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking do jogador' });
    }
});

app.post('/api/ranking', async (req, res) => {
    try {
        const { playerName, score, moves, time, difficulty, efficiency } = req.body;
        
        // Validações básicas
        if (!playerName || playerName.trim().length < 2 || playerName.trim().length > 20) {
            return res.status(400).json({ error: 'Nome deve ter entre 2 e 20 caracteres' });
        }
        
        if (score < 0 || moves < 0) {
            return res.status(400).json({ error: 'Dados inválidos' });
        }

        const ip = req.ip || req.connection.remoteAddress;
        
        // Prevenir spam: máximo 10 registros por IP por hora
        const recentSubmissions = await Ranking.countDocuments({
            ip: ip,
            date: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        });
        
        if (recentSubmissions >= 10) {
            return res.status(429).json({ error: 'Muitas submissões recentes. Tente novamente mais tarde.' });
        }

        const newRanking = new Ranking({
            playerName: playerName.trim(),
            score,
            moves,
            time,
            difficulty,
            efficiency,
            ip
        });

        await newRanking.save();
        res.status(201).json({ message: 'Pontuação salva com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
        res.status(500).json({ error: 'Erro ao salvar pontuação' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ✅ MIDDLEWARE DE ERRO
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ✅ ROTA 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 API disponível em: http://localhost:${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});