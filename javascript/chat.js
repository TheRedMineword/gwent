"use strict"

// const { json } = require("express");
const chatBtn2 = document.getElementById("chat-toggle");
const menuBtn2 = document.getElementById("top-menu-btn");

const overlay2 = document.getElementById("chat-overlay");
const closeBtn2 = document.getElementById("chat-close");

const input2 = document.getElementById("chat-input");
const sendBtn2 = document.getElementById("chat-send");

const log = document.getElementById("chat-log");

let chat_dis = 0;
document.getElementById("chat-toggle").disabled = true;
let unreadCount = 0;
let api_url_msg = null;
const isLocalhost =
    (
        host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("[::1]")
    ) && location.port === "1111";

let api_url_msg;

if (isLocalhost) {
    api_url_msg = "http://localhost:8081";
} else {
    api_url_msg = "https://drmineword-gwent.onrender.com";
}
console.log("[CHAT], api url:", api_url_msg);
chatBtn2.onclick = () => {

    overlay2.classList.toggle("hidden");

    if (!overlay2.classList.contains("hidden")) {
        clearUnread();
    }
};


closeBtn2.onclick = () => {
    overlay2.classList.add("hidden");
};


sendBtn2.onclick = sendChatMessage;


input2.addEventListener("keydown", e => {

    if (e.key === "Enter") {
        sendChatMessage();
    }
});


async function sendChatMessage() {
    const text = input2.value.trim();
    if (!text) return;
    if (!current_op) {
        alert("Cant send messsage while in empty session");
        return;
    }

    try {
        const res = await fetch(`${api_url_msg}/api/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session_id: ThisSessionId,
                player_id: current_op.me_id,
                type: "chat",
                message: text
            })
        });

        // Try to parse response (even for errors)
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            console.error("Message send failed:", res.status, data);

            alert(
                "Send failed:\n" +
                JSON.stringify(
                    {
                        status: res.status,
                        response: data
                    },
                    null,
                    2
                )
            );

            return;
        }
        console.log(`[CHAT] response, ${JSON.stringify(data)}`);
        addMessage("me", data?.sent.message);
        input2.value = "";

    } catch (err) {
        console.error("Network error:", err);

        alert(
            "Network error:\n" +
            JSON.stringify(
                {
                    message: err?.message,
                    stack: err?.stack
                },
                null,
                2
            )
        );
    }
}

async function sendChatMessageStrig(atext) {
    const text = atext;
    if (!text) return;
    if (!current_op) {
        // alert("Cant send messsage while in empty session");
        return;
    }

    try {
        const res = await fetch(`${api_url_msg}/api/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session_id: ThisSessionId,
                player_id: current_op.me_id,
                type: "chat",
                message: text
            })
        });

        // Try to parse response (even for errors)
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            console.error("Message send failed:", res.status, data);

            alert(
                "Send failed:\n" +
                JSON.stringify(
                    {
                        status: res.status,
                        response: data
                    },
                    null,
                    2
                )
            );

            return;
        }
        console.log(`[CHAT] response, ${JSON.stringify(data)}`);
        addMessage("me", data?.sent.message);
        input2.value = "";

    } catch (err) {
        console.error("Network error:", err);

        alert(
            "Network error:\n" +
            JSON.stringify(
                {
                    message: err?.message,
                    stack: err?.stack
                },
                null,
                2
            )
        );
    }
}


function addMessage(type, text){
    console.log("[CHAT] NEW MESSAGE", type, text);
    let parse_type = type;
    const div = document.createElement("div");

    div.className = `chat-line chat-${type}`;
    if (parse_type === "me"){
        parse_type = players.me
    } else if (parse_type === "op"){
        parse_type = players.op
    } else if (parse_type === "system"){
        parse_type = players.sys
    }
    div.textContent = `${parse_type}: ${text}`;

    log.appendChild(div);

    log.scrollTop = log.scrollHeight;


    if (overlay2.classList.contains("hidden")) {
        setUnread();
    }
}


function setUnread(){

    unreadCount++;

    menuBtn2.classList.add("chat-alert"); menuBtn2.textContent = `(${unreadCount}!)☰`;

    chatBtn2.textContent = `Chat (${unreadCount}!)`;
}


function clearUnread(){

    unreadCount = 0;

    menuBtn2.classList.remove("chat-alert"); menuBtn2.textContent = `☰`;

    chatBtn2.textContent = "Chat";
}

function disableChat(){
    if ( chat_dis === 0){
        chat_dis = 1;
        document.getElementById("chat-toggle").disabled = false;
    } else {
        chat_dis = 0;
    overlay2.classList.add("hidden");
    document.getElementById("chat-toggle").disabled = true; clearUnread();
    }
}
console.log("[CHAT] Chat loaded");