const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ไฟล์ Frontend (index.html) จะอยู่ในโฟลเดอร์ public
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

        // 1. CHAT Event (ข้อความแชทจริง) - ส่งผ่านช่อง 'chat' (จะถูกอ่านออกเสียงใน Frontend)
        connection.on(WebcastEvent.CHAT, data => {
            socket.emit('chat', {
                nickname: data.user.nickname,
                comment: data.comment
            });
        });

        // 2. GIFT Event (ของขวัญ) - ส่งผ่านช่อง 'gift' (จะไม่ถูกอ่านออกเสียง)
        connection.on(WebcastEvent.GIFT, data => {
            const giftMessage = `🎁 ${data.user.nickname} ส่ง ${data.giftName} (x${data.repeatCount})`;
            socket.emit('gift', {
                message: giftMessage,
                is_repeat: data.repeatCount > 1
            });
        });

        // 3. LIKE Event (ถูกใจ) - ส่งผ่านช่อง 'like' (จะไม่ถูกอ่านออกเสียง)
        connection.on(WebcastEvent.LIKE, data => {
            const likeMessage = `❤️ ${data.user.nickname} กดถูกใจ x${data.likeCount} ครั้ง`;
            socket.emit('like', {
                message: likeMessage,
                count: data.likeCount
            });
        });
        
        // **หมายเหตุ: Event อื่นๆ เช่น Follow, Share, Join จะต้องจัดการแยกช่องทางด้วยเช่นกัน**
        
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
