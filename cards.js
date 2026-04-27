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
  wsUrl = `wss://drmineword-gwent.onrender.com`;
}

console.log("Websocket", wsUrl);
// const socket = new WebSocket('ws://127.0.0.1:8080');				// Example line for when using local installation instead of remote deployment.
const socket = new WebSocket(wsUrl);	// Websocket + server is expected to be reachable on this URL. Disable if using local installation.
let amReady = false;
let opponentReady = false;
let playerId = null;






socket.onmessage = async(event) => {
    console.log('[socket raw event.data]', event.data);
	
	const data = JSON.parse(event.data);

		switch (data.type) {
			case "welcome":
				playerId = data.playerId;
				console.log("Welcome, your id is " + playerId);
				break;
			
			// Opponent has joined and the session is ready
			case "sessionReady":
				// [socket raw event.data] {"type":"sessionJoined","code":"XRA2"}
				readyButtonElem.classList.remove("disabled");
				isOpponentReadyElem.classList.remove("hidden");

				  document.getElementById("session-display").classList.remove("hidden");
    document.getElementById("session-code-text").textContent = joinedSessionId;
	console.log(joinedSessionId);
	// joinedSessionId;
				// sends the opponent which faction you're playing with
				socket.send(JSON.stringify({ type: "opChangeFaction", faction: dm.faction }));
				break;

			// Opponent has left and the session is no longer ready
			case "sessionUnready":
				console.log("---------------------");
				console.log("Opponent left the game");
				isOpponentReadyElem.classList.add("hidden");

				readyButtonElem.classList.add("disabled");
				if (game.roundCound > 0) {
					await ui.notification("win-opleft", 1200);

					game.returnToCustomization();
					if (joinedSessionId) {
						cancelSession();
					}
				}
				break;
			
			// Opponent is ready. If you are ready begin the game immediately
			case "ready":
				player_op = new Player(1, "Opponent", data.deck);
				if (amReady) {
					customizationElem.classList.add("hide");
					gameStartControlsElem.classList.add("hide");
		
					game.startGame();
					return
				} else {
					opponentReadyElem.classList.remove("disabled");
					opponentReady = true;
				}
				break;

			case "opChangeFaction":
				console.log("opponent has changed his faction");
				opponentReadyElem.querySelector("img").src = `img/icons/deck_shield_${data.faction}.png`
				break;
			
			case "unReady":
				opponentReady = false;
				opponentReadyElem.classList.add("disabled");
				if (amReady) {
					readyButtonElem.classList.remove("ready");
					customizationElem.classList.remove("noclick");
				}
				break;
			
			// Initializes Opponent's updated Hand and Deck
			case "initial_reDraw":
				data.deck = fillCardElements(data.deck, player_op);
				data.hand = fillCardElements(data.hand, player_op);

				player_op.hand.cards = data.hand;
				player_op.deck.cards = data.deck;
				break;

			// Game-start
			case "start":
				console.log("---------------------");
				console.log("Match start");
				
				game.startRound()
				tocar("game_start", false);
				break;

			// Game - Opponent plays card
			case "play":
				const card = player_op.hand.cards.find(c => c.filename === data.card.filename);
				console.log("Opponent plays card", card);

				const splitRowName = data.row.split("-");
				let row
				if (splitRowName.length > 1) {
					const targetRow = splitRowName[0] === "self" ? "target" : "self";
					row = board.row.find(r => r.elem_parent.id === `${targetRow}-${splitRowName[1]}`);
				} else {
					row = data.row
				}
				
				if (data.card.filename === "decoy") {
					const replacedCard = row.cards.find(bc => bc.filename === data.target.filename);
					if (!replacedCard) return
					
					board.moveTo(replacedCard, player_op.hand, row);
				}
				
				if (row === "weather") 
					await player_op.playCard(card, row);
				else if (data.card.filename === "scorch")
					await  player_op.playScorch(card);
				else
					await player_op.playCardToRow(card, row);
				break;

			// Game - Opponent pass
			case "pass":
				player_op.passRound();
				break;

			// Game - Opponent used the leader card
			case "useLeader":
				player_op.activateLeader()
				break;
		}
};


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
loadCards();