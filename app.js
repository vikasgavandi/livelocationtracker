const express = require('express');
const app = express();
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
const PORT = 3000;

app.use(cors());

const server = http.createServer(app);
const io = socketio(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Object to store connected clients and their locations
let clients = {};

// Function to get connected user list
function getUsersList() {
    return Object.values(clients).map(client => ({
        id: client.id,
        username: client.username,
        latitude: client.latitude,
        longitude: client.longitude
    }));
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Add client to the clients object with initial empty location and default username
    clients[socket.id] = { id: socket.id, username: `User${socket.id.slice(0, 5)}`, latitude: 0, longitude: 0 };

    // Emit current clients to the newly connected client
    socket.emit('currentUsers', getUsersList());

    // Broadcast new user to all clients
    socket.broadcast.emit('newUserConnected', clients[socket.id]);

    // Handle sendLocation event from clients
    socket.on('sendLocation', (data) => {
        // Update client's location
        clients[socket.id].latitude = data.latitude;
        clients[socket.id].longitude = data.longitude;

        // Broadcast updated location to all clients
        io.emit('locationUpdate', clients[socket.id]);
    });

    // Handle changeUsername event
    socket.on('changeUsername', (newUsername) => {
        // Update client's username
        clients[socket.id].username = newUsername;

        // Broadcast updated username to all clients
        io.emit('usernameUpdate', { id: socket.id, username: newUsername });
        io.emit('userListUpdate', getUsersList()); // Update user list for all clients
    });

    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete clients[socket.id];
        // Notify all clients that a user has disconnected
        io.emit('userDisconnect', socket.id);
        io.emit('userListUpdate', getUsersList()); // Update user list for all clients
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
