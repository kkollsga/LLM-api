const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { checkAuth } = require('./services/auth');
const LlamaModel = require('./services/LlamaModel/LlamaModel');
const config = require('../config');
const models = require('../data/models.json');

const app = express();

// Middleware setup
function setupMiddleware() {
    app.use(cors()); // Enable CORS for all routes
    app.use(express.static('public')); // Serve static files
    app.use(express.json()); // Middleware for parsing JSON bodies

    // Custom middleware for authentication, excluding ACME challenge
    app.use((req, res, next) => {
        if (!req.path.startsWith('/.well-known/acme-challenge/')) {
            checkAuth(req, res, next);
        } else {
            next();
        }
    });
}

// HTTPS/HTTP server setup
function setupServer() {
    if (config.useSSL) {
        const credentials = {
            key: fs.readFileSync(path.join(__dirname, config.privateKeyPath), 'utf8'),
            cert: fs.readFileSync(path.join(__dirname, config.certificatePath), 'utf8'),
            ca: fs.readFileSync(path.join(__dirname, config.caChainPath), 'utf8'),
            passphrase: config.passphrase
        };
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(config.port, config.host, () => {
            console.log(`HTTPS server running on https://${config.host}:${config.port}`);
        });
    } else {
        const httpServer = http.createServer(app);
        httpServer.listen(config.port || 80, config.host, () => {
            console.log(`HTTP server running on http://${config.host}:${config.port || 80}`);
        });
    }
}

// Load and configure models and routes
async function loadModelAndRoutes() {
    const llama = new LlamaModel(models);
    try {
        // Import and use routes
        const chatRoutes = require('./routes/chatRoutes')(llama);
        const rootRoutes = require('./routes/rootRoutes')(llama);
        app.use('/chat', chatRoutes);
        app.use('/', rootRoutes);

        setupServer(); // Move server setup here, ensuring it starts after models are loaded
    } catch (error) {
        console.error('Failed to start API:', error);
        // Handle error, potentially shutting down the server or retrying model loading
    }
}

// Initialize the application
async function initializeApp() {
    setupMiddleware();
    await loadModelAndRoutes();
}
initializeApp().catch(error => console.error('Failed to initialize app:', error));
