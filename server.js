const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const zlib = require("zlib");
const { json } = require("stream/consumers");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8081;

app.use(cors({ origin: '*' }));



let sessions = {};
const joinIndex = {};
let players = [];
let nextPlayerId = 1;

const webhookUrl = process.env.WEBHOOK_LOGS_URL;

console.log = (message) => {
  // keep console output
  process.stdout.write(message + "\n");

  // only send if env exists
  if (!webhookUrl) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          description: String(message).slice(0, 4000),
        },
      ],
    }),
  }).catch(() => {
    // fail silently
  });
};



// ---------- helpers ----------
function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function percentSaved(before, after) {
    return ((1 - after / before) * 100).toFixed(3);
}

function compressPayload(jsonString) {
    const input = Buffer.from(jsonString, "utf8");
    const compressed = zlib.deflateRawSync(input, { level: 9 });
    console.log(`Bytes before ${input.length}\nBytes after ${compressed.length}\nCompressed% ${percentSaved(input.length, compressed.length)}%\nPayload sha ${sha256(compressed)}`);
    console.log(jsonString);
    return compressed;
}

function compressString(inputString) {
    const input = Buffer.from(inputString, "utf8");

    const compressed = zlib.deflateRawSync(input, {
        level: 9,
    });

    console.log(
        `Bytes before ${input.length}\n` +
        `Bytes after ${compressed.length}\n` +
        `Compressed% ${percentSaved(input.length, compressed.length)}%\n` +
        `Payload sha ${sha256(compressed)}`
    );

    console.log(`String compressed: ${inputString}`);

    return compressed;
}

function decompressPayload(buffer) {
  console.log(zlib.inflateRawSync(buffer).toString("utf8"));
    return zlib.inflateRawSync(buffer).toString("utf8");
}


// ---------- compress ----------
//function compressPayload(jsonString) {
   // const input = Buffer.from(jsonString, "utf8");

   // const compressed = zlib.brotliCompressSync(input, {
   //     params: {
   //         [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
   //         [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
   //     }
  //  });

    
//
 //   return compressed;
//}

// ---------- decompress ----------
//function decompressPayload(buffer) {
   // const raw = zlib.brotliDecompressSync(buffer);
  //  return raw.toString("utf8");
//}

// ---------- send compressed ----------
function comp_and_send(ws, objectOrString) {
    try {
        if (ws.readyState !== WebSocket.OPEN) {
            console.log("Socket send failed reason: socket not open");
            return false;
        }

        const json =
            typeof objectOrString === "string"
                ? objectOrString
                : JSON.stringify(objectOrString);

        const compressed = compressPayload(json);

        ws.send(compressed, { binary: true }, (err) => {
            if (err) {
                console.log("Socket send failed reason: " + err.message);
            }
        });

        return true;

    } catch (err) {
        console.log("Socket send failed reason: " + err.message);
        return false;
    }
}

// ---------- receive compressed ----------
function decodeIncoming(message) {
    try {
        const json = decompressPayload(message);
        return JSON.parse(json);
    } catch (err) {
        console.log("Socket decode failed reason: " + err.message);
        return null;
    }
}


