const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); 

let connection = null;

io.on('connection', (socket) => {
    console.log('Frontend connected');

    socket.on('start', ({ uniqueId }) => {
        if (connection) {
            connection.disconnect();
            connection = null;
        }

        connection = new TikTokLiveConnection(uniqueId);

        connection.connect().then(state => {
            console.log('Connected to roomId', state.roomId);
            socket.emit('connected', { roomId: state.roomId });
        }).catch(err => {
            console.error('Connect error', err);
            socket.emit('error', { msg: err.toString() });
        });

        // ✅ 1. CHAT Event (ส่งเฉพาะข้อความแชทจริง)
        connection.on(WebcastEvent.CHAT, data => {
            socket.emit('chat', {
                nickname: data.user.nickname,
                comment: data.comment
            });
        });

        // ❌ ลบ Event LISTENERS สำหรับ GIFT, LIKE และอื่นๆ ออก
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
