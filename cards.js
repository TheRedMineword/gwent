let card_dict = [];

async function loadCards() {
    const res = await fetch("card.json");

    if (!res.ok) {
        throw new Error("Failed to load card.json");
    }

    card_dict = await res.json();

    console.log("Cards loaded:", card_dict);

    loadGwent();
}


// Websocket and Server config.
let wsUrl;

const host = window.location.hostname;

if (
  host.includes("localhost") ||
  host.includes("127.0.0.1") ||
  host.includes("::1")
) {
  wsUrl = "ws://localhost:8081";
} else {
  wsUrl = `ws://drmineword-gwent.onrender.com`;
}

console.log("Websocket", wsUrl);
// const socket = new WebSocket('ws://127.0.0.1:8080');				// Example line for when using local installation instead of remote deployment.
const socket = new WebSocket(wsUrl);	// Websocket + server is expected to be reachable on this URL. Disable if using local installation.
let amReady = false;
let opponentReady = false;
let playerId = null;



function loadGwent() {
    const script = document.createElement("script");
    script.src = "gwent.js";
    script.type = "text/javascript";

    script.onload = () => {
        console.log("gwent.js loaded AFTER cards");
    };

    document.body.appendChild(script);
}

// start boot
async function bootstrap() {
    try {
        const res = await fetch("https://drmineword-gwent.onrender.com/wake");

        if (!res.ok) {
            throw new Error("Server not responding");
        }

        const data = await res.json();

        if (!data || data.ok !== "ok") {
            throw new Error("Invalid server response");
        }

        console.log("Backend is ready:", data);

        await loadCards(); // still needed separately unless you merge it too

        startGame();

    } catch (err) {
        console.error("Bootstrap failed:", err);
        alert("Server is not ready. Please try again in a few seconds.");
    }
}

bootstrap();