let genlng = 2;
// Helper function to generate a random 4-character code
function generateCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < genlng; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}
let country_code = "JC";
let ip_is = "null";
function generatePlayerId(req) {
  ip_is = getClientIp(req);
  const ipHash = crypto
    .createHash("sha256")
    .update(ip_is)
    .digest("hex")
    .slice(0, 4);

  const part = () => crypto.randomBytes(2).toString("hex");
  const num = () => Math.floor(1000 + Math.random() * 9000);
  const num2 = () => Math.floor(1000 + Math.random() * 9000);
  return `${ipHash}-${num()}-${part()}-${num2()}`;
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

// Serve all client files (index.html, JS, CSS, etc.)
app.use(express.static(__dirname));
app.get("/wake", (req, res) => {
  res.json({ ok: "ok" });
});
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
riskinfo = "{}";
wss.on('connection', async (ws, req) => {
  ws.playerId = await generatePlayerId(req);
  
  const ip = getClientIp(req);
  const ip_censor = ip.replace(
  /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
  (_, a, b, c, d) => `${a}.###.###`
);
  console.log(`${ip_censor}`);
  players.push(ws);

  // optional geo lookup
  let geo = {};

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    geo = await res.json();
    geo.query = ip_censor;
    const res2 = await fetch(`https://proxycheck.io/v2/${ip}?key=111111-222222-333333-444444&vpn=3&asn=1&risk=2`);
    geo2 = await res2.json();
    geo.risk = {
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy
    }
    riskinfo = JSON.stringify({
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy
    });
    // geo.geo2 = geo2
  } catch (e) {}

  const country = geo.country || "Unknown";
  country_code = geo.countryCode || "JC";
  const region = geo.regionName || "Unknown";
  const city = geo.city || "Unknown";
  const isp = geo.isp || "Unknown";

  // Send welcome
  comp_and_send(ws, JSON.stringify({
    type: 'welcome',
    playerId: ws.playerId,
    "_ip": geo
  }));

  console.log(
    `|| Player ${ws.playerId} connected from ${ip_censor} (${country}) | ${region}, ${city} | ISP: ${isp} | Risk: ${JSON.stringify(geo.risk)}`
  );

  // Send a welcome message with the player's ID
  // comp_and_send(ws, JSON.stringify({ type: 'welcome', playerId: ws.playerId }));
  console.log(`|| Player ${ws.playerId} connected`);
console.log(JSON.stringify({
  player: ws.playerId,
  ip_censor,
  country: geo.country,
  region: geo.regionName,
  city: geo.city,
  isp: geo.isp,
  org: geo.org,
  timezone: geo.timezone,
  proxy: geo.proxy,
  hosting: geo.hosting
}, null, 2));
let sessiondigitLength = 4;
function sessionIdToJoinCode(sessionId, digitLength = 4) {

    // Hash session ID
    const hash = crypto
        .createHash("sha256")
        .update(sessionId)
        .digest();

    // Convert first 4 bytes into number
    const num = hash.readUInt32BE(0);

    // Range for requested digit length
    const min = 10 ** (digitLength - 1);
    const max = 10 ** digitLength;

    // Generate fixed-length code
    return ((num % (max - min)) + min).toString();
}
  ws.on('message', (message) => {
    const msg_is = decompressPayload(message);
    const data = JSON.parse(msg_is);
    const msg =  JSON.stringify(data);
    console.log(`|| Message recived: \`\`\`\n${msg}\`\`\``);

    if (data.type === "createSession") {

    // Internal unique ID
    const sessionId = compressString(`Ip:${ip_censor}-PlayerId:${ws.playerId}(${country_code})-Risk:${riskinfo}`).toString("base64");

    // Human-friendly code
    const joinCode = sessionIdToJoinCode(sessionId, sessiondigitLength);

    sessions[sessionId] = {
        id: sessionId,
        joinCode,
        players: [ws],
        playersReady: 0
    };

    // Fast lookup
    joinIndex[joinCode] = sessionId;

    ws.sessionId = sessionId;

    comp_and_send(ws, JSON.stringify({
        type: "sessionCreated",
        id: sessionId,
        code: joinCode
    }));

    console.log(
        `Session created ${joinCode} -> ${sessionId}`
    );
}

    if (data.type === "cancelSession") {
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`|| Player ${ws.playerId} cancelled Session ${sessionCode}`);
      delete sessions[ws.sessionCode];
    }

    if (data.type === "leaveSession") {
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`|| Player ${ws.playerId} left Session ${sessionCode}`);
      sessions[sessionCode].players = sessions[sessionCode].players.filter(player => player !== ws);
    }

      // manual hand sync dump to opponent





    if (data.type === "joinSession") {

    const joinCode = data.sessionId;

    const sessionId = joinIndex[joinCode];

    if (!sessionId) {
        comp_and_send(ws, JSON.stringify({
            type: "sessionInvalid"
        }));
        return;
    }

    const session = sessions[sessionId];

    if (session.players.length >= 2) {
        comp_and_send(ws, JSON.stringify({
            type: "sessionFull"
        }));
        return;
    }

    session.players.push(ws);

    ws.sessionId = sessionId;

    comp_and_send(ws, JSON.stringify({
        type: "sessionJoined",
        code: joinCode,
        id: sessionId
    }));

    console.log(
        `Player joined ${joinCode}`
    );
}

    if (data.type === "gameStart") {
        if (ws.sessionCode && sessions[ws.sessionCode]) {
            const session = sessions[ws.sessionCode]; 
            if (!sessions[ws.sessionCode]?.firstPlayer) {
                const firstPlayer = session.players[Math.floor(Math.random() * session.players.length)].playerId;
                sessions[ws.sessionCode].firstPlayer = firstPlayer
            }
            console.log("firstPlayer = ", sessions[ws.sessionCode].firstPlayer)

            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'coinToss', player: sessions[ws.sessionCode].firstPlayer })));
              });
  
        }
    }

    if (data.type === 'initial_reDraw') {
      if (ws.sessionCode && sessions[ws.sessionCode]) {
        const session = sessions[ws.sessionCode];
        session.playersReady += 1;

        console.log(`|| Players ready in session ${ws.sessionCode}: ${session.playersReady}`);

        if (session.playersReady === 2) {
            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'start' })));
              });
          session.playersReady = 0;
        }
      }
    }

    // Relay messages to the other player in the same session
    if (ws.sessionCode) {
      const sessionPlayers = sessions[ws.sessionCode]?.players || [];
      sessionPlayers.forEach((player) => {
        if (player !== ws) {
          player.send(compressPayload(JSON.stringify(data)));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log(`|| Player ${ws.playerId} disconnected`);

    // Check if the player has an active session
    if (ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];

      // Check if the player is the creator of the session
      if (session.players[0] === ws) {
        // If the creator disconnects, delete the session
        console.log(`|| Deleting session ${ws.sessionCode} because the creator left`);
        if (session.players.length > 1) {
          try {
          session.players[1].send(compressPayload(JSON.stringify({ type: 'unReady' })));
          session.players[1].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
          } catch (e) {
            console.log("Err", e);
          }
        }
        delete sessions[ws.sessionCode];
      } else {
        try {
        // If a non-creator disconnects, remove them from the session and notify the creator
        session.players = session.players.filter(player => player !== ws);
        session.players[0].send(compressPayload(JSON.stringify({ type: 'unReady' })));
        session.players[0].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
        console.log(`|| Player ${ws.playerId} left the session ${ws.sessionCode}`);
        } catch (e) {
          console.log("Err", e);
        }
      }
    }

    // Remove the player from the players list
    players = players.filter(player => player !== ws);
  });
});



server.listen(PORT, () => console.log(`>>> Server running on port ${PORT} `));