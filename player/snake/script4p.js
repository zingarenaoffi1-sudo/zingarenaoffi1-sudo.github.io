// ==========================================
// SNAKES & LADDERS PRO - 4 PLAYER ENGINE
// ==========================================

const boardData = {
    'board1': { image: 'board1.jpg', padding: 0, snakes: { 17:7, 54:34, 62:19, 64:60, 87:24, 93:73, 95:75, 98:79 }, ladders: { 1:38, 4:14, 9:31, 21:42, 28:84, 51:67, 71:91, 80:100 } },
    'board3': { image: 'board3.jpg', padding: 3, snakes: { 16:6, 41:20, 60:22, 63:43, 67:34, 86:56, 93:72, 95:76, 98:78 }, ladders: { 7:27, 18:23, 24:64, 32:51, 35:54, 73:88, 81:100 } },
    'board4': { image: 'board4.jpg', padding: 16, snakes: { 22:2, 40:18, 46:15, 66:45, 89:68, 95:76, 99:23 }, ladders: { 4:17, 14:28, 33:48, 59:82, 69:93 } }
};

let currentBoard = boardData['board1']; 
let activePlayers = ['red', 'green', 'yellow', 'blue']; 
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;

let socket;
let myAssignedColor = "";
window.currentRoomId = "";

let turnTimer = null;
let countdownInterval = null;
let timeLeft = 25;
let missedTurns = { 'red': 0, 'green': 0, 'yellow': 0, 'blue': 0 };

let winnersList = [];
let totalPlayersInGame = 4;

const playersData = {
    'red': { name: "RED'S TURN", class: "red-text", badgeColor: '#e74c3c' },
    'green': { name: "GREEN'S TURN", class: "green-text", badgeColor: '#2ecc71' },
    'yellow': { name: "YELLOW'S TURN", class: "yellow-text", badgeColor: '#f1c40f' },
    'blue': { name: "BLUE'S TURN", class: "blue-text", badgeColor: '#3498db' }
};

const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

let players = {
    'red': { position: 0, isLocked: true, element: document.getElementById('pawn-red'), name: '🔴 Red' },
    'green': { position: 0, isLocked: true, element: document.getElementById('pawn-green'), name: '🟢 Green' },
    'yellow': { position: 0, isLocked: true, element: document.getElementById('pawn-yellow'), name: '🟡 Yellow' },
    'blue': { position: 0, isLocked: true, element: document.getElementById('pawn-blue'), name: '🔵 Blue' }
};

// 🔥 NON-BLOCKING TOAST NOTIFICATION
function showToast(msg) {
    let toast = document.createElement('div');
    toast.innerText = msg;
    toast.style.position = 'absolute';
    toast.style.top = '60px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(231, 76, 60, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '9999';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    document.body.appendChild(toast);
    setTimeout(() => { if(toast) toast.remove(); }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("dice-container").addEventListener("click", rollDice);
    Object.keys(players).forEach(color => {
        players[color].element.style.transform = `translate(-40px, 480px)`; 
    });
    checkGameModeSetup();
});

function setBoardLayout(boardKey) {
    if (boardData[boardKey]) {
        currentBoard = boardData[boardKey];
        const boardContainer = document.getElementById('board-container');
        if (boardContainer) {
            boardContainer.style.backgroundImage = `url('${currentBoard.image}')`;
            boardContainer.style.backgroundColor = '#34495e';
        }
        const mapNameElement = document.getElementById('map-name');
        if(mapNameElement) mapNameElement.innerText = `Map: ${boardKey.toUpperCase()}`;
    }
}

