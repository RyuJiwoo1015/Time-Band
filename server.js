const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let roomConfig = null;
let inputData = {};

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    socket.emit('init-state', { roomConfig, inputData });

    socket.on('create-room', (config) => {
        roomConfig = config;
        inputData = {}; 
        io.emit('room-updated', { roomConfig, inputData });
    });

    socket.on('submit-schedule', (data) => {
        inputData[data.pos] = {
            name: data.name,
            blockedTimes: data.blockedTimes
        };
        io.emit('room-updated', { roomConfig, inputData });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Time Band 실시간 서버가 ${PORT}번 포트에서 가동 중입니다.`);
});