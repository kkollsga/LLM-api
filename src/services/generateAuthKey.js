const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Directory and file path
const dataDirectory = path.join(__dirname, '../../data');
const filePath = path.join(dataDirectory, 'authKeys.json');

// Generate a random key
const authKey = crypto.randomBytes(16).toString('hex');

// Command line arguments (Name and Description)
const name = process.argv[2] || 'Default Name';
const description = process.argv[3] || 'No description provided';

// Current date and time
const createdAt = new Date().toISOString();

// Ensure the data directory exists
if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory);
}

// Read existing keys or initialize an empty object
let existingKeys = {};
if (fs.existsSync(filePath)) {
    existingKeys = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Add new key with its details
existingKeys[authKey] = {
    name,
    description,
    createdAt,
    lastActivity: null
};

// Write the updated keys to the authKeys.json file
fs.writeFile(filePath, JSON.stringify(existingKeys, null, 2), (err) => {
    console.log(existingKeys)
    if (err) {
        console.error('Error writing key to file:', err);
    } else {
        console.log(`Auth Key generated and stored in ${filePath}`);
        console.log(`Auth Key: ${authKey}`);
    }
});
// node src/services/generateAuthKey.js "MyKeyName" "This key is for testing purposes"