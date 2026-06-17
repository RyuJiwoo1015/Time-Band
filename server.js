const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 고유 방 ID별로 데이터를 나누어 저장하는 저장소
let rooms = {};

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    let currentRoomId = null;

    // 1. 방 입장 요청 (초대 링크나 개설 완료 후 진입 시)
    socket.on('join-room', (roomId) => {
        currentRoomId = roomId;
        socket.join(roomId);

        // 방이 이미 존재하면 그 데이터를 보내고, 없으면 빈 상태를 보냄
        if (rooms[roomId]) {
            socket.emit('init-state', rooms[roomId]);
        } else {
            socket.emit('init-state', { roomConfig: null, inputData: {} });
        }
    });

    // 2. 방 최초 개설 요청 (여기에 룸 생성 및 전원 동기화 로직을 확실하게 고정)
    socket.on('create-room', ({ roomId, config }) => {
        currentRoomId = roomId;
        socket.join(roomId);
        
        // 서버 메모리에 방 정보 등록
        rooms[roomId] = {
            roomConfig: config,
            inputData: {}
        };
        
        // 방에 있는 모든 사람에게 방이 만들어졌음을 알리고 UI 전환 트리거
        io.to(roomId).emit('room-updated', rooms[roomId]);
    });

    // 3. 개인 일정 제출 요청
    socket.on('submit-schedule', (data) => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        rooms[currentRoomId].inputData[data.pos] = {
            name: data.name,
            blockedTimes: data.blockedTimes
        };

        io.to(currentRoomId).emit('room-updated', rooms[currentRoomId]);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Time Band 실시간 서버가 ${PORT}번 포트에서 가동 중입니다.`);
});