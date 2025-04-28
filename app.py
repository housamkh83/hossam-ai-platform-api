import os
import requests
import json
import base64
import tempfile
import uuid
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from gtts import gTTS
from typing import Optional, Dict, Any

# --- Configuration ---
API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434")
TEMP_AUDIO_FOLDER = 'temp_audio'
os.makedirs(TEMP_AUDIO_FOLDER, exist_ok=True)

# --- Core Logic Class ---
class HossamLogic:
    def __init__(self, api_url: str):
        self.api_url = api_url
        print(f"Connecting to Ollama at: {self.api_url}")
        self.available_models = self._fetch_available_models()
        if not self.available_models:
            print("Warning: Could not fetch models from Ollama. Using fallback list.")
            self.available_models = ["llava:13b", "mistral:latest", "bakllava:latest", "llama2:latest"]
        print(f"Available models: {self.available_models}")

    def _fetch_available_models(self) -> list:
        try:
            response = requests.get(f"{self.api_url}/api/tags", timeout=5)
            response.raise_for_status()
            models = response.json().get("models", [])
            return [m["name"] for m in models] if models else []
        except requests.exceptions.RequestException as e:
            print(f"Error fetching models from Ollama: {e}")
            return []
        except Exception as e:
            print(f"An unexpected error occurred fetching models: {e}")
            return []

    def get_models(self) -> list:
        return self.available_models

    def process_message(
        self,
        message: str,
        model: str,
        image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        print(f"Processing message for model: {model}")
        if image_base64:
            print("Image data received (first 50 chars):", image_base64[:50])

        data = {
            "model": model,
            "messages": [{"role": "user", "content": message}],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_ctx": 4096,
            }
        }

        is_vision_model = any(vis_kw in model.lower() for vis_kw in ["llava", "bakllava", "vision"])

        if image_base64 and is_vision_model:
            print(f"Adding image to request for vision model: {model}")
            data["messages"][0]["images"] = [image_base64]
        elif image_base64 and not is_vision_model:
            print(f"Warning: Image provided but model '{model}' might not support vision.")

        try:
            print("Sending request to Ollama...")
            response = requests.post(
                f"{self.api_url}/api/chat",
                json=data,
                timeout=120
            )
            response.raise_for_status()
            result = response.json()
            print("Received response from Ollama.")

            text_response = result.get("message", {}).get("content", "")
            if not text_response:
                print("Warning: Received empty content from Ollama.")
                print("Full Ollama response:", result)
                return {"error": "Received empty response from the AI model."}

            audio_filename = None
            audio_url = None
            if text_response:
                try:
                    tts = gTTS(text=text_response, lang="ar")
                    audio_filename = f"{uuid.uuid4()}.mp3"
                    audio_path = os.path.join(TEMP_AUDIO_FOLDER, audio_filename)
                    tts.save(audio_path)
                    audio_url = f"/audio/{audio_filename}"
                    print(f"Generated audio file: {audio_filename}")
                except Exception as e:
                    print(f"Error generating TTS audio: {e}")

            return {
                "text": text_response,
                "audio_url": audio_url
            }

        except requests.exceptions.Timeout:
            print("Error: Request to Ollama timed out.")
            return {"error": "The request to the AI model timed out. Please try again."}
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to Ollama: {e}")
            return {"error": f"Could not connect to the AI service at {self.api_url}. Is Ollama running?"}
        except json.JSONDecodeError:
            print("Error: Could not decode JSON response from Ollama.")
            print("Raw response text:", response.text)
            return {"error": "Received an invalid response from the AI model."}
        except Exception as e:
            print(f"An unexpected error occurred during processing: {e}")
            import traceback
            traceback.print_exc()
            return {"error": f"An unexpected server error occurred: {str(e)}"}

# --- Flask Application ---
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

hossam_bot = HossamLogic(api_url=API_URL)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/models', methods=['GET'])
def get_models():
    models = hossam_bot.get_models()
    return jsonify({"models": models})

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    message = data.get('message')
    model = data.get('model')
    image_base64 = data.get('image_base64')

    if not message or not model:
        return jsonify({"error": "Missing 'message' or 'model' in request."}), 400

    response = hossam_bot.process_message(message, model, image_base64)
    if "error" in response:
        return jsonify(response), 500
    return jsonify(response)

@app.route('/audio/<filename>')
def serve_audio(filename):
    print(f"Serving audio file: {filename}")
    try:
        if '..' in filename or filename.startswith('/'):
            return "Invalid filename", 400
        return send_from_directory(TEMP_AUDIO_FOLDER, filename, as_attachment=False)
    except FileNotFoundError:
        print(f"Audio file not found: {filename}")
        return "Audio file not found.", 404

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == "__main__":
    for f in os.listdir(TEMP_AUDIO_FOLDER):
        try:
            os.remove(os.path.join(TEMP_AUDIO_FOLDER, f))
            print(f"Removed old audio file: {f}")
        except OSError as e:
            print(f"Error removing file {f}: {e}")

    print("Starting Flask server...")
    app.run(debug=True, host='0.0.0.0', port=5000)