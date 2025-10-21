// Minimal Node.js matchmaking server
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let lobbies = {}; // store { lobbyId: { ip, port } }

app.post('/register', (req, res) => {
    const { lobbyId, ip, port } = req.body;
    if (!lobbyId || !ip || !port) return res.status(400).send('Missing fields');
    lobbies[lobbyId] = { ip, port };
    console.log(`Registered lobby ${lobbyId} @ ${ip}:${port}`);
    res.json({ success: true });
});

app.get('/lobby/:lobbyId', (req, res) => {
    const info = lobbies[req.params.lobbyId];
    if (!info) return res.status(404).send('Lobby not found');
    res.json({ lobbyId: req.params.lobbyId, ip: info.ip, port: info.port });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Matchmaking server listening on port ${PORT}`));
