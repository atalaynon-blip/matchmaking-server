// relay.js
import dgram from "dgram";

const RELAY_PORT = process.env.PORT || 9000;
const server = dgram.createSocket("udp4");

const sessions = {}; // lobbyId -> { host, clients[] }

server.on("listening", () => {
  const addr = server.address();
  console.log(`🚀 UDP Relay listening on ${addr.address}:${addr.port}`);
});

server.on("message", (msg, rinfo) => {
  try {
    const txt = msg.toString();

    // Registration packets (JSON)
    if (txt.startsWith("{")) {
      const data = JSON.parse(txt);
      const { type, lobbyId } = data;
      if (!lobbyId) return;

      if (type === "register-host") {
        sessions[lobbyId] = { host: { address: rinfo.address, port: rinfo.port }, clients: [] };
        console.log(`🏠 Host registered for ${lobbyId} from ${rinfo.address}:${rinfo.port}`);
      }

      if (type === "register-client") {
        const sess = sessions[lobbyId];
        if (!sess) {
          console.warn(`⚠️ No host for lobby ${lobbyId}`);
          return;
        }

        sess.clients.push({ address: rinfo.address, port: rinfo.port });
        console.log(`👥 Client joined ${lobbyId} from ${rinfo.address}:${rinfo.port}`);

        // Share connection info both ways
        const toHost = JSON.stringify({ ip: rinfo.address, port: rinfo.port });
        const toClient = JSON.stringify({ ip: sess.host.address, port: sess.host.port });
        server.send(toHost, sess.host.port, sess.host.address);
        server.send(toClient, rinfo.port, rinfo.address);
      }

      return;
    }

    // Data forwarding
    for (const [id, sess] of Object.entries(sessions)) {
      const { host, clients } = sess;
      if (rinfo.address === host.address && rinfo.port === host.port) {
        // host → clients
        clients.forEach(c => server.send(msg, c.port, c.address));
      } else {
        // client → host
        server.send(msg, host.port, host.address);
      }
    }
  } catch (err) {
    console.error("Relay error:", err);
  }
});

server.on("error", err => {
  console.error("UDP server error:", err);
  server.close();
});

server.bind(RELAY_PORT, "0.0.0.0");
