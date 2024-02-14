# LLM-API Documentation

# Overview

The LLM-API is designed as a comprehensive solution for integrating Large Language Models (LLMs) into your projects. By wrapping around llama.cpp, it provides a versatile API that facilitates both local and online interactions with LLMs, and it is set up to support secure communication through SSL. It's compatible with standard OpenAI endpoints, allowing for seamless integration with the OpenAI Python library. Additionally, a separate front-end application suitable for hosting on platforms like Firebase will be provided, enhancing the API's utility with an accessible user interface.

## Prerequisites
Before you begin setting up the LLM-API, ensure you have the following prerequisites installed and set up:

- *Node.js and npm (or Yarn)*: Required for managing the project's JavaScript dependencies.
- *llama.cpp*: The core dependency that interfaces with LLMs.
- *CMake*: A cross-platform tool required for building the llama.cpp library.
- *HuggingFace account*: Necessary for accessing and downloading LLM models.
- *winACME tool (or equivalent)*: Used for obtaining SSL certificates for secure communication (recommended).
- *CUDA*: For GPU acceleration, enhancing the performance of LLMs.
- *Python*: Required for running test scripts and can be used for interacting with the API.


## Installation guide

1. **Repository Setup**
Clone the LLM-API repository to your local machine using the following command:
```bash
   git clone https://github.com/kkollsga/LLM-api.git
```

2. **Dependency Installation**
Navigate to the cloned repository and install all necessary dependencies using npm or Yarn:
```bash
    cd llm-api
    npm install 
    # Or if you prefer yarn
    yarn install
```

