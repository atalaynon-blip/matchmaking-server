const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Store lobbies
let lobbies = {};

// ✅ FIXED: Add proper root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Matchmaking Server is running!',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// ✅ FIXED: Add health endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        activeLobbies: Object.keys(lobbies).length,
        timestamp: new Date().toISOString()
    });
});

// Register lobby
app.post('/register', (req, res) => {
    try {
        const { lobbyId, hostPublicIp, hostLocalPort } = req.body;
        
        if (!lobbyId || !hostPublicIp || !hostLocalPort) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        lobbies[lobbyId] = { 
            ip: hostPublicIp, 
            port: hostLocalPort,
            timestamp: Date.now()
        };
        
        console.log(`Registered lobby ${lobbyId} @ ${hostPublicIp}:${hostLocalPort}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get lobby info
app.get('/lobby/:lobbyId', (req, res) => {
    try {
        const lobbyId = req.params.lobbyId;
        const info = lobbies[lobbyId];
        
        if (!info) {
            return res.status(404).json({ error: 'Lobby not found' });
        }
        
        // Update timestamp
        info.timestamp = Date.now();
        
        res.json({ 
            lobbyId: lobbyId, 
            ip: info.ip, 
            port: info.port 
        });
    } catch (error) {
        console.error('Lobby lookup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /',
            'GET /health', 
            'POST /register',
            'GET /lobby/:id'
        ]
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Matchmaking server running on port ${PORT}`);
    console.log(`📍 Test URL: https://matchmaking-server-ins6.onrender.com/health`);
});