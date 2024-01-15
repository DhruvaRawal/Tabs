const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ShareDB = require('sharedb');
const richText = require('rich-text');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const share = new ShareDB();

const connection = share.connect();
const documents = connection.get('documents');

app.use(express.static('public'));

app.get('/:documentId', (req, res) => {
    const documentId = req.params.documentId;
    const document = documents.get(documentId);
    res.sendFile(__dirname + '/public/editor.html');
});

io.on('connection', (socket) => {
    const documentId = socket.handshake.query.documentId;
    const document = documents.get(documentId);

    socket.join(documentId);

    document.subscribe((err) => {
        if (err) throw err;

        const data = document.data;
        socket.emit('load', data);

        document.on('op', (op, source) => {
            if (source !== socket.id) {
                socket.broadcast.to(documentId).emit('op', op);
            }
        });
    });

    socket.on('op', (ops) => {
        document.submitOp(ops, { source: socket.id });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
