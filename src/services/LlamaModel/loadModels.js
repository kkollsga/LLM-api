const fs = require('fs').promises;
const path = require('path');

async function loadModelsFromFile() {
    const modelsFilePath = path.join(__dirname, '..', '..', '..', 'data', 'models.json');

    try {
        const data = await fs.readFile(modelsFilePath, 'utf8');
        const models = JSON.parse(data);
        return models; // Return the parsed models data
    } catch (err) {
        console.error('Error loading models:', err);
        throw err; // Rethrow the error to be handled by the caller
    }
}

module.exports = loadModelsFromFile;