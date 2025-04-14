"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const openai_1 = require("openai");
const ws_1 = require("openai/beta/realtime/ws");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv.config({ path: ".env" });
const PORT = parseInt(process.env.PORT || "3001", 10);
const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
].filter((origin) => typeof origin === "string" && origin.length > 0);
const WSS_SHARED_SECRET = process.env.WSS_SHARED_SECRET;
if (!WSS_SHARED_SECRET) {
    console.warn("!!! WARNING: WSS_SHARED_SECRET is not set, Token authentication is disabled. !!!");
}
console.log("Allowed origins for Socket.io:", allowedOrigins);
// Create output directory for saving audio files
const AUDIO_OUTPUT_DIR = path_1.default.join(__dirname, "../audio_output");
const TRANSCRIPTION_OUTPUT_DIR = path_1.default.join(__dirname, "../transcription_output");
if (!fs_1.default.existsSync(AUDIO_OUTPUT_DIR)) {
    fs_1.default.mkdirSync(AUDIO_OUTPUT_DIR, { recursive: true });
    console.log(`Created audio output directory: ${AUDIO_OUTPUT_DIR}`);
}
if (!fs_1.default.existsSync(TRANSCRIPTION_OUTPUT_DIR)) {
    fs_1.default.mkdirSync(TRANSCRIPTION_OUTPUT_DIR, { recursive: true });
    console.log(`Created transcription output directory: ${TRANSCRIPTION_OUTPUT_DIR}`);
}
const connections = new Map(); // Map socket.id -> ConnectionPair
let connectionCounter = 0; // Counter to track total connections for voice allocation
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = process.env.OPENAI_API_VERSION;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const whisperEndpoint = process.env.AZURE_WHISPER_ENDPOINT;
const whisperDeploymentName = process.env.AZURE_WHISPER_DEPLOYMENT_NAME;
const whisperAPIVersion = process.env.AZURE_WHISPER_API_VERSION;
const whisperAPIKey = process.env.AZURE_WHISPER_API_KEY;
console.log("deployment", whisperDeploymentName);
console.log("api key", whisperAPIKey);
console.log("endpoint", whisperEndpoint);
console.log("api key", whisperAPIKey);
if (!azureEndpoint ||
    !deploymentName ||
    !apiVersion ||
    !apiKey ||
    !whisperAPIKey ||
    !whisperDeploymentName ||
    !whisperEndpoint ||
    !whisperAPIVersion) {
    console.error("Azure OpenAI SDK environment variables not fully set! Exiting.");
    process.exit(1);
}
// Client configuration setup
let azureOpenAIClient;
try {
    azureOpenAIClient = new openai_1.AzureOpenAI({
        apiKey: apiKey,
        apiVersion: apiVersion,
        deployment: deploymentName,
        endpoint: azureEndpoint,
    });
    console.log("SUCCESS: AzureOpenAI client configured");
}
catch (error) {
    console.error("ERROR: Failed to initialise Azure Credentials/client:", error);
    process.exit();
}
// Function to create WAV header for PCM16 audio
function createWavHeader(sampleRate, numChannels, bitsPerSample, dataLength) {
    const headerLength = 44;
    const header = Buffer.alloc(headerLength);
    // RIFF chunk descriptor
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataLength, 4); // File size - 8
    header.write("WAVE", 8);
    // "fmt " sub-chunk
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // Audio format (1 = PCM)
    header.writeUInt16LE(numChannels, 22); // Number of channels
    header.writeUInt32LE(sampleRate, 24); // Sample rate
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    header.writeUInt32LE(byteRate, 28); // Byte rate
    const blockAlign = (numChannels * bitsPerSample) / 8;
    header.writeUInt16LE(blockAlign, 32); // Block align
    header.writeUInt16LE(bitsPerSample, 34); // Bits per sample
    // "data" sub-chunk
    header.write("data", 36);
    header.writeUInt32LE(dataLength, 40); // Data size
    return header;
}
// Function to save accumulated audio as WAV file
function getTranscript(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Combine all audio chunks
            const audioData = Buffer.concat(connection.audioBuffer);
            let textResult = "";
            // Create WAV header
            // Azure OpenAI Realtime API uses 24kHz sample rate for audio output
            const sampleRate = 24000; // 24kHz instead of 16kHz
            const numChannels = 1; // Mono
            const bitsPerSample = 16; // 16-bit PCM
            const header = createWavHeader(sampleRate, numChannels, bitsPerSample, audioData.length);
            // Combine header and audio data
            const wavData = Buffer.concat([header, audioData]);
            // Generate filename with timestamp and session ID
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `audio_${timestamp}_${connection.sessionId}.wav`;
            const filePath = path_1.default.join(AUDIO_OUTPUT_DIR, filename);
            // Write to file (temporarily)
            fs_1.default.writeFileSync(filePath, wavData);
            console.log(`[${connection.sessionId}] Temporarily saved audio file for transcription`);
            // Create a client for Whisper transcription
            const whisperClient = new openai_1.AzureOpenAI({
                endpoint: whisperEndpoint,
                apiKey: whisperAPIKey,
                apiVersion: whisperAPIVersion,
                deployment: whisperDeploymentName,
            });
            // Create a readable stream from the file we just saved
            const fileStream = fs_1.default.createReadStream(filePath);
            // Use the file stream for transcription
            try {
                const result = yield whisperClient.audio.transcriptions.create({
                    model: "whisper-1",
                    file: fileStream,
                });
                textResult = result.text;
                // Delete the temporary audio file
                fs_1.default.unlinkSync(filePath);
                console.log(`[${connection.sessionId}] Deleted temporary audio file: ${filePath}`);
            }
            catch (transcriptionError) {
                console.error(`Error during transcription: ${transcriptionError}`);
                process.exit();
            }
            // Reset audio buffer
            connection.audioBuffer = [];
            connection.isStreaming = false;
            return textResult;
        }
        catch (error) {
            console.error(`Error processing audio:`, error);
            process.exit();
        }
    });
}
// Basic HTTP server configuration.
const httpServer = http_1.default.createServer((req, res) => {
    // Health check endpoint
    if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            service: "websocket-server",
        }));
        return;
    }
    // Default response
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("web-socketProxy server OK");
});
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: false,
    },
});
// New connection established
io.on("connect", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    const connectionId = socket.id; // get the unique connection id
    connectionCounter++; // Increment counter for each new connection
    const selectedVoice = connectionCounter % 2 === 0 ? "ash" : "verse";
    console.log(`✅: ${connectionId} Client connected via socket.io (Voice: ${selectedVoice})`);
    let azureRtClient = null;
    try {
        // attempt connection with Azure Realtime Service.
        azureRtClient = yield ws_1.OpenAIRealtimeWS.azure(azureOpenAIClient);
        if (!azureRtClient) {
            throw new Error("FAILED ❌: Azure Client initialisation failed");
        }
        azureRtClient.on("session.created", (event) => {
            // Configure session for audio
            if (azureRtClient) {
                azureRtClient.send({
                    type: "session.update",
                    session: {
                        modalities: ["text", "audio"],
                        model: "gpt-4o-mini-realtime-preview",
                        input_audio_format: "pcm16", // PCM 16-bit format
                        voice: selectedVoice,
                    },
                });
            }
            // Store connection with audio buffer
            connections.set(connectionId, {
                socket,
                azureSession: event.session,
                azureRtClient: azureRtClient,
                audioBuffer: [],
                isStreaming: false,
                sessionId: event.session.id || connectionId,
                streamStartTime: Date.now(),
            });
            socket.emit("ws_ready");
        });
        azureRtClient.on("response.text.delta", (event) => {
            console.log("Sending text data", event.delta);
            socket.emit("response_text_delta", event);
        });
        // Event for start of response
        azureRtClient.on("response.created", (event) => {
            const connection = connections.get(connectionId);
            if (connection) {
                connection.isStreaming = true;
                connection.streamStartTime = Date.now();
                connection.audioBuffer = []; // Reset buffer for new response
                console.log(`[${connectionId}] Started new audio stream`);
            }
        });
        // Event for end of response
        azureRtClient.on("response.audio.done", (event) => __awaiter(void 0, void 0, void 0, function* () {
            const connection = connections.get(connectionId);
            if (connection && connection.isStreaming) {
                console.log(`[${connectionId}] Completed audio stream, saving file...`);
                // Only save if we have audio data
                if (connection.audioBuffer.length > 0) {
                    const transcript = yield getTranscript(connection);
                    console.log("transcript", transcript);
                    socket.emit("text_final_response", transcript);
                }
                else {
                    console.log(`[${connectionId}] No audio data to save`);
                }
            }
        }));
        azureRtClient.on("response.audio.delta", (data) => {
            console.log(`[${connectionId}] RECEIVING AUDIO DELTA of length: ${data.delta.length}`);
            const connection = connections.get(connectionId);
            if (!connection) {
                console.log(`[${connectionId}] No connection found when receiving audio delta`);
                return;
            }
            try {
                // Stream to client (existing functionality)
                socket.emit("response_audio_delta", data);
                // Accumulate audio data (new functionality)
                if (connection.isStreaming) {
                    const audioData = Buffer.from(data.delta, "base64");
                    connection.audioBuffer.push(audioData);
                }
            }
            catch (error) {
                console.error(`[${connectionId}] Error processing audio delta:`, error);
            }
        });
        // Handle SDK-level errors
        azureRtClient.on("error", (error) => {
            console.error(`[${connectionId}] Azure SDK Error Event:`, error);
            if (socket.connected) {
                socket.emit("ws_error", {
                    code: "AZURE_SDK_ERROR",
                    message: error.message || "Upstream SDK error.",
                });
            }
        });
        // Handle Azure WebSocket closure
        azureRtClient.socket.on("close", (code, reason) => {
            console.log(`[${connectionId}] Azure SDK Socket closed: ${code} - ${reason.toString()}`);
            // Save any pending audio before cleaning up
            const connection = connections.get(connectionId);
            if (connection &&
                connection.isStreaming &&
                connection.audioBuffer.length > 0) {
                console.log(`[${connectionId}] Saving audio on connection close`);
            }
            if (socket.connected) {
                socket.emit("azure_disconnected", {
                    code,
                    reason: reason.toString(),
                });
                socket.disconnect(true);
            }
            connections.delete(connectionId);
        });
        socket.on("test_flow", (payload) => {
            const connection = connections.get(connectionId);
            console.log("Payload data", payload.data);
            if (!connection) {
                console.log("unable to find connection");
                return;
            }
            connection.azureRtClient.send({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [{ type: "input_text", text: payload.data }],
                },
            });
            connection.azureRtClient.send({
                type: "response.create",
            });
        });
        socket.on("disconnect", (reason) => {
            console.log(`[${connectionId}] Client disconnected: ${reason}`);
            // Save any pending audio before disconnection
            const connection = connections.get(connectionId);
            if (connection &&
                connection.isStreaming &&
                connection.audioBuffer.length > 0) {
                console.log(`[${connectionId}] Disconnecting client`);
            }
            if (azureRtClient)
                azureRtClient.close();
            connections.delete(connectionId);
        });
    }
    catch (error) {
        console.error(`[${connectionId}] Setup failed:`, error);
        socket.emit("ws_error", {
            code: "INIT_FAILED",
            message: "Connection setup failed",
        });
        socket.disconnect(true);
    }
}));
// General Socket.IO Error Handler
io.on("error", (error) => {
    console.error("Socket.IO Error:", error);
});
httpServer.listen(PORT, () => {
    console.log(`🚀 Socket.IO Proxy Server started on port ${PORT}`);
    console.log(`🔒 Shared Secret Auth: ${WSS_SHARED_SECRET ? "Enabled" : "DISABLED"}`);
    console.log(`☁️ Azure Client Auth: Keyless (Entra ID / Managed Identity)`);
    console.log(`📁 Audio files will be saved to: ${AUDIO_OUTPUT_DIR}`);
});
