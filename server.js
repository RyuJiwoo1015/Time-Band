const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 여러 개의 방을 ID별로 쪼개서 관리하는 분리형 인메모리 DB
let rooms = {};

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    let currentRoomId = null;

    // 특정 방에 입장 요청을 보냈을 때
    socket.on('join-room', (roomId) => {
        currentRoomId = roomId;
        socket.join(roomId);

        // 해당 방에 기존 데이터가 있으면 넘겨주고, 없으면 빈 값 전송
        if (rooms[roomId]) {
            socket.emit('init-state', rooms[roomId]);
        } else {
            socket.emit('init-state', { roomConfig: null, inputData: {} });
        }
    });

    // 새로운 방을 생성했을 때
    socket.on('create-room', ({ roomId, config }) => {
        rooms[roomId] = {
            roomConfig: config,
            inputData: {}
        };
        io.to(roomId).emit('room-updated', rooms[roomId]);
    });

    // 일정을 제출했을 때 (자신이 속한 방 ID에만 데이터 반영)
    socket.on('submit-schedule', (data) => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        rooms[currentRoomId].inputData[data.pos] = {
            name: data.name,
            blockedTimes: data.blockedTimes
        };

        // 같은 방에 접속해 있는 사람들에게만 실시간 방송
        io.to(currentRoomId).emit('room-updated', rooms[currentRoomId]);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Time Band 실시간 서버가 ${PORT}번 포트에서 가동 중입니다.`);
});
});