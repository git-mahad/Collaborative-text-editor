/**
 * Collaborative Text Editor - Backend Server
 * 
 * This server handles real-time text synchronization between multiple clients
 * using WebSockets for low-latency communication.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

// Initialize Express application
const app = express();

// Enable CORS for all HTTP routes
app.use(cors());

// Serve static files from the 'public' directory if needed
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server on top of HTTP server
const wss = new WebSocket.Server({ server });

// Store the current document state
let document = "";

// Track client connections with unique IDs
const clients = new Map();
let nextClientId = 1;

// Track user presence and activity
let activeUsers = {};

// Handle new WebSocket connections
wss.on('connection', (ws) => {
    const clientId = nextClientId++;
    
    // Add client to the map with a heartbeat timestamp
    clients.set(ws, {
        id: clientId,
        lastHeartbeat: Date.now(),
        username: `User ${clientId}`
    });
    
    console.log(`New client connected! ID: ${clientId}, Total clients: ${clients.size}`);
    
    // Send the current document state to the new client
    ws.send(JSON.stringify({ 
        type: 'init', 
        data: document,
        clientCount: clients.size,
        clientId: clientId,
        activeUsers: Object.values(activeUsers)
    }));
    
    // Broadcast to all clients that a new user has joined
    broadcastUserCount();
    
    // Handle incoming messages from this client
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const clientInfo = clients.get(ws);
            
            // Update the client's last heartbeat time
            if (clientInfo) {
                clientInfo.lastHeartbeat = Date.now();
            }
            
            switch(parsedMessage.type) {
                case 'update':
                    // Update the document with new content
                    document = parsedMessage.data;
                    
                    // Broadcast the update to all connected clients
                    broadcastDocumentUpdate(document, clientId);
                    break;
                    
                case 'ping':
                    // Respond to ping with pong to maintain connection
                    ws.send(JSON.stringify({type: 'pong'}));
                    break;
                    
                case 'cursor':
                    // Update user cursor position
                    if (clientInfo) {
                        const position = parsedMessage.position;
                        activeUsers[clientId] = {
                            id: clientId,
                            username: clientInfo.username,
                            position: position,
                            lastActive: Date.now()
                        };
                        // Broadcast cursor position to all clients
                        broadcastCursorPosition(clientId, position);
                    }
                    break;
                    
                case 'username':
                    // Update username
                    if (clientInfo && parsedMessage.username) {
                        clientInfo.username = parsedMessage.username;
                        if (activeUsers[clientId]) {
                            activeUsers[clientId].username = parsedMessage.username;
                        }
                        broadcastUserList();
                    }
                    break;
                    
                default:
                    console.log(`Received unknown message type: ${parsedMessage.type}`);
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            const clientId = clientInfo.id;
            clients.delete(ws);
            
            // Remove from active users
            if (activeUsers[clientId]) {
                delete activeUsers[clientId];
            }
            
            console.log(`Client ${clientId} disconnected! Remaining clients: ${clients.size}`);
            broadcastUserCount();
            broadcastUserList();
        }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

/**
 * Broadcasts the current document to all connected clients
 * @param {string} content - The current document content
 * @param {number} senderId - The ID of the client who sent the update
 */
function broadcastDocumentUpdate(content, senderId) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'update',
                data: content,
                senderId: senderId
            }));
        }
    });
}

/**
 * Broadcasts the current number of connected users to all clients
 */
function broadcastUserCount() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'userCount',
                count: clients.size
            }));
        }
    });
}

/**
 * Broadcasts cursor position to all other clients
 * @param {number} clientId - The ID of the client whose cursor moved
 * @param {object} position - The cursor position data
 */
function broadcastCursorPosition(clientId, position) {
    wss.clients.forEach((client) => {
        const receiverInfo = clients.get(client);
        
        // Don't send cursor position back to the sender
        if (client.readyState === WebSocket.OPEN && receiverInfo && receiverInfo.id !== clientId) {
            client.send(JSON.stringify({
                type: 'cursor',
                userId: clientId,
                username: activeUsers[clientId]?.username || `User ${clientId}`,
                position: position
            }));
        }
    });
}

/**
 * Broadcasts the complete list of active users
 */
function broadcastUserList() {
    const userList = Object.values(activeUsers);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'userList',
                users: userList
            }));
        }
    });
}

/**
 * Check for stale connections periodically and clean them up
 */
setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 60 seconds timeout
    
    clients.forEach((info, ws) => {
        if (now - info.lastHeartbeat > timeout) {
            console.log(`Client ${info.id} timed out. Closing connection.`);
            ws.terminate();
            clients.delete(ws);
            
            // Remove from active users
            if (activeUsers[info.id]) {
                delete activeUsers[info.id];
            }
        }
    });
    
    if (clients.size > 0) {
        broadcastUserCount();
        broadcastUserList();
    }
}, 30000); // Check every 30 seconds

// Define server port, using environment variable if available
const PORT = 3000;

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        connections: clients.size,
        uptime: process.uptime()
    });
});

// Add endpoint to get active users
app.get('/api/users', (req, res) => {
    res.status(200).json({
        count: clients.size,
        users: Object.values(activeUsers)
    });
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    
    // Close all WebSocket connections
    wss.clients.forEach(client => {
        client.close();
    });
    
    // Close the HTTP server
    server.close(() => {
        console.log('Server shut down complete');
        process.exit(0);
    });
});