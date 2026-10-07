// ==============================================================================
// AI Text-to-Speech using ElevenLabs API - Backend Server
// ==============================================================================
// This file runs an Express.js server on Node.js.
//
// WHY DO WE NEED A BACKEND SERVER?
// In web development, API keys are secret passwords that grant access to paid
// services. If we put our ElevenLabs API key directly in frontend HTML/JavaScript,
// ANY user could right-click -> "Inspect Source" and steal our API key!
//
// The backend acts as a secure intermediary (a "Proxy"):
// 1. The browser sends only text and voice options to this server.
// 2. This server attaches the private API key and talks to ElevenLabs.
// 3. This server receives the audio from ElevenLabs and sends it back to the browser.
//
// This keeps your API key completely safe on the server!
// ==============================================================================

// Load environment variables from the .env file into process.env
require('dotenv').config();

const express = require('express');
const path = require('path');

// Initialize the Express application
const app = express();

// Set the port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------------------
// Middleware Configuration
// ------------------------------------------------------------------------------
// 1. express.json(): Automatically parse incoming JSON request bodies
app.use(express.json());

// 2. express.static(): Serve frontend static files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------------------
// API Route 1: Health & Configuration Check
// ------------------------------------------------------------------------------
// This endpoint lets the frontend check if the server is alive and whether
// an ElevenLabs API key has been configured in the .env file.
app.get('/api/status', (req, res) => {
    const hasApiKey = Boolean(
        process.env.ELEVENLABS_API_KEY && 
        process.env.ELEVENLABS_API_KEY.trim() !== '' &&
        process.env.ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here'
    );

    res.json({
        status: 'online',
        apiKeyConfigured: hasApiKey,
        message: hasApiKey 
            ? 'Server is online and ElevenLabs API key is configured.' 
            : 'Server is running, but ELEVENLABS_API_KEY is missing or not set in the .env file.'
    });
});

// ------------------------------------------------------------------------------
// API Route 2: Generate Text-to-Speech Audio
// ------------------------------------------------------------------------------
// Endpoint: POST /api/tts
// Expects JSON body: { text, model_id, voice_id }
// Returns: Binary audio/mpeg stream
app.post('/api/tts', async (req, res) => {
    try {
        const { text, model_id, voice_id } = req.body;

        // Step 1: Check if the API key is configured on the server
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey || apiKey.trim() === '' || apiKey === 'your_elevenlabs_api_key_here') {
            return res.status(500).json({
                error: 'Server configuration error: ELEVENLABS_API_KEY is not set in the .env file. Please add your API key to .env and restart the server.'
            });
        }

        // Step 2: Validate the user's input text
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                error: 'Validation error: Please enter some text to convert to speech.'
            });
        }

        const trimmedText = text.trim();

        // Optional safety limit to prevent accidental character quota drain
        if (trimmedText.length > 3000) {
            return res.status(400).json({
                error: 'Character limit exceeded: Please keep text under 3,000 characters per request.'
            });
        }

        // Step 3: Set defaults for voice and model if not provided
        // Default Voice: "Alice" (Voice ID: Xb7hH8MSUJpSbSDYk0k2 - Premade voice supported on all tiers)
        const selectedVoiceId = voice_id || 'Xb7hH8MSUJpSbSDYk0k2';
        
        // Default Model: Eleven Multilingual v2
        const selectedModelId = model_id || 'eleven_multilingual_v2';

        console.log(`[TTS Request] Model: ${selectedModelId} | Voice: ${selectedVoiceId} | Characters: ${trimmedText.length}`);

        // Step 4: Call the official ElevenLabs Text-to-Speech API
        // Documentation: https://elevenlabs.io/docs/api-reference/text-to-speech
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(selectedVoiceId)}`;

        const response = await fetch(elevenLabsUrl, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey.trim(),
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: trimmedText,
                model_id: selectedModelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        // Step 5: Handle ElevenLabs API errors gracefully
        if (!response.ok) {
            let errorMessage = `ElevenLabs API error (HTTP ${response.status})`;

            try {
                // Attempt to parse ElevenLabs detailed error response
                const errorData = await response.json();
                if (errorData && errorData.detail) {
                    if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else if (errorData.detail.message) {
                        errorMessage = errorData.detail.message;
                    }
                }
            } catch (jsonErr) {
                // If not JSON, use default status text
                errorMessage = response.statusText || errorMessage;
            }

            // Provide beginner-friendly explanations for common HTTP status codes
            if (response.status === 401) {
                errorMessage = 'Authentication Failed: Your ElevenLabs API key is invalid. Please double check the key in your .env file.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit or character quota exceeded: Your ElevenLabs account quota may be exhausted.';
            }

            console.error(`[ElevenLabs Error] ${response.status}: ${errorMessage}`);
            return res.status(response.status).json({ error: errorMessage });
        }

        // Step 6: Convert the audio stream into a buffer and send to frontend
        const audioBuffer = await response.arrayBuffer();

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.byteLength);
        res.setHeader('Cache-Control', 'no-cache');

        return res.send(Buffer.from(audioBuffer));

    } catch (err) {
        console.error('[Server Error]', err);
        return res.status(500).json({
            error: 'An unexpected internal server error occurred while processing your audio request: ' + err.message
        });
    }
});

// ------------------------------------------------------------------------------
// Fallback Route: Serve index.html for any unmatched client routes
// ------------------------------------------------------------------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ------------------------------------------------------------------------------
// Start the Express Server (with automatic port retry if busy)
// ------------------------------------------------------------------------------
function startServer(portToTry) {
    const server = app.listen(portToTry, () => {
        console.log(`====================================================`);
        console.log(`🚀 AI Text-to-Speech Server is running!`);
        console.log(`📡 Local URL: http://localhost:${portToTry}`);
        console.log(`🔑 ElevenLabs API Key configured: ${process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim() !== '' ? 'YES' : 'NO (Check .env file)'}`);
        console.log(`====================================================`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${portToTry} is in use. Trying port ${portToTry + 1}...`);
            startServer(portToTry + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(Number(PORT));

