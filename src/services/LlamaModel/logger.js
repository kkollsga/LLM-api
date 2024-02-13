const config = require('../../../config');

function extractBetween(text) {
    const patterns = [
        { start: "Device", end: ", compute", keepStart: true, keepEnd: false },
        { start: `${config['llmStorage']}\\`, end: " (version", keepStart: false, keepEnd: false, prefix:"Model: "},
        { start: "llm_load_tensors:", end: "", keepStart: false, keepEnd: false, prefix:"Tensors: " }
    ];
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let results = [];
    patterns.forEach(({ start, end, keepStart = false, keepEnd = false, prefix = '', suffix = '' }) => {
        // Adjust the pattern to handle an empty end string
        const pattern = end ?
            `${escapeRegExp(start)}(.*?)${escapeRegExp(end)}` :
            `${escapeRegExp(start)}([^\n]*)`;
        const regex = new RegExp(pattern, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
            let extracted = match[1];
            if (keepStart) extracted = start + extracted;
            if (keepEnd && end) extracted = extracted + end;
            results.push(prefix + extracted.trim() + suffix); // Add prefix and suffix
        }
    });
    return results;
}

class Logger {
    constructor() {
        this.buffer = {
            'loading': [],
            'info': [],
            'error': []
        }
        this.errorBuffer = [];
        this.loadingLog = [];
    }
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        this.buffer[level].push(logMessage)

        if (level === 'error') {
            console.error(`[${level.toUpperCase()}] ${logMessage}`);
        } else {
            console.log(`[${level.toUpperCase()}] ${logMessage}`);
        }
    }
    loadLog(message) {
        const extractedText = extractBetween(message);
        for (const t in extractedText) {
            this.log(extractedText[t].trim(), 'loading');
        }
    }
    getErrors() {
        const errors = this.errorBuffer.join('');
        this.errorBuffer = []; // Clear the buffer
        console.log("Errors requested:", errors);
        return errors;
    }
}

module.exports = Logger;