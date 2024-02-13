const fs = require('fs');
const path = require('path');
const config = require('../../config'); // Adjust the path as necessary

// Function to read all auth keys from the file
function readAuthKeys() {
    const filePath = path.join(__dirname, '../../data/authKeys.json');
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        return {};
    }
}

// Function to update the last activity of a key
function updateLastActivity(authKey) {
    const filePath = path.join(__dirname, '../../data/authKeys.json');
    const keys = readAuthKeys();

    if (keys[authKey]) {
        keys[authKey].lastActivity = new Date().toISOString();

        fs.writeFileSync(filePath, JSON.stringify(keys, null, 2));
    }
}

// Middleware to check the auth key
function checkAuth(req, res, next) {
    const keys = readAuthKeys();
    let key = req.query.authKey;

    if (!key) {
        key = req.header('Authorization');
        if (key && key.startsWith("Bearer ")) {
            key = key.slice(7); // Remove "Bearer " from the start
        }
    }
    if (key && keys[key]) {
        updateLastActivity(key);
        req.user = keys[key]; // Add the user object to the request
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}

module.exports = { checkAuth };
