// ==============================================================================
// AI Text-to-Speech using ElevenLabs API - Client Application Logic
// ==============================================================================
// This file runs in the browser. It listens for user actions, validates inputs,
// makes HTTP requests to our Node.js backend server, and plays the returned audio.
// ==============================================================================

// Ensure JavaScript runs only after the full HTML document has loaded
document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------------------------------
    // 1. DOM Element References
    // --------------------------------------------------------------------------
    // We cache references to HTML elements by their IDs for performance and clarity.
    
    // Status banner
    const statusBanner = document.getElementById('statusBanner');
    const statusText = document.getElementById('statusText');

    // Form and inputs
    const ttsForm = document.getElementById('ttsForm');
    const textInput = document.getElementById('textInput');
    const modelSelect = document.getElementById('modelSelect');
    const voiceSelect = document.getElementById('voiceSelect');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const charCount = document.getElementById('charCount');
    const clearTextBtn = document.getElementById('clearTextBtn');
    const presetButtons = document.querySelectorAll('.preset-btn[data-text]');

    // Feedback states: Loading, Error, Audio Player
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorArea = document.getElementById('errorArea');
    const errorMessage = document.getElementById('errorMessage');
    const dismissErrorBtn = document.getElementById('dismissErrorBtn');

    const audioSection = document.getElementById('audioSection');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioMetadata = document.getElementById('audioMetadata');
    const downloadAudioBtn = document.getElementById('downloadAudioBtn');
    const waveformVisualizer = document.getElementById('waveformVisualizer');

    // Store the URL of currently loaded audio to revoke it later (prevents browser memory leaks)
    let currentAudioUrl = null;

    // --------------------------------------------------------------------------
    // 2. Health & Status Check on Startup
    // --------------------------------------------------------------------------
    // When the page opens, verify that our local Express server is reachable
    // and check whether the ElevenLabs API key is configured in the .env file.
    async function checkServerStatus() {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.apiKeyConfigured) {
                statusBanner.className = 'status-banner ready';
                statusText.textContent = 'Backend Online • ElevenLabs API Key Configured';
            } else {
                statusBanner.className = 'status-banner warning';
                statusText.textContent = 'API Key Not Found: Please add ELEVENLABS_API_KEY to your .env file';
            }
        } catch (err) {
            statusBanner.className = 'status-banner warning';
            statusText.textContent = 'Cannot reach backend server. Make sure "npm start" is running.';
            console.warn('[Status Check]', err);
        }
    }

    // Call status check immediately on load
    checkServerStatus();

    // --------------------------------------------------------------------------
    // 3. UI Helpers: Error and Loading Handlers
    // --------------------------------------------------------------------------

    /**
     * Display a descriptive error message to the user
     * @param {string} message - The text explanation of what went wrong
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorArea.classList.remove('hidden');
        // Smoothly scroll error into view if needed
        errorArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Hide the error message banner
     */
    function hideError() {
        errorArea.classList.add('hidden');
        errorMessage.textContent = '';
    }

    /**
     * Update the button and loading state during generation
     * @param {boolean} isLoading - True when request is in progress, false otherwise
     */
    function setLoadingState(isLoading) {
        if (isLoading) {
            // Disable button so the user cannot accidentally send duplicate requests
            generateBtn.disabled = true;
            btnText.textContent = 'Generating Voice...';
            btnIcon.textContent = '⏳';
            loadingIndicator.classList.remove('hidden');
            hideError();
        } else {
            // Re-enable button when request completes
            generateBtn.disabled = false;
            btnText.textContent = 'Generate Speech';
            btnIcon.textContent = '▶';
            loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Update the character count indicator under the textarea
     */
    function updateCharCount() {
        const length = textInput.value.length;
        const max = textInput.maxLength || 3000;
        charCount.textContent = `${length} / ${max} chars`;
    }

    // --------------------------------------------------------------------------
    // 4. User Interaction Event Listeners
    // --------------------------------------------------------------------------

    // Update character count on user keystroke or paste
    textInput.addEventListener('input', () => {
        updateCharCount();
        // Clear error if user starts typing after an empty-text error
        if (textInput.value.trim().length > 0) {
            hideError();
            textInput.style.borderColor = '';
        }
    });

    // Dismiss error banner when close button is clicked
    dismissErrorBtn.addEventListener('click', hideError);

    // Preset buttons: Quick sample texts for instant university demos
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sample = button.getAttribute('data-text');
            if (sample) {
                textInput.value = sample;
                updateCharCount();
                textInput.focus();
                hideError();
            }
        });
    });

    // Clear text button
    clearTextBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCharCount();
        textInput.focus();
    });

    // Sync audio waveform animation with the audio player state
    audioPlayer.addEventListener('play', () => {
        waveformVisualizer.classList.add('playing');
    });

    audioPlayer.addEventListener('pause', () => {
        waveformVisualizer.classList.remove('playing');
    });

    audioPlayer.addEventListener('ended', () => {
        waveformVisualizer.classList.remove('playing');
    });

    // --------------------------------------------------------------------------
    // 5. Form Submission & ElevenLabs API Call
    // --------------------------------------------------------------------------
    ttsForm.addEventListener('submit', async (event) => {
        // Prevent default browser form submission (which reloads the page)
        event.preventDefault();

        // Step 1: Validate input text
        const text = textInput.value.trim();

        if (!text) {
            showError('Please enter or paste some text before clicking Generate Speech.');
            textInput.focus();
            textInput.style.borderColor = '#ef4444';
            return;
        }

        // Selected options
        const modelId = modelSelect.value;
        const voiceId = voiceSelect.value;
        const selectedModelLabel = modelSelect.options[modelSelect.selectedIndex].text;
        const selectedVoiceLabel = voiceSelect.options[voiceSelect.selectedIndex].text;

        // Step 2: Set UI to loading state
        setLoadingState(true);

        try {
            // Step 3: Send request to our secure local backend (/api/tts)
            // Notice: The frontend NEVER sends an API key! The backend attaches it securely.
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: modelId,
                    voice_id: voiceId
                })
            });

            // Step 4: Handle response errors
            if (!response.ok) {
                // Try reading JSON error from backend
                let errorMsg = `Server returned error (${response.status})`;
                try {
                    const errorJson = await response.json();
                    if (errorJson && errorJson.error) {
                        errorMsg = errorJson.error;
                    }
                } catch (e) {
                    // Response was not JSON
                }
                throw new Error(errorMsg);
            }

            // Step 5: Convert response into an audio Blob (binary data)
            const audioBlob = await response.blob();

            // Check if audio blob actually has data
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error('Received empty audio file from speech synthesis service.');
            }

            // Step 6: Revoke previous audio URL if any (frees up memory)
            if (currentAudioUrl) {
                URL.revokeObjectURL(currentAudioUrl);
            }

            // Create a temporary browser URL pointing to the audio blob
            currentAudioUrl = URL.createObjectURL(audioBlob);

            // Step 7: Update Audio Player and metadata
            audioPlayer.src = currentAudioUrl;
            audioSection.classList.remove('hidden');

            // Format metadata text
            const voiceShortName = selectedVoiceLabel.split(' ')[0];
            audioMetadata.textContent = `Voice: ${voiceShortName} • Model: ${modelId}`;

            // Setup download link
            downloadAudioBtn.href = currentAudioUrl;
            downloadAudioBtn.download = `elevenlabs-${voiceShortName.toLowerCase()}-${Date.now()}.mp3`;

            // Step 8: Automatically play the generated speech
            try {
                await audioPlayer.play();
            } catch (playErr) {
                // Modern browsers sometimes block autoplay if the user hasn't interacted
                console.log('Autoplay deferred. User can click play manually.', playErr);
            }

            // Scroll audio player into view smoothly
            audioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (error) {
            console.error('[TTS Generation Error]', error);
            showError(error.message || 'An error occurred while generating speech. Please try again.');
        } finally {
            // Step 9: Re-enable the Generate button regardless of success or failure
            setLoadingState(false);
        }
    });

    // Initialize character count display
    updateCharCount();
});
