# LLM-API

## Brief Description

* The LLM-API uses a wrapper around llama.cpp and creates an API for running and communicating with your LLMs locally and online.
* It supports standard openai endpoints and you can utilize the openai python library.
* A separate front-end APP that can be hosted on firebase will be shared.

## Prerequisites

* Node.js and npm (or yarn)
* A Hugging Face account
* winACME tool (or equivalent) (for SSL)
* CUDA
* llama.cpp
* cmake
* Python (for testing)


## Installation

1. **Clone the repository:**
```bash
   git clone [https://github.com/your-username/llm-api.git](https://github.com/your-username/llm-api.git)
```

2. **Install dependencies:**
```bash
    cd llm-api
    npm install 
    # Or if you prefer yarn
    yarn install
```

3. **Obtain an SSL certificate:**
- Before completing this step I recommend setting up a DDNS for mapping your IP to a domain name. For instance through Synology or other providers.
- Install winACME (or other OS version).
- Set up winACME to retrieve an SSL certificate for your domain (consult winACME documentation for specifics).
- https://www.win-acme.com/manual/getting-started
- Once obtained, place the following files in ./ssl:
```bash
../ssl/<webaddress>-key.pem # private key
../ssl/<webaddress>-crt.pem # certificate
../ssl/<webaddress>-chain.pem # CA chain
```

4. **Install CUDA**
*(or equivalent for GPU acceleration, recommended but not required)*
- Follow instructions https://developer.nvidia.com/cuda-downloads

5. **Get llama.cpp.**
```bash
    git clone https://github.com/ggerganov/llama.cpp
    cd llama.cpp
```
- Build llama.cpp (in windows I recommend using CMake, example is for CUDA)
    - See https://github.com/ggerganov/llama.cpp/blob/master/README.md for more examples

```bash
    mkdir build
    cd build
    cmake .. -DLLAMA_CUBLAS=ON
    cmake --build . --config Release
```

6. **Download a GGUF model:**
- Create a Hugging Face account if you don't have one.
- Choose a suitable GGUF model from the Hugging Face model hub.
- Download the model files and place them in a location like:
    D:\\LLMs\\TheBloke\\Mixtral-8x7B-Instruct-v0.1-GGUF\\mixtral-8x7b-instruct-v0.1.Q3_K_M.gguf

7. **Update Configuration:**
Create config.js in root and modify the values as needed:
```javascript
const config = {
    host: '0.0.0.0', // Host to listen on all network interfaces
    port: 80, // Default port number. Once SSL has been set up change to 443  (443 for SSL, 80 for normal)
    useSSL: false, //Flag to enable/disable SSL change to true after SSL is set up with ACME
    llamaMain: 'D:\\llama-cpp\\bin\\Release\\main.exe', // Path to main.exe usually llama-cpp\bin\Release\main.exe
    llmStorage: 'D:\\LLMs', // Path to local model storage. Models (for now) still needs to be manually added to models.json


    // SSL Configuration
    privateKeyPath: '../ssl/<webaddress>-key.pem', // Path to private key
    certificatePath: '../ssl/<webaddress>-crt.pem', // Path to certificate
    caChainPath: '../ssl/<webaddress>-chain.pem', // Path to CA chain
    passphrase: '<passphrase>', // Passphrase for SSL key (if any)
};

module.exports = config;
```

8. **Create '../data/models.json'.**
- Example setup.
```json
{
    "Mistral-7b": {
        "params": {
            "model":"TheBloke\\Mistral-7B-Instruct-v0.2-GGUF\\mistral-7b-instruct-v0.2.Q4_K_M.gguf",
            "instruct": true,
            "temperature": 0.7,
            "gpuLayers": 80,
            "threads": 12,
            "ctxSize": 4096,
            "repeatPenalty": 1.1,
            "seed": 42,
            "nPredict": -1
        },
        "template": "zephyr",
        "personalities": {
            "geography teacher": "You will introduce yourself as a geography teacher. Your name is Tom and you are 26 years old. You love traveling and your passion is to share knowledge and this interest with your students. You once traveled to Paris and fell in love."
        }
    }
}
```

9. **Generate an auth key.**
```bash
    node src/services/generateAuthKey.js "PythonKey" "This key is for testing purposes"
```
*This key provides authentication for remote access.*

10. **Run API**
```bash
node src/app.js
```

## Basic Usage

**Python demo code:**
The API supports the openai library.

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

