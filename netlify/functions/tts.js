// ==============================================================================
// Netlify Serverless Function: Text-to-Speech Proxy
// ==============================================================================
// This function runs on Netlify's cloud infrastructure when deployed.
// It securely reads the ELEVENLABS_API_KEY from Netlify environment variables,
// calls the ElevenLabs API, and returns the audio back to the frontend.
// ==============================================================================

exports.handler = async function(event, context) {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
        };
    }

    try {
        // Step 1: Read the API key from Netlify's environment
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Netlify environment configuration error: ELEVENLABS_API_KEY is not set. Please add it in Netlify Site Configuration -> Environment Variables.'
                })
            };
        }

        // Step 2: Parse request body
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body || '{}');
        } catch (e) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid JSON request body.' })
            };
        }

        const { text, model_id, voice_id } = parsedBody;

        // Step 3: Validate text input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Please enter text to synthesize.' })
            };
        }

        const trimmedText = text.trim();
        const selectedVoiceId = voice_id || 'Xb7hH8MSUJpSbSDYk0k2'; // Default: Alice (premade voice compatible with free tier)
        const selectedModelId = model_id || 'eleven_multilingual_v2'; // Default: Multilingual v2

        // Step 4: Request speech audio from ElevenLabs
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

        // Step 5: Handle ElevenLabs API errors
        if (!response.ok) {
            let errorDetail = `ElevenLabs error (HTTP ${response.status})`;
            try {
                const errData = await response.json();
                if (errData && errData.detail) {
                    errorDetail = typeof errData.detail === 'string' ? errData.detail : (errData.detail.message || errorDetail);
                }
            } catch (_) {}

            if (response.status === 401) {
                errorDetail = 'Authentication Failed: Your ElevenLabs API key is invalid in Netlify environment variables.';
            } else if (response.status === 429) {
                errorDetail = 'Rate limit or character quota exceeded on your ElevenLabs account.';
            }

            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: errorDetail })
            };
        }

        // Step 6: Convert audio arrayBuffer to base64 for Netlify binary response
        const arrayBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache'
            },
            body: base64Audio,
            isBase64Encoded: true
        };

    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Serverless function error: ' + err.message })
        };
    }
};
