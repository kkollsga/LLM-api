const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const ModelState = require('./state');
const Logger = require('./logger');
const buildArgs = require('./buildArgs');
const setupEventListeners = require('./eventListeners');
const loadModelsFromFile = require('./loadModels');
const config = require('../../../config');

class LlamaModel {
    constructor() {
        this.logger = new Logger();
        this.state = new ModelState(this.logger);
        this.models = null;
        this.modelNames = {};
        // Initialize a Promise that resolves when models are loaded
        this.modelsLoadingPromise = this.loadModels();
    }
    async loadModels() {
        try {
            this.models = await loadModelsFromFile();
            for (const [modelName, modelDetails] of Object.entries(this.models)) {
                this.modelNames[modelName] = {
                    personalities: modelDetails.personalities ? Object.keys(modelDetails.personalities) : []
                };
            }
            this.logger.log('llama.cpp loaded.');
        } catch (err) {
            this.logger.error('Failed to load models:', err);
            throw err; // Rethrow to allow error handling where loadModels is awaited
        }
    }
    async loadModel(modelName, modelPersonality="none") {
        console.log("Loading model:", modelName, modelPersonality);
        await this.modelsLoadingPromise;
        const modelInfo = this.models[modelName];
        if (!modelInfo) {
            throw new Error(`Model '${modelName}' does not exist.`);
        }
        if (modelPersonality !== "" && modelPersonality !== "none" && !modelInfo.personalities[modelPersonality]) {
            throw new Error(`Personality '${modelPersonality}' does not exist for model '${modelName}'.`);
        }
    
        // Wait for the previous model to be fully unloaded before continuing
        if (this.state.getStatus()[0] !== "Terminated") {
            console.log("Terminating Model.");
            await this.unloadModel(); // Make sure unloadModel() returns a promise that resolves when the process is terminated
        }
    
        // Proceed with loading the new model
        let systemPrompt;
        if (modelPersonality !== "" && modelPersonality !== "none") {
            systemPrompt = modelInfo.personalities[modelPersonality];
        }
        const args = buildArgs(modelInfo.params);
        this.state.setStatus("Loading", {'model':modelName, 'personality':modelPersonality, 'meta':modelInfo});
        this.process = spawn(config['llamaMain'], args);
        this.state.newModel(this.process, modelInfo.template, systemPrompt);
        setupEventListeners(this.process, this.logger, this.state);
    }
    getModels() {
        return this.modelNames;
    }
    getTemplate() {
        return this.state.setTemplate();
    }
    askQuestion(messages) {
        // Return a promise that will be resolved or rejected when the question is processed
        return new Promise((resolve, reject) => {
            // Add the question and its corresponding resolve and reject functions to the queue
            this.state.addQuestionToQueue({ messages, resolve, reject });
            // If the model is idle, process the next question in the queue
            if (this.state.getStatus()[0] === "Idle") {
                this.state.processNextQuestion();
            }
        });
    }
    // New method for asking a question with streaming
    askQuestionStream(messages) {
        // Create an EventEmitter to stream the data
        const emitterStream = new EventEmitter();
        // Add the question to the queue with the stream object
        this.state.addQuestionToQueue({ messages, resolve: null, reject: null, emitterStream }); 
        // If the model is idle, process the next question in the queue
        if (this.state.getStatus()[0] === "Idle") {
            this.state.processNextQuestion();
        }

        // Return the stream to the caller
        return emitterStream;
    }
    unloadModel() {
        return new Promise((resolve) => {
            if (this.process && !this.process.killed) {
                this.process.kill('SIGINT'); // Send Ctrl+C signal
                this.process.on('exit', () => {
                    this.state.setStatus("Terminated");
                    resolve(); // Resolve the promise when the process exits
                });
            } else {
                resolve(); // Resolve immediately if there's no process to kill
            }
        });
    }
    cleanup() {
        this.state.cleanup()
    }
    wrappedEmitter() {
        return 
    }
}
module.exports = LlamaModel;
