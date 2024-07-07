document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([0, 0], 10);
    let markers = {}; // Object to store markers by user ID
    let userList = {}; // Object to store user data for list display

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© vikas developer'
    }).addTo(map);

    const socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        // Initially set username (can be handled based on your application flow)
        const username = prompt('Enter your username:');
        if (username.trim() !== '') {
            socket.emit('changeUsername', username.trim());
        } else {
            alert('Username cannot be empty. Refresh the page to try again.');
        }
    });

    socket.on('currentUsers', (users) => {
        users.forEach(user => {
            userList[user.id] = user;
            const { id, latitude, longitude, username } = user;
            markers[id] = L.marker([latitude, longitude]).addTo(map);
            markers[id].bindPopup(`${username}`).openPopup();
        });
        updateUsersList(); // Update user list UI
    });

    socket.on('locationUpdate', (data) => {
        const { id, latitude, longitude } = data;
        if (markers[id]) {
            markers[id].setLatLng([latitude, longitude]);
        } else {
            markers[id] = L.marker([latitude, longitude]).addTo(map);
            markers[id].bindPopup(`${data.username}`).openPopup();
        }
    });

    socket.on('usernameUpdate', (data) => {
        const { id, username } = data;
        if (markers[id]) {
            markers[id].bindPopup(`${username}`).openPopup();
        }
        userList[id].username = username; // Update username in user list
        updateUsersList(); // Update user list UI
    });

    socket.on('userListUpdate', (users) => {
        users.forEach(user => {
            userList[user.id] = user;
        });
        updateUsersList(); // Update user list UI
    });

    socket.on('userDisconnect', (id) => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
        delete userList[id]; // Remove user from user list
        updateUsersList(); // Update user list UI
    });

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            socket.emit('sendLocation', { latitude, longitude });
            console.log(`Location sent: Latitude - ${latitude}, Longitude - ${longitude}`);

            // Update map position for self
            map.setView([latitude, longitude], 13);

            // Add a marker or update the existing marker for self
            if (!markers['self']) {
                markers['self'] = L.marker([latitude, longitude]).addTo(map);
                markers['self'].bindPopup('You are here').openPopup();
            } else {
                markers['self'].setLatLng([latitude, longitude]);
            }
        }, (error) => {
            console.error(error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }

    // Function to update user list UI
    function updateUsersList() {
        const usersListElement = document.getElementById('usersList');
        usersListElement.innerHTML = ''; // Clear previous list

        for (const userId in userList) {
            const user = userList[userId];
            const listItem = document.createElement('li');
            listItem.textContent = `${user.username} (${user.id})`;
            usersListElement.appendChild(listItem);
        }
    }
});
