// ==============================================================================
// Netlify Serverless Function: Status & Health Check
// ==============================================================================
exports.handler = async function(event, context) {
    const hasKey = Boolean(
        process.env.ELEVENLABS_API_KEY && 
        process.env.ELEVENLABS_API_KEY.trim() !== ''
    );

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'online',
            platform: 'netlify-serverless',
            apiKeyConfigured: hasKey,
            message: hasKey
                ? 'Netlify serverless function online and ElevenLabs API key is configured.'
                : 'Netlify serverless function is running, but ELEVENLABS_API_KEY is missing in Netlify site environment variables.'
        })
    };
};
