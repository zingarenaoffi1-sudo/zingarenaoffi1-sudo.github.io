// ==========================================
// ULTIMATE LUDO MULTIPLAYER SERVER (server.js)
// Merged: Quick Match + Private Rooms + Game Sync + Anti-Cheat + Matchmaking Fix
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

// 🔥 NAYA FUNCTION: Pichle rooms aur queue se player ko hatane ke liye
function leaveAllRoomsAndQueues(socket) {
    // 1. Queue se hatao
    queue2P = queue2P.filter(p => p.id !== socket.id);
    queue3P = queue3P.filter(p => p.id !== socket.id);
    queue4P = queue4P.filter(p => p.id !== socket.id);

    // 2. Agar kisi private ya purane room me tha, toh wahan se nikal do
    for (const roomId in rooms) {
        let room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            socket.leave(roomId);
            
            // Agar room khali ho gaya, toh room ko memory se delete kar do
            if (room.players.length === 0) {
                delete rooms[roomId];
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('🎉 Naya player connect hua! ID:', socket.id);

    // UI se 'Back' dabane par cancel karne ke liye
    socket.on('cancel-action', () => {
        leaveAllRoomsAndQueues(socket);
    });

    // 1. QUICK MATCH
    socket.on('find-match', (data) => {
        leaveAllRoomsAndQueues(socket); // Pehle purane kachre se nikalo
        
        const playersReq = data.playersRequired;
        if (playersReq === 2) {
            queue2P.push(socket);
            checkAndStartQueueMatch(queue2P, 2);
        } else if (playersReq === 3) {
            queue3P.push(socket);
            checkAndStartQueueMatch(queue3P, 3);
        } else if (playersReq === 4) {
            queue4P.push(socket);
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
        console.log(`🔥 Private Room Bana: ${roomId} (Capacity: ${data.maxPlayers})`);
    });

    // 3. JOIN PRIVATE ROOM
    socket.on('join-room', (data) => {
        leaveAllRoomsAndQueues(socket); 

        let cleanRoomId = data.roomId ? data.roomId.trim().toUpperCase() : "";
        let room = rooms[cleanRoomId];
        
        if (room) {
            // Anti-duplicate check
            let alreadyJoined = room.players.find(p => p.id === socket.id);
            if (alreadyJoined) {
                socket.emit('error-msg', 'Tu pehle se hi is room me hai bhai!');
                return;
            }

            if (room.players.length < room.capacity) {
                let assignedColor = availableColors[room.players.length];
                room.players.push({ id: socket.id, color: assignedColor });
                socket.join(cleanRoomId);

                socket.emit('joined-success', { roomId: cleanRoomId, color: assignedColor });
                io.to(cleanRoomId).emit('update-players', { players: room.players });
                
                if (room.players.length === room.capacity) {
                    io.to(cleanRoomId).emit('start-online-game', { players: room.players });
                    console.log(`🚀 Room ${cleanRoomId} bhar gaya! Game start ho rahi hai.`);
                }
            } else {
                socket.emit('error-msg', 'Room full hai bhai!');
            }
        } else {
            socket.emit('error-msg', 'Room nahi mila! Sahi ID daal.');
        }
    });

    // 4. GAME SYNC
    socket.on('roll-dice-action', (data) => {
        socket.to(data.roomId).emit('remote-dice-rolled', data);
    });

    socket.on('move-token-action', (data) => {
        socket.to(data.roomId).emit('remote-token-moved', data);
    });

    // 5. DISCONNECT
    socket.on('disconnect', () => {
        console.log('❌ Player disconnect ho gaya:', socket.id);
        leaveAllRoomsAndQueues(socket);
    });
});

function checkAndStartQueueMatch(queue, requiredPlayers) {
    if (queue.length >= requiredPlayers) {
        const roomId = 'LUDO_Q_' + Math.floor(1000 + Math.random() * 9000);
        console.log(`🔥 Quick Match Ban Gaya! Room ID: ${roomId} (${requiredPlayers} Players)`);

        let matchedPlayers = [];
        for (let i = 0; i < requiredPlayers; i++) {
            let player = queue.shift();
            player.join(roomId);
            matchedPlayers.push({ id: player.id, color: availableColors[i] });
        }

        // Quick match room ko bhi rooms object me save kar do
        rooms[roomId] = {
            capacity: requiredPlayers,
            players: matchedPlayers
        };

        matchedPlayers.forEach(p => {
            io.to(p.id).emit('match-found', { roomId: roomId, color: p.color, players: matchedPlayers });
        });

        io.to(roomId).emit('start-online-game', { players: matchedPlayers });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});