function checkGameModeSetup() {
    let mode = sessionStorage.getItem('gameMode');
    if (mode === 'online') {
        let roomDataStr = sessionStorage.getItem('roomData');
        if (!roomDataStr) {
            window.location.href = 'index.html';
            return;
        }
        try {
            let roomData = JSON.parse(roomDataStr);
            window.currentRoomId = roomData.roomId || "";
            myAssignedColor = roomData.color || 'red';
            showMyIdentity(myAssignedColor);
            
            if (roomData.allPlayers && Array.isArray(roomData.allPlayers)) {
                activePlayers = roomData.allPlayers.map(p => p.color);
            } else {
                activePlayers = ['red', 'green', 'yellow', 'blue'];
            }
            
            if (roomData.selectedBoard) {
                setBoardLayout(roomData.selectedBoard);
            } else {
                setBoardLayout('board1');
            }
        } catch (e) {
            setBoardLayout('board1');
        }
        
        // 🔥 FIX: Variables populate hone ke baad hi server connect karo
        connectToServer();
        initGameSession();
    } else {
        const boardKeys = Object.keys(boardData);
        const randomKey = boardKeys[Math.floor(Math.random() * boardKeys.length)];
        setBoardLayout(randomKey);

        activePlayers = ['red', 'green', 'yellow', 'blue'];
        showMyIdentity(activePlayers[0]); 
        initGameSession();
    }
}

function connectToServer() {
    if (!socket) {
        socket = io("https://zingarenaoffi1-sudo-github-io-1.onrender.com"););

        // 🔥 FIX ADDED HERE: Naye page par aate hi room wapas join karo
        if (window.currentRoomId && myAssignedColor) {
            socket.emit('rejoin-room', { 
                roomId: window.currentRoomId, 
                color: myAssignedColor 
            });
        }

        socket.on('start-online-game', (data) => {
            if (data.selectedBoard) {
                setBoardLayout(data.selectedBoard);
            }
            activePlayers = data.players.map(p => p.color);
            let me = data.players.find(p => p.id === socket.id);
            if (me) {
                myAssignedColor = me.color;
                showMyIdentity(me.color);
                let currentRoom = JSON.parse(sessionStorage.getItem('roomData') || '{}');
                currentRoom.color = me.color;
                currentRoom.allPlayers = data.players;
                sessionStorage.setItem('roomData', JSON.stringify(currentRoom));
            }
            initGameSession();
        });

        socket.on('remote-dice-rolled', (data) => {
            clearTurnTimer();
            currentDiceValue = data.diceValue;
            currentPlayerIndex = data.playerIndex; 

            const diceContainer = document.getElementById("dice-container");
            diceContainer.innerText = diceFaces[currentDiceValue];
            diceContainer.style.color = currentDiceValue === 6 ? "#e74c3c" : "#111";

            gameState = 'WAITING_FOR_MOVE';
            startTurnTimer();
            processMovement(currentDiceValue);
        });

        socket.on('force-turn-update', (data) => {
            clearTurnTimer();
            currentPlayerIndex = data.nextPlayerIndex;
            switchTurn();
        });

        socket.on('opponent-left', (data) => {
            clearTurnTimer();
            alert(`⚠️ Opponent (${data.color.toUpperCase()}) left. Ending game.`);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });

        socket.on('error-msg', (msg) => { alert("❌ " + msg); });
    }
}

function showMyIdentity(color) {
    const badge = document.getElementById('my-identity-badge');
    if (!badge) return;
    badge.classList.remove('hidden');
    badge.innerHTML = `👉 YOU ARE: ${color.toUpperCase()} 👈`;
    
    let bgColor = playersData[color]?.badgeColor || '#7f8c8d';
    badge.style.background = bgColor;
    badge.style.color = color === 'yellow' ? '#111' : '#fff';

    document.querySelectorAll('.player-profile').forEach(p => {
        p.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        p.style.boxShadow = "none";
        p.style.opacity = "0.4";
    });
    
    const myProfile = document.getElementById(`profile-${color}`);
    if (myProfile) {
        myProfile.style.border = `2px solid ${bgColor}`;
        myProfile.style.boxShadow = `0 0 10px ${bgColor}`;
        myProfile.style.opacity = "1";
    }
}

function initGameSession() {
    winnersList = [];
    totalPlayersInGame = activePlayers.length;

    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        let p = document.getElementById(`profile-${c}`);
        if(p) {
            if(activePlayers.includes(c)) {
                p.style.opacity = "1";
            } else {
                p.style.display = "none"; 
            }
        }
        missedTurns[c] = 0;
    });

    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    updateTurnText();
    startTurnTimer();
}

function startTurnTimer() {
    clearTurnTimer();
    timeLeft = 25;
    updateTimerUI();

    countdownInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);

    let currentColor = activePlayers[currentPlayerIndex];
    turnTimer = setTimeout(() => {
        handleTurnTimeout(currentColor);
    }, 25000);
}

function clearTurnTimer() {
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function updateTimerUI() {
    let timerEl = document.getElementById("timer-text");
    if (timerEl) timerEl.innerText = `⏳ Time left: ${timeLeft}s`;
}

function handleTurnTimeout(color) {
    missedTurns[color]++;
    if (missedTurns[color] >= 3) {
        clearTurnTimer();
        alert(`🚨 ${color.toUpperCase()} missed 3 turns and is eliminated!`);
        eliminatePlayer(color);
        return;
    }
    showToast(`⚠️ ${color.toUpperCase()} skipped turn due to inactivity.`);

    if (socket && window.currentRoomId) {
        if (myAssignedColor === color) {
            let nextIndex = (currentPlayerIndex + 1) % activePlayers.length;
            socket.emit('sync-turn-change', { roomId: window.currentRoomId, nextPlayerIndex: nextIndex });
            currentPlayerIndex = nextIndex;
            switchTurn();
        }
    } else {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
        switchTurn();
    }
}

function eliminatePlayer(color) {
    players[color].element.style.display = 'none';
    let profileEl = document.getElementById(`profile-${color}`);
    if (profileEl) profileEl.style.opacity = "0.1";

    activePlayers = activePlayers.filter(c => c !== color);

    if (activePlayers.length <= 1) {
        if(activePlayers.length === 1) winnersList.push(activePlayers[0]);
        endMatchAndGoToMenu();
    } else {
        if (currentPlayerIndex >= activePlayers.length) currentPlayerIndex = 0;
        switchTurn(false);
    }
}

function updatePawnPosition(playerColor) {
    let player = players[playerColor];
    let pos = player.position;
    if (pos === 0) {
        player.element.style.transform = `translate(-40px, 480px)`;
        return;
    }

    let row = Math.floor((pos - 1) / 10);
    let col = (pos - 1) % 10;
    if (row % 2 !== 0) col = 9 - col;

    const boardSize = 380; 
    const padding = currentBoard.padding;
    const playableSize = boardSize - (padding * 2);
    const cellSize = playableSize / 10;

    let cellX = padding + (col * cellSize);
    let cellY = padding + ((9 - row) * cellSize);

    let centerX = cellX + (cellSize - 18) / 2; 
    let centerY = cellY + (cellSize - 24) / 2;

    let offsets = {
        'red': {x: -6, y: -6},
        'green': {x: 6, y: -6},
        'yellow': {x: -6, y: 6},
        'blue': {x: 6, y: 6}
    };

    let finalX = centerX + (offsets[playerColor]?.x || 0);
    let finalY = centerY + (offsets[playerColor]?.y || 0);

    Object.keys(players).forEach(c => players[c].element.style.zIndex = 10);
    player.element.style.zIndex = 20;

    player.element.style.transform = `translate(${finalX}px, ${finalY}px)`;
}

function rollDice() {
    let currentTurnColor = activePlayers[currentPlayerIndex];

    if (socket && window.currentRoomId) {
        if (myAssignedColor !== currentTurnColor) {
            showToast(`Wait bro! It's ${currentTurnColor.toUpperCase()}'s turn!`);
            return;
        }
    }

    if (activePlayers.length === 0 || gameState !== 'WAITING_FOR_ROLL' || isMoving) return;

    clearTurnTimer();
    gameState = 'ROLLING';
    const diceContainer = document.getElementById("dice-container");
    diceContainer.classList.add("rolling");

    setTimeout(() => {
        diceContainer.classList.remove("rolling");
        currentDiceValue = Math.floor(Math.random() * 6) + 1;

        diceContainer.innerText = diceFaces[currentDiceValue];
        diceContainer.style.color = currentDiceValue === 6 ? "#e74c3c" : "#111";

        gameState = 'WAITING_FOR_MOVE';
        startTurnTimer(); 

        if (socket && window.currentRoomId) {
            socket.emit('roll-dice-action', {
                roomId: window.currentRoomId,
                diceValue: currentDiceValue,
                playerIndex: currentPlayerIndex
            });
        }

        processMovement(currentDiceValue);
    }, 500);
}

function processMovement(diceRoll) {
    let playerColor = activePlayers[currentPlayerIndex];
    let player = players[playerColor];
    isMoving = true;
    missedTurns[playerColor] = 0;

    if (player.isLocked) {
        if (diceRoll === 1) {
            player.isLocked = false;
            player.position = 1;
            updatePawnPosition(playerColor);
            setTimeout(() => checkSnakesLadders(diceRoll), 600);
        } else {
            setTimeout(() => passTurn(diceRoll), 1000);
        }
        return;
    }

    let newPosition = player.position + diceRoll;

    if (newPosition === 100) {
        player.position = newPosition;
        updatePawnPosition(playerColor);
        handlePlayerWin(playerColor);
        return;
    } 
    else if (newPosition > 100) {
        setTimeout(() => passTurn(diceRoll), 1000);
    } 
    else {
        player.position = newPosition;
        updatePawnPosition(playerColor);
        setTimeout(() => checkSnakesLadders(diceRoll), 600);
    }
}

function checkSnakesLadders(diceRoll) {
    let playerColor = activePlayers[currentPlayerIndex];
    let player = players[playerColor];
    let landedOnSnake = currentBoard.snakes[player.position];
    let landedOnLadder = currentBoard.ladders[player.position];

    if (landedOnSnake) {
        player.position = landedOnSnake;
        updatePawnPosition(playerColor);
        setTimeout(() => passTurn(diceRoll), 1000);
    } else if (landedOnLadder) {
        player.position = landedOnLadder;
        updatePawnPosition(playerColor);
        setTimeout(() => passTurn(diceRoll), 1000);
    } else {
        passTurn(diceRoll);
    }
}

function passTurn(lastRoll) {
    isMoving = false;
    if (lastRoll === 6) {
        gameState = 'WAITING_FOR_ROLL';
        startTurnTimer();
    } else {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
        switchTurn();
    }
}

function switchTurn(resetTimer = true) {
    if(resetTimer) clearTurnTimer();
    updateTurnText();
    gameState = 'WAITING_FOR_ROLL';
    if(resetTimer) startTurnTimer();
}

function updateTurnText() {
    let currentColor = activePlayers[currentPlayerIndex];
    const turnText = document.getElementById("turn-text");
    if (turnText && playersData[currentColor]) {
        turnText.innerText = playersData[currentColor].name;
        turnText.className = "turn-indicator " + playersData[currentColor].class;
    }
}

function handlePlayerWin(playerColor) {
    clearTurnTimer();
    if (!winnersList.includes(playerColor)) {
        winnersList.push(playerColor);
        let rank = winnersList.length;
        let rankText = rank === 1 ? "1st 🥇" : (rank === 2 ? "2nd 🥈" : "3rd 🥉");

        let profileEl = document.getElementById(`profile-${playerColor}`);
        if (profileEl) {
            profileEl.style.opacity = "0.5";
            let rankDiv = document.createElement("div");
            rankDiv.style.color = "#FFD700"; rankDiv.style.fontWeight="bold"; rankDiv.style.fontSize="9px";
            rankDiv.innerText = rankText;
            profileEl.appendChild(rankDiv);
        }

        activePlayers = activePlayers.filter(c => c !== playerColor);

        if (winnersList.length >= 3 || activePlayers.length <= 1) {
            endMatchAndGoToMenu();
        } else {
            currentPlayerIndex = currentPlayerIndex % activePlayers.length;
            switchTurn();
        }
    }
}

function endMatchAndGoToMenu() {
    clearTurnTimer();
    setTimeout(() => {
        let winMessage = "🏆 MATCH FINISHED! 🏆\n\n";
        winnersList.forEach((color, index) => {
            winMessage += `Rank ${index + 1}: ${color.toUpperCase()}\n`;
        });
        if(activePlayers.length === 1) winMessage += `Rank 4: ${activePlayers[0].toUpperCase()}\n`;
        
        alert(winMessage);
        
        if (socket) socket.emit("leave-room");
        window.location.href = "index.html";
    }, 1500);
}
