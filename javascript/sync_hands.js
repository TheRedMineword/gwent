"use strict"

function serializeCards(cards) {
    return cards.map(card => ({
        filename: card.filename
    }));
}

// usage seralize
//const handData = serializeCards(player_me.hand.cards);
//
//comp_and_send(
 //   socket,
 //   JSON.stringify({
 //       type: "initial_reDraw",
//        isMeHand: handData
 //   })
//);




function deserializeCards(rawCards, player) {
    return rawCards.map(raw => {
        const source = card_dict.find(
            c => c.filename === raw.filename
        );

        if (!source) {
            throw new Error(
                `Unknown card ${raw.filename}`
            );
        }

        return new Card(source, player);
    });
}

// usage
//
//player_op.hand.cards = deserializeCards(
 //   data.hand,
//    player_op
//);


async function resync_hands() {
    console.log("[RESYNC]", player_me.hand.cards, "myhand");
    var handData_tosend = serializeCards(player_me.hand.cards);
    var pl = {
        type: "resync_hands()",
        data: handData_tosend,
        player: playerId
    }
    console.log("[RESYNC]", " Cards to send", handData_tosend, "payload:", pl);

    comp_and_send(
    socket,
    JSON.stringify(pl)
);
}

async function init_sync_hands(){
    console.log("[RESYNC]", "On hold for:", resync_wait / 1000, "seconds");
    await sleep(resync_wait);
	await resync_hands();
    return true;
}



(() => {
  console.log("[WAKE] init");
  // Run only when NOT on localhost / local development

const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";

const isElectron =
    isLocalhost &&
    location.port === "1111";

console.log("[WAKE] 8080:", isLocalhost);

// ONLY disable wake ping in true local dev
if (isLocalhost && !isElectron) {

    console.log("[WAKE] Wake ping disabled on localhost (dev mode)");

    return;
}

  
  const WAKE_URL = "https://drmineword-gwent.onrender.com/wake";
  const INTERVAL_MS = 75 * 1000; // 90 seconds
console.log("[WAKE] 8080:", WAKE_URL, INTERVAL_MS / 1000);
  const pingWakeEndpoint = () => {
      console.log("[WAKE] PING");
    // fire-and-forget request
    fetch(WAKE_URL, {
      method: "GET",
      mode: "no-cors",
      keepalive: true,
    }).catch(() => {
      console.log("[WAKE] RES RECIVED, IGNORE");
      // ignore errors completely
    });
  };

  // Initial ping
  pingWakeEndpoint();

  // Continue while page is open
  const intervalId = setInterval(() => {
    // only ping if tab/page is still visible/open
    if (!document.hidden) {
      pingWakeEndpoint(); console.log("[WAKE] PINGING");
    } else {
      pingWakeEndpoint(); console.log("[WAKE] PINGING BUT PAGO NOT VIISBLE/ACTIVE/");
    }
  }, INTERVAL_MS);

  console.log("[WAKE] INTERNAL", intervalId);
  // Optional cleanup
 // window.addEventListener("beforeunload", () => {
//    clearInterval(intervalId);
//  });
})();