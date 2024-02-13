const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

module.exports = (llama) => {
    console.log("Loading endpoints.");
    const statusEmitter = new EventEmitter();
    llama.state.setEventEmitter(statusEmitter);
    router.get('/models', async (req, res) => {
        try {
            await llama.loadModels();
            // Assuming llama.models is now populated
            const modelNames = llama.getModels();
            res.json(modelNames);
        } catch (err) {
            // If there's an error loading the models, respond with an error message
            res.status(500).json({ error: `Failed to load models: ${err.message}` });
        }
    });
    router.post('/loadModel', (req, res) => {
        const { model, personality } = req.body;
        if (!model) {
            return res.status(400).json({ error: 'Model parameter is required' });
        }
        try {
            const result = llama.loadModel(model, personality);
            res.json({ message: result });
        } catch (error) {
            res.status(500).json({ error: 'Failed to load model' });
        }
    });
    router.get('/unloadModel', (req, res) => {
        try {
            llama.unloadModel();
            res.json({ message: "Model unloaded." });
        } catch (error) {
            res.status(500).json({ error: 'Failed to load model' });
        }
    })

    router.get('/status', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const sendStatus = () => {
            const [ status, meta ] = llama.state.getStatus();
            const modelNames = llama.getModels();
            res.write(`event: message\ndata: ${JSON.stringify({ status:status, info:meta, models:modelNames })}\n\n`);
        };
        sendStatus();
        statusEmitter.on('statusChange', sendStatus);
        req.on('close', () => {
            statusEmitter.removeListener('statusChange', sendStatus);
            res.end();
        });
    });
    router.get('/ping', (req, res) => {
        res.status(200).send('pong');
    });

    return router;
};
