function setupEventListeners(process, logger, modelState) {
    if (!process) {
        throw new Error('No process provided for setting up event listeners.');
    }
    process.stdout.on('data', (data) => {
        const dataStr = data.toString();
        if (dataStr.includes('>')) { // Check for the trigger character
            const currStatus = modelState.getStatus()[0];
            if (currStatus === "Processing") {
                modelState.responseHandle("resolved");
            } else if (currStatus !=="Idle") {
                modelState.setStatus("Idle");
            }
        }
        modelState.processOutput(dataStr); // Add to output buffer
    });
    process.stderr.on('data', (data) => {
        const dataStr = data.toString();
        if (modelState.getStatus()[0] === "Loading") {
            logger.loadLog(dataStr);
        } else {
            if (modelState.getStatus()[0] === "Processing") {
                modelState.responseHandle("error");
            }
            logger.log(dataStr, "error");
        }
    });
    process.on('error', (err) => {
        logger.log('Failed to start subprocess.', 'error');
        modelState.cleanup(); // Cleanup resources
    });
    process.on('exit', (code, signal) => {
        logger.log(`Process exited with code ${code}, signal ${signal}`, 'error');
        modelState.cleanup(); // Ensure cleanup happens on normal exit as well
    });
    process.on('close', (code) => {
        logger.log(`child process exited with code ${code}`, 'error');
        modelState.cleanup();
    });
}

module.exports = setupEventListeners;