3. **SSL Certificate Configuration**
To securely host the API, an SSL certificate is required:
- It is recommended to start by setting up a Dynamic DNS (DDNS) to associate your IP with a domain name (not required).
- Install and configure winACME (or an equivalent tool for your operating system) following its [official documentation](https://www.win-acme.com/manual/getting-started).
- Place the acquired SSL certificate files in the ./ssl directory.

4. **CUDA installation**
For improved LLM performance through GPU acceleration, install CUDA following the instructions on the official NVIDIA [CUDA Downloads page](https://developer.nvidia.com/cuda-downloads).

5. **Setting Up `llama.cpp`**
Clone and build the llama.cpp using library following the [instructions](https://github.com/ggerganov/llama.cpp/blob/master/README.md).
Build using [CMake](https://cmake.org/download/):
```bash
    git clone https://github.com/ggerganov/llama.cpp
    cd llama.cpp
    mkdir build
    cd build
    cmake .. -DLLAMA_CUBLAS=ON
    cmake --build . --config Release
```
*This example set up builds llama.cpp with CUDA.*

6. **Downloading a GGUF Model**
- If you haven't already, create an account on Hugging Face.
- Select and download a GGUF model from the Hugging Face model hub.
- Save the model to a known location, e.g., D:\LLMs\YourModelDirectory.

7. **Update Configuration:**
Rename config.js.template (to config.js) in the root of the project and configure it according to your setup, including paths to the SSL certificate files, llama.cpp executable, and LLM storage.

8. **Model Configuration**
Rename data/models.json.template and modify to run the downloaded models. Supports setting up model personalities. See [main readme](https://github.com/ggerganov/llama.cpp/blob/master/examples/main/README.md) for details on run configuration. Supported configurations can be found in src/services/LlamaModel/buildArgs.js


9. **Authentication Key Generation**
Generate an authentication key for secure access to the API:
```bash
    node src/services/generateAuthKey.js "PythonKey" "This key is for testing purposes"
```

10. **Starting the API**
Launch the LLM-API server:
```bash
node src/app.js
```

## Usage Instructions

### Python Integration
The LLM-API is compatible with the OpenAI library. Use the provided Python code examples to load models, send requests, and receive responses, both in standard and streaming modes.

*First load the modell by accessing the /loadModel end point*
```python
import requests
import json
def send_post_request(url, data=None, headers=None):
    response = requests.post(url, data=json.dumps(data), headers=headers)
    return response
    
api_url = 'https://<api url>'
authKey = '<auth key>'

modelname = 'Mistral-7b' # from models.json
personality = 'geography teacher'

# Load Model
data = { "model": modelname, "personality": personality }
headers = { 
    "Content-Type": "application/json",
    "Authorization": f"Bearer {authKey}"
}
send_post_request(f"{api_url}/loadModel", data=data, headers=headers)
```

*No streaming mode:*
```python
from openai import OpenAI
from IPython.display import Markdown
client = OpenAI(api_key=authKey, base_url=api_url)
response = client.chat.completions.create(
    model="NotNeeded",
    messages=[
        {"role": "user", "content": "Can you summarize the history of France?"}
    ],
    stream=False,
)
Markdown(response.responses)
```

*Streaming mode:*
```python
client = OpenAI(api_key=authKey, base_url=api_url)
response = client.chat.completions.create(
    model="NotNeeded", 
    messages=[
        {"role": "user", "content": "Tell me about your trip to Paris."}
    ],
    stream=True  # Enable streaming
)
# Iterate over streamed responses
for chunk in response:
    print(chunk.choices[0].delta.content, end="")
```

## Endpoints

### Root Routes (`/`)

* **GET /models** 
  *  **Purpose:** Lists currently loaded AI models.
  *  **Response:**
     *  **Success (200):** JSON array of model names (e.g., `["model1", "model2"]`)
     *  **Error (500):** JSON object with an error message (e.g., `{"error": "Failed to load models: ..."}`)

* **POST /loadModel**
  *  **Purpose:** Loads an AI model.
  *  **Parameters:**
      *  `model`: Name/identifier of the model to load
      *  `personality`: (Optional) Personality configuration for the model
  *  **Response:**
     *  **Success (200):** JSON object with a success message or other relevant output (e.g., `{"message": "Model loaded successfully"}`)
     *  **Error (400):** JSON object with an error message if the model parameter is missing.
     *  **Error (500):** JSON object with an error message if the loading fails.

* **GET /unloadModel**
  *  **Purpose:** Unloads the currently active AI model.
  *  **Response:**
     *  **Success (200):** JSON object with a success message (e.g., `{"message": "Model unloaded."}`)
     *  **Error (500):** JSON object with an error message if the unloading fails.

* **GET /status**  
  *  **Purpose:** Provides real-time status updates about the AI model(s). Uses Server-Sent Events (SSE) to stream updates.
  *  **Response:**
     *  **Event Stream Format:**  Each event has the following data format:
        ```
        event: message
        data: {"status": "...", "info": "...", "models": ["...", "..."]}
        ```
        *   `status`: General status of the model (e.g., "loading", "ready", "error")
        *   `info`: Additional status information 
        *   `models`: An array of currently loaded model names.

* **GET /ping**
  *  **Purpose:** Simple health check endpoint.
  *  **Response:**
      * **Success (200):** Text response "pong"

### Chat Routes (`/chat`)

* **POST /completions**
  *  **Purpose:** Generates chat responses from the AI model. Can be used for both regular responses and streaming responses.
  *  **Parameters:**
     *  `messages`:  An array of message objects, each with at least a  `role` property (e.g., "user" or "system").
     *  `stream`: (Optional) Boolean flag indicating whether to return a stream of responses.
  *  **Response:**
     *  **Non-streaming (stream=false):** JSON object with an array of responses from the model.
     *  **Streaming:** Server-Sent Events (SSE) with each event containing a `data` field in JSON format representing a message part. Messages end with `data: [DONE]`  signal.

* **GET /errors**
  *  **Purpose:** Gets any recorded errors from the AI model's logger.
  *  **Response:**
     *  **Success (200):** JSON object containing an array of error messages.
     *  **Error (500):** JSON object with an error message if there's a problem retrieving errors.

* **GET /ask**
  *  **Purpose:** Sends a question to the AI model, allows regular and streaming responses.
  *  **Parameters:**
     *  `question`: The question string.
     *  `stream`: (Optional) Boolean flag to use streaming. 
  *  **Response:**
     *  **Non-streaming:** JSON with fields `question` and `response`.
     *  **Streaming:** Server-Sent Events with `data` fields containing JSON-formatted message fragments.

