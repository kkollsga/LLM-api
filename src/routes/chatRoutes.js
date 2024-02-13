const express = require('express');
const { prepStream } = require('../services/prepareStream'); // Adjust the path as necessary

let requestIdCounter = 1;
module.exports = function(llama) {
    const router = express.Router();

    router.post('/completions', async (req, res) => {
        const requestId = requestIdCounter++;
        //console.log(`[${requestId}] POST /completions route hit with body:`, req.body);
        const { messages, stream } = req.body;
    
        if (!messages || !messages.length || !messages[0].role) {
            console.log('Invalid or missing messages array');
            return res.status(400).send({ error: 'Invalid or missing messages array' });
        }
        if (stream) {
            // Use prepStream to set the SSE headers
            prepStream(res);
            const responseStream = llama.askQuestionStream(messages);
            responseStream.on('data', (data) => {
                res.write(`data: ${JSON.stringify({choices:[{delta:{content:data}}]})}\n\n`);
            });
            responseStream.on('end', () => {
                res.write(`data: [DONE]\n\n`);
                res.end();
                responseStream.removeAllListeners();
            });
            responseStream.on('error', (error) => {
                console.log('Stream error:', error); // Log stream errors
                //res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            });
        } else {
            try {
                let response = await llama.askQuestion(messages);
                res.json({ responses: response });
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        }
    });
    router.get('/errors', (req, res) => {
        // Check if the llama object and its logger are properly initialized
        if (!llama || !llama.logger) {
            return res.status(500).send({ error: 'Logger is not initialized' });
        }
        try {
            // Retrieve errors from the llama's logger
            const errors = llama.logger.getErrors();
            // Send the errors as a response
            // You might want to format this or handle it differently depending on your needs
            res.json({ errors });
        } catch (error) {
            console.error('Error retrieving logs:', error);
            res.status(500).send({ error: 'Failed to retrieve logs' });
        }
    });

    router.get('/ask', async (req, res) => {
        const { question, stream } = req.query;
        if (!question) {
            return res.status(400).send({ error: 'No question provided' });
        }
    
        try {
            if (stream === 'true') {
                // Set headers for SSE
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                });
    
                const responseStream = llama.askQuestionStream(question);
                responseStream.on('data', (data) => {
                    // Format the data according to the SSE specification
                    res.write(`data: ${JSON.stringify({ response: data })}\n\n`);
                });
    
                responseStream.on('end', () => {
                    // Signal the end of the event stream
                    res.write('event: end\ndata: null\n\n');
                    res.end();
                });
    
                responseStream.on('error', (error) => {
                    // In case of an error, send an error event
                    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                    res.end();
                });
    
                // Handle client disconnect
                req.on('close', () => {
                    responseStream.removeAllListeners();
                    res.end();
                });
            } else {
                let response = await llama.askQuestion(question);
                response = response.trim();
                if (response.startsWith('>')) {
                    response = response.substring(1).trim();
                }
                res.json({ question: question, response: response }); // Use res.json for consistency
            }
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    });
    
    

    // Other routes can be defined similarly

    return router;
};
