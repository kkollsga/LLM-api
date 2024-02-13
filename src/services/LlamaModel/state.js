function mistral(message, role) {
    if (role === 'start') {
        return '<s>'
    }
    if (role === 'end') {
        return '</s>'
    }
    if (role==='user') {
        return `[INST] ${message} [/INST]`
    }
    return message
}
function zephyr(message, role) {
    if (role === 'start') {
        return '<s>'
    }
    if (role === 'end') {
        return '</s>'
    }
    return `\n<|${role}|>\n${message}`
}

function combineMessages(messages, format) {
    let formatter;
    if (format==='mistral') {
        formatter = mistral
    } else if (format==='zephyr') {
        formatter = zephyr
    }
    let formattedPrompt = formatter("","start")
    messages.forEach((message, index) => {
        formattedPrompt+=formatter(message.content,message.role)
    });
    formattedPrompt+=formatter("","end")
    return formattedPrompt.replace(/\n/g, '/');
}

class ModelState {
    constructor(logger) {
        this.outputBuffer = [];
        this.questionQueue = [];
        this.currentEmitter = null;
        this.responsePromise = null;
        this.responseResolve = null;
        this.responseReject = null;
        this.status = "Terminated";
        this.modelMeta = null;
        this.logger = logger
        this.process = null
        this.template = null;
        this.systemPrompt = "";
    }
    newModel(process, template, systemPrompt) {
        this.process = process;
        this.template=template;
        this.systemPrompt = "";
        if (systemPrompt) {
            this.systemPrompt = systemPrompt;
        }
    }
    getTemplate() {
        return this.template
    }
    processOutput(message) {
        if (this.currentEmitter && this.status === "Processing") {
            // If streaming is enabled, send data as it arrives
            this.currentEmitter.emit('data', message);
        } else {
            // Otherwise, accumulate data in the buffer
            this.outputBuffer.push(message);
        }
    }
    addQuestionToQueue(questionObject) {
        this.questionQueue.push(questionObject);
    }    
    processNextQuestion() {
        if (this.questionQueue.length > 0 && this.getStatus()[0] === "Idle") {
            this.setStatus("Processing");
            const questionObject = this.questionQueue.shift();
            const { messages, resolve, reject, emitterStream } = questionObject;
            if (this.systemPrompt !== "") {
                messages.unshift({ 'role': 'system', 'content': this.systemPrompt });
                this.systemPrompt = "";
            }

            const combinedPrompt = combineMessages(messages, this.template);
            if (emitterStream) {
                // If the question object requests streaming, set up the stream
                this.currentEmitter = emitterStream;
            } else {
                // For non-streaming, set up promise resolution
                this.responseResolve = resolve;
                this.responseReject = reject;
            }
            this.process.stdin.write(combinedPrompt + "\n");
        }
    }
    setStatus(newStatus, modelMeta=null) {
        const oldStatus = this.status;
        this.status = newStatus;
        if (newStatus==="Loading") {
            this.modelMeta = modelMeta;
        }

        if (oldStatus==="Loading" && newStatus==="Idle") {
            this.logger.log("Loading complete.")
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit('statusChange', newStatus);
        }
        this.logger.log(`Status changed from ${oldStatus} to ${newStatus}`);
    }
    getStatus() {
        return [this.status, this.modelMeta];
    }
    // Method to set the event emitter
    setEventEmitter(emitter) {
        this.eventEmitter = emitter;
    }
    responseHandle(status) {
        if (status === "resolved") {
            if (this.currentEmitter) {
                this.currentEmitter.emit('end');
            } else {
                this.responseResolve(this.getOutputs()); // Resolve with accumulated output
            }
        } else if (status === "error") {
            if (this.currentEmitter) {
                this.currentEmitter.emit('error', new Error("Error occurred while processing."));
            } else {
                this.responseReject(new Error("Error occurred while processing.")); // Reject promise
            }
        }  
        // Common cleanup tasks 
        this.setStatus("Idle");
        this.currentEmitter = null; // Reset emitter
        this.responseResolve = null;
        this.responseReject = null;
        this.processNextQuestion(); 
    }
    getOutputs() {
        const output = this.outputBuffer.join('');
        this.outputBuffer = []; // Clear the buffer
        return output;
    }
    cleanup() {
        if (this.status === "Processing") {
            // You might want to reject the promise with a specific error indicating that the operation was aborted
            if (this.responseReject) {
                this.responseHandle("error");
            }
        }
        while (this.questionQueue.length > 0) {
            const { reject } = this.questionQueue.shift();
            reject(new Error("Process was terminated before completion."));
        }
        this.setStatus("Terminated");
    }
}
module.exports = ModelState;