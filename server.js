const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Store lobbies
let lobbies = {};

// Clean up old lobbies every 5 minutes
setInterval(() => {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes
    
    Object.keys(lobbies).forEach(lobbyId => {
        if (now - lobbies[lobbyId].timestamp > timeout) {
            console.log(`Removed expired lobby: ${lobbyId}`);
            delete lobbies[lobbyId];
        }
    });
}, 5 * 60 * 1000);

// ✅ Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Matchmaking Server is running!',
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /health',
            register: 'POST /register',
            lobbies: 'GET /lobbies',
            lobbyById: 'GET /lobby/:lobbyId'
        }
    });
});

// ✅ Health endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        activeLobbies: Object.keys(lobbies).length,
        timestamp: new Date().toISOString()
    });
});

// ✅ Register lobby
app.post('/register', (req, res) => {
    try {
        const { lobbyId, hostPublicIp, hostLocalPort } = req.body;
        
        if (!lobbyId || !hostPublicIp || !hostLocalPort) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        lobbies[lobbyId] = { 
            lobbyId: lobbyId,  // Include lobbyId in the stored object
            ip: hostPublicIp, 
            port: hostLocalPort,
            timestamp: Date.now()
        };
        
        console.log(`✅ Registered lobby ${lobbyId} @ ${hostPublicIp}:${hostLocalPort}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ✅ Get lobby info by ID
app.get('/lobby/:lobbyId', (req, res) => {
    try {
        const lobbyId = req.params.lobbyId;
        const info = lobbies[lobbyId];
        
        if (!info) {
            return res.status(404).json({ error: 'Lobby not found' });
        }
        
        // Update timestamp when accessed
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

// ✅ NEW: Get all active lobbies (for InternetLobbyUI)
app.get('/lobbies', (req, res) => {
    try {
        // Convert lobbies object to array
        const lobbyList = Object.keys(lobbies).map(lobbyId => ({
            lobbyId: lobbyId,
            ip: lobbies[lobbyId].ip,
            port: lobbies[lobbyId].port,
            timestamp: lobbies[lobbyId].timestamp
        }));
        
        console.log(`📋 Returning ${lobbyList.length} active lobbies`);
        res.json(lobbyList);
    } catch (error) {
        console.error('Lobbies list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ✅ Optional: Delete lobby endpoint (for manual cleanup)
app.delete('/lobby/:lobbyId', (req, res) => {
    try {
        const lobbyId = req.params.lobbyId;
        
        if (lobbies[lobbyId]) {
            delete lobbies[lobbyId];
            console.log(`🗑️  Deleted lobby: ${lobbyId}`);
            res.json({ success: true, message: 'Lobby deleted' });
        } else {
            res.status(404).json({ error: 'Lobby not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ✅ 404 handler - Must be LAST
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /',
            'GET /health', 
            'POST /register',
            'GET /lobbies',
            'GET /lobby/:id',
            'DELETE /lobby/:id'
        ]
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Matchmaking server running on port ${PORT}`);
    console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`📋 Lobbies list: http://0.0.0.0:${PORT}/lobbies`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    process.exit(0);
});