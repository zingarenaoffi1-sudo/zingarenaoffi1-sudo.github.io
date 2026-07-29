// ==========================================
// SNAKES & LADDERS PRO SERVER (server1.js)
// 100% Ludo-Style Automatic Path + Matchmaking + Rooms + Real-time Sync
// ==========================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// 🔥 TERA EXACT FOLDER PATH
const frontendPath = 'D:/snakes-and-ladders/public';

// Server ko bata diya ki static files yahan se uthani hain
app.use(express.static(frontendPath));

// Jab koi localhost:3000 kholega, toh usko direct D:/snakes-and-ladders/public/index.html dikhega
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const rooms = {};
let queue2P = [];
let queue3P = [];
let queue4P = [];

// 🔥 FIX ADDED: Game ke hisaab se colors (Ab 2 player me sirf Red aur Blue aayenge)
const colorPresets = {
    2: ['red', 'blue'],
    3: ['red', 'green', 'blue'],
    4: ['red', 'green', 'yellow', 'blue']
};
const availableBoards = ['board1', 'board3', 'board4'];

function generateRoomID() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function leaveAllRoomsAndQueues(socket) {
    queue2P = queue2P.filter(p => p.id !== socket.id);
    queue3P = queue3P.filter(p => p.id !== socket.id);
    queue4P = queue4P.filter(p => p.id !== socket.id);

    for (const roomId in rooms) {
        let room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
            let removedColor = room.players[playerIndex].color;
            room.players.splice(playerIndex, 1);
            socket.leave(roomId);
            
            console.log(`⬅️ Player ${socket.id} left room ${roomId}`);

            if (room.players.length === 0) {
                delete rooms[roomId];
                console.log(`🗑️ Room ${roomId} deleted (Empty)`);
            } else {
                io.to(roomId).emit('opponent-left', { color: removedColor });
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('🎉 Naya player connect hua! ID:', socket.id);

    // Page Transition Logic
    socket.on('page-transition', () => {
        socket.isTransitioning = true;
    });

    // Rejoin Room Logic
    socket.on('rejoin-room', (data) => {
        socket.join(data.roomId);
        let room = rooms[data.roomId];
        if (room) {
            let player = room.players.find(p => p.color === data.color);
            if (player) {
                player.id = socket.id; 
            } else {
                room.players.push({ id: socket.id, color: data.color });
            }
        }
        console.log(`🔗 Player ${data.color} rejoined room ${data.roomId} with new ID ${socket.id}`);
    });

    socket.on('cancel-action', () => {
        leaveAllRoomsAndQueues(socket);
    });

    socket.on('find-match', (data) => {
        leaveAllRoomsAndQueues(socket); 
        const reqCount = data.playersRequired;
        if (reqCount === 2) { queue2P.push(socket); checkAndStartQueueMatch(queue2P, 2); } 
        else if (reqCount === 3) { queue3P.push(socket); checkAndStartQueueMatch(queue3P, 3); } 
        else if (reqCount === 4) { queue4P.push(socket); checkAndStartQueueMatch(queue4P, 4); }
    });

    socket.on('create-room', (data) => {
        leaveAllRoomsAndQueues(socket); 
        const roomId = generateRoomID();
        const randomBoard = availableBoards[Math.floor(Math.random() * availableBoards.length)];

        rooms[roomId] = {
            capacity: data.maxPlayers,
            players: [{ id: socket.id, color: 'red' }],
            selectedBoard: randomBoard
        };

        socket.join(roomId);
        socket.emit('room-created', { roomId: roomId, color: 'red', selectedBoard: randomBoard });
    });

    socket.on('join-room', (data) => {
        leaveAllRoomsAndQueues(socket); 
        let cleanRoomId = data.roomId ? data.roomId.trim() : "";
        let room = rooms[cleanRoomId];
        
        if (room) {
            let alreadyJoined = room.players.find(p => p.id === socket.id);
            if (alreadyJoined) return socket.emit('error-msg', 'Tu pehle se hi is room me hai bhai!');

            if (room.players.length < room.capacity) {
                // 🔥 FIX ADDED: Player ko Room ki capacity ke array list ke hisaab se color milega
                let assignedColor = colorPresets[room.capacity][room.players.length];
                room.players.push({ id: socket.id, color: assignedColor });
                socket.join(cleanRoomId);

                socket.emit('joined-success', { 
                    roomId: cleanRoomId, 
                    color: assignedColor, 
                    allPlayers: room.players, 
                    selectedBoard: room.selectedBoard,
                    capacity: room.capacity 
                });
                
                io.to(cleanRoomId).emit('update-players', { players: room.players });
                
                if (room.players.length === room.capacity) {
                    io.to(cleanRoomId).emit('start-online-game', { 
                        players: room.players, 
                        selectedBoard: room.selectedBoard,
                        capacity: room.capacity
                    });
                }
            } else {
                socket.emit('error-msg', 'Room full hai bhai!');
            }
        } else {
            socket.emit('error-msg', 'Room nahi mila! Sahi 6-digit ID daal.');
        }
    });
    
    socket.on('roll-dice-action', (data) => {
        socket.to(data.roomId).emit('remote-dice-rolled', data);
    });

    socket.on('sync-turn-change', (data) => {
        socket.to(data.roomId).emit('force-turn-update', data);
    });

    socket.on('leave-room', () => { leaveAllRoomsAndQueues(socket); });

    socket.on('disconnect', () => {
        if (socket.isTransitioning) {
            console.log(`⏳ Transitioning... ignoring disconnect for: ${socket.id}`);
            return;
        }
        console.log('❌ Player disconnect ho gaya:', socket.id);
        leaveAllRoomsAndQueues(socket);
    });
});

function checkAndStartQueueMatch(queue, requiredPlayers) {
    if (queue.length >= requiredPlayers) {
        const roomId = generateRoomID();
        const randomBoard = availableBoards[Math.floor(Math.random() * availableBoards.length)];

        let matchedPlayers = [];
        for (let i = 0; i < requiredPlayers; i++) {
            let player = queue.shift();
            player.join(roomId);
            // 🔥 FIX ADDED: Quick Match me bhi sahi colors assign honge
            matchedPlayers.push({ id: player.id, color: colorPresets[requiredPlayers][i] });
        }

        rooms[roomId] = {
            capacity: requiredPlayers,
            players: matchedPlayers,
            selectedBoard: randomBoard
        };

        matchedPlayers.forEach(p => {
            io.to(p.id).emit('match-found', { 
                roomId: roomId, 
                color: p.color, 
                allPlayers: matchedPlayers, 
                selectedBoard: randomBoard,
                capacity: requiredPlayers
            });
        });

        io.to(roomId).emit('start-online-game', { 
            players: matchedPlayers, 
            selectedBoard: randomBoard,
            capacity: requiredPlayers 
        });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Frontend files loaded from: ${frontendPath}`);
});