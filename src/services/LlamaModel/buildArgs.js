/**
 * Translates model parameters into command-line arguments for llama.cpp.
 * @param {Object} params - The model parameters.
 * @returns {Array} The command-line arguments array.
 */
function buildArgs(params) {
    const args = [];
    // Model file path
    if (params.model) {
        args.push('--model', params.model); // Specify the path to the LLaMA model file.
    }
    // Interactive mode
    if (params.interactive) {
        args.push('--interactive'); // Run the program in interactive mode for real-time input and responses.
    }
    // Instruction mode
    if (params.instruct) {
        args.push('--instruct'); // Use instruction mode, suitable for tasks with Alpaca models.
    }
    // Context size
    if (params.ctxSize) {
        args.push('--ctx-size', String(params.ctxSize)); // Define the context size for better handling of longer inputs.
    }
    // Temperature
    if (params.temperature !== undefined) {
        args.push('--temp', String(params.temperature)); // Adjust the randomness of generated text.
    }
    // Repeat penalty
    if (params.repeatPenalty !== undefined) {
        args.push('--repeat-penalty', String(params.repeatPenalty)); // Penalize token repetition to encourage diversity.
    }
    // Interactive First
    if (params.interactiveFirst) {
        args.push('--interactive-first'); // Start in interactive mode and wait for user input.
    }
    // Prompt file
    if (params.promptFile) {
        args.push('--file', params.promptFile); // Provide a file containing prompts.
    }
    // Number of Threads
    if (params.threads !== undefined) {
        args.push('--threads', String(params.threads)); // Set the number of threads for generation.
    }
    // Thread Batch
    if (params.threadsBatch !== undefined) {
        args.push('--threads-batch', String(params.threadsBatch)); // Set the number of threads for batch processing.
    }
    // Prompt Cache
    if (params.promptCache) {
        args.push('--prompt-cache', params.promptCache); // Specify a file to cache the prompt state.
    }
    // Keep Prompt
    if (typeof params.keepPrompt === 'boolean' && params.keepPrompt) {
        args.push('--keep', '-1'); // If keepPrompt is true (boolean), keep initial prompt when model runs out of context.
    } else if (typeof params.keepPrompt === 'number') {
        args.push('--keep', String(params.keepPrompt)); // Keep n tokens from initial prompt
    }
    // GPU Layer Offloading
    if (params.gpuLayers !== undefined) {
        args.push('--n-gpu-layers', String(params.gpuLayers)); // Number of layers to offload to GPU.
    }
    // Grammar
    if (params.grammar) {
        args.push('--grammar', params.grammar); // Specify a grammar to constrain model output.
    }
    // Grammar File
    if (params.grammarFile) {
        args.push('--grammar-file', params.grammarFile); // Specify a file containing grammar rules.
    }
    // Number of tokens to predict
    if (params.nPredict !== undefined) {
        args.push('-n', String(params.nPredict)); // Set the number of tokens to predict, influencing text length.
    }
    // Reverse prompt
    if (params.reversePrompt) {
        args.push('-r', params.reversePrompt); // Use reverse prompts to create interactive, chat-like experiences.
    }
    // Input prefix
    if (params.inPrefix) {
        args.push('--in-prefix', params.inPrefix); // Add a prefix to inputs, useful with reverse prompts.
    }
    // Input suffix
    if (params.inSuffix) {
        args.push('--in-suffix', params.inSuffix); // Append a suffix to inputs, aiding in structured dialogues.
    }
    // Top-k sampling
    if (params.topK !== undefined) {
        args.push('--top-k', String(params.topK)); // Limit token selection to the top K most likely tokens.
    }
    // Top-p (nucleus) sampling
    if (params.topP !== undefined) {
        args.push('--top-p', String(params.topP)); // Use top-p sampling for a balance between diversity and quality.
    }
    // Ignore End of Sequence
    if (params.ignoreEOS) {
        args.push('--ignore-eos'); // Continue generating text without producing End-of-Sequence tokens.
    }
    // Random Prompt
    if (params.randomPrompt) {
        args.push('--random-prompt'); // Start with a randomized prompt.
    }
    // Logit Bias
    if (params.logitBias && Array.isArray(params.logitBias)) {
        params.logitBias.forEach(({ tokenID, bias }) => {
            args.push('-l', `${tokenID}${bias >= 0 ? '+' : ''}${bias}`);
        });
    }
    // RNG Seed
    if (params.seed !== undefined) {
        args.push('--seed', String(params.seed)); // Set RNG seed for reproducibility.
    }
    // Mlock
    if (params.mlock) {
        args.push('--mlock'); // Lock the model in memory to prevent swapping.
    }
    // No Memory Map
    if (params.noMmap) {
        args.push('--no-mmap'); // Disable memory-mapping of the model file.
    }
    // NUMA Support
    if (params.numa) {
        args.push('--numa'); // Enable optimizations for non-uniform memory access systems.
    }
    // Batch Size
    if (params.batchSize !== undefined) {
        args.push('--batch-size', String(params.batchSize)); // Set the batch size for prompt processing (default: 512).
    }
    return args;
}

module.exports = buildArgs;
