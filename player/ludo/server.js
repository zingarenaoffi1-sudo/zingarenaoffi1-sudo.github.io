// ==========================================
// ULTIMATE LUDO PRO SERVER (server.js)
// 100% Bug-Free Matchmaking + Private Rooms + Ranking Sync
// ==========================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(__dirname));

const rooms = {};
let queue2P = [];
let queue3P = [];
let queue4P = [];
const availableColors = ['red', 'green', 'yellow', 'blue'];

// 🔥 PLAYER CLEANUP FUNCTION: Ek player ko har line aur room se hatane ke liye
function leaveAllRoomsAndQueues(socket) {
    // 1. Queues se filter karo (Duplicate check)
    queue2P = queue2P.filter(p => p.id !== socket.id);
    queue3P = queue3P.filter(p => p.id !== socket.id);
    queue4P = queue4P.filter(p => p.id !== socket.id);

    // 2. Agar kisi room me tha, toh wahan se nikalo
    for (const roomId in rooms) {
        let room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
            let removedColor = room.players[playerIndex].color;
            room.players.splice(playerIndex, 1);
            socket.leave(roomId);
            
            console.log(`⬅️ Player ${socket.id} left room ${roomId}`);

            // Agar room khali ho gaya, toh server memory se uda do
            if (room.players.length === 0) {
                delete rooms[roomId];
                console.log(`🗑️ Room ${roomId} deleted (Empty)`);
            } else {
                // Agar game chal rahi thi aur koi bhaag gaya, toh baakiyon ko batao
                io.to(roomId).emit('error-msg', `⚠️ Player (${removedColor.toUpperCase()}) left the game!`);
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('🎉 New player connected! ID:', socket.id);

    // Jab player UI se 'Back' dabaye
    socket.on('cancel-action', () => {
        leaveAllRoomsAndQueues(socket);
        console.log(`🛑 Player ${socket.id} cancelled matchmaking.`);
    });

    // 1. 🔥 STRICT QUICK MATCHMAKING LOGIC
    socket.on('find-match', (data) => {
        // Pehle sure karo ki yeh player pehle se kisi line mein nahi hai
        leaveAllRoomsAndQueues(socket); 
        
        const reqCount = data.playersRequired;
        console.log(`🔍 Player ${socket.id} searching for ${reqCount}P match.`);

        // Player ko object banakar queue mein daalo
        let playerObj = { id: socket.id, socket: socket };

        if (reqCount === 2) {
            queue2P.push(playerObj);
            checkAndStartQueueMatch(queue2P, 2);
        } else if (reqCount === 3) {
            queue3P.push(playerObj);
            checkAndStartQueueMatch(queue3P, 3);
        } else if (reqCount === 4) {
            queue4P.push(playerObj);
            checkAndStartQueueMatch(queue4P, 4);
        }
    });

    // 2. CREATE PRIVATE ROOM
    socket.on('create-room', (data) => {
        leaveAllRoomsAndQueues(socket); 

        const roomId = 'LUDO_' + Math.floor(1000 + Math.random() * 9000);
        rooms[roomId] = {
            capacity: data.maxPlayers,
            players: [{ id: socket.id, color: 'red' }]
        };

        socket.join(roomId);
        socket.emit('room-created', { roomId: roomId, color: 'red' });
        console.log(`🏠 Private Room Created: ${roomId} (Capacity: ${data.maxPlayers})`);
    });

    // 3. JOIN PRIVATE ROOM
    socket.on('join-room', (data) => {
        leaveAllRoomsAndQueues(socket); 

        let cleanRoomId = data.roomId ? data.roomId.trim().toUpperCase() : "";
        let room = rooms[cleanRoomId];
        
        if (room) {
            if (room.players.length < room.capacity) {
                let assignedColor = availableColors[room.players.length];
                room.players.push({ id: socket.id, color: assignedColor });
                socket.join(cleanRoomId);

                socket.emit('joined-success', { roomId: cleanRoomId, color: assignedColor });
                
                // Jab room full ho jaye, toh sabki game start kar do
                if (room.players.length === room.capacity) {
                    io.to(cleanRoomId).emit('start-online-game', { players: room.players });
                    console.log(`🚀 Room ${cleanRoomId} full! Game started.`);
                }
            } else {
                socket.emit('error-msg', 'Room is full bro!');
            }
        } else {
            socket.emit('error-msg', 'Room not found! Check the ID again.');
        }
    });

    // 4. GAME SYNC EVENTS
    socket.on('roll-dice-action', (data) => {
        socket.to(data.roomId).emit('remote-dice-rolled', data);
    });

    socket.on('move-token-action', (data) => {
        socket.to(data.roomId).emit('remote-token-moved', data);
    });

    // 5. 🏆 NAYA EVENT: JAB KOI PLAYER JEET JAYE
    socket.on('player-finished', (data) => {
        // Find karte hain ki yeh player kis room mein hai
        for (const roomId in rooms) {
            if (rooms[roomId].players.some(p => p.id === socket.id)) {
                // Us room ke baaki logo ko batao ki yeh jeet gaya
                socket.to(roomId).emit('player-finished', data);
                break;
            }
        }
    });

    // 6. 🏆 NAYA EVENT: JAB GAME OVER HO JAYE
    socket.on('leave-room', () => {
        leaveAllRoomsAndQueues(socket);
    });

    // 7. DISCONNECT
    socket.on('disconnect', () => {
        console.log('❌ Player disconnected:', socket.id);
        leaveAllRoomsAndQueues(socket);
    });
});

// 🔥 QUEUE CHECKING ENGINE (Bug-Free)
function checkAndStartQueueMatch(queue, requiredPlayers) {
    // Check karo ki kya line mein poore log khade hain?
    if (queue.length >= requiredPlayers) {
        
        // Exact utne players line se bahar nikalo jitne chahiye
        let matchedPlayers = queue.splice(0, requiredPlayers);
        
        const roomId = 'LUDO_Q_' + Math.floor(1000 + Math.random() * 9000);
        console.log(`🔥 Quick Match Found! Room: ${roomId} (${requiredPlayers} Players)`);

        let playersData = [];

        // Sabko room mein dalo aur color set karo
        matchedPlayers.forEach((p, index) => {
            p.socket.join(roomId);
            let color = availableColors[index];
            playersData.push({ id: p.id, color: color });
            
            // Har player ko uska color aur room batao
            p.socket.emit('match-found', { roomId: roomId, color: color });
        });

        // Quick match room ko bhi list mein save karo
        rooms[roomId] = {
            capacity: requiredPlayers,
            players: playersData
        };

        // Sabko ek saath Game Start ka trigger bhejo
        io.to(roomId).emit('start-online-game', { players: playersData });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
