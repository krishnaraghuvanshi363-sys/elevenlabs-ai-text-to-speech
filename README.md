# 🎙️ AI Text-to-Speech using ElevenLabs API

A clean, modern, beginner-friendly web application that converts text into ultra-realistic spoken audio using the **ElevenLabs Text-to-Speech API** and a secure **Node.js Express** backend.

Designed for university computer science and web development activities.

---

## 📑 Table of Contents
- [Architecture & Security](#-architecture--security)
- [Project File Structure](#-project-file-structure)
- [Prerequisites](#-prerequisites)
- [How to Run Locally (Step-by-Step)](#-how-to-run-locally-step-by-step)
- [Where to Add Your ElevenLabs API Key](#-where-to-add-your-elevenlabs-api-key)
- [How Frontend & Backend Communicate](#-how-frontend--backend-communicate)
- [How to Deploy](#-how-to-deploy)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🔒 Architecture & Security

### Why isn't the API key placed in the frontend?
In frontend web applications, any code sent to the browser (HTML, CSS, JavaScript) is visible to anyone who opens **Developer Tools** (`F12` or `Right Click -> Inspect`). 

If you put an ElevenLabs API key directly into frontend JavaScript:
1. Anyone could copy your API key.
2. They could consume your character credits and exhaust your billing quota.

### Secure Proxy Design:
```
[ Browser (User) ]
       │
       │  1. Sends text + model selection (NO API KEY)
       ▼
[ Node.js Express Server ]
       │
       │  2. Reads ELEVENLABS_API_KEY from .env
       │  3. Attaches 'xi-api-key' header
       ▼
[ ElevenLabs API (api.elevenlabs.io) ]
       │
       │  4. Synthesizes voice & returns MP3 audio
       ▼
[ Node.js Express Server ]
       │
       │  5. Sends audio stream (audio/mpeg)
       ▼
[ Browser Audio Player ]
```

---

## 📂 Project File Structure

```text
Elevenlabs-07-10-26/
├── public/                     # Static files served directly to the browser
│   ├── index.html              # HTML structure with semantic elements & accessibility
│   ├── styles.css              # Modern glassmorphism CSS design system & animations
│   └── app.js                  # Frontend JavaScript (validation, fetch API, audio player)
├── .env.example                # Example template showing required environment variables
├── .env                        # Private environment file where YOUR secret API key is stored
├── .gitignore                  # Prevents .env and node_modules from being committed to Git
├── package.json                # Project dependencies (express, dotenv) and scripts
├── server.js                   # Node.js backend acting as the secure ElevenLabs API proxy
└── README.md                   # Complete beginner guide and documentation
```

### File Breakdown:
- **`server.js`**:
  - Initializes an Express server.
  - Loads environment variables from `.env` using `dotenv`.
  - Serves static assets from `public/`.
  - Provides `GET /api/status` to report if the server is healthy and if an API key is present.
  - Provides `POST /api/tts` to validate text, call ElevenLabs `v1/text-to-speech`, and stream back MP3 audio.
- **`public/index.html`**:
  - Contains heading, description, sample text buttons, input textarea, character counter, model & voice dropdowns, generate button, loading indicator, error display, and HTML5 audio player.
- **`public/styles.css`**:
  - Responsive design with custom CSS properties, smooth animations (spinning loader, pulsing wave bars), glassmorphic surfaces, and mobile-friendly layouts.
- **`public/app.js`**:
  - Performs client-side validation (ensures text is not empty, respects character limits).
  - Disables button and displays loading state during generation to prevent multiple clicks.
  - Sends text and chosen model to `/api/tts`.
  - Converts response to an audio Blob and sets it in the HTML5 player.
  - Provides audio download button and visual waveform effect.
- **`.env`**:
  - Holds `ELEVENLABS_API_KEY=...`. Never committed to version control.
- **`.env.example`**:
  - Safe template to share with classmates showing the structure without revealing keys.

---

## 📋 Prerequisites

Before running this project, you need:
1. **Node.js** (v18 or higher recommended) installed on your machine.
   - Verify by running `node -v` in your terminal.
2. An **ElevenLabs Account** with an API key.

---

## 🔑 Where to Add Your ElevenLabs API Key

1. Go to [ElevenLabs Website](https://elevenlabs.io) and sign up / log in.
2. Click on your profile icon in the bottom-left or top-right, and select **API Keys** (or **Profile + Keys**).
3. Click **Create API Key** and copy the key.
4. In this project folder, open the `.env` file.
5. Paste your key on the `ELEVENLABS_API_KEY` line:
   ```env
   ELEVENLABS_API_KEY=sk_your_actual_elevenlabs_key_here
   PORT=3000
   ```
6. Save the file.

---

## 🚀 How to Run Locally (Step-by-Step)

### Step 1: Open a terminal in the project directory
In PowerShell or VS Code Terminal inside `Elevenlabs-07-10-26`:

### Step 2: Install dependencies (if not already installed)
```bash
npm install
```
*(On Windows PowerShell if script execution is restricted, run `npm.cmd install`)*

### Step 3: Start the server
```bash
npm start
```
*(or run `node server.js`)*

### Step 4: Open in your browser
Open your browser and navigate to:
```
http://localhost:3000
```

You should see:
- The status banner in green: `Backend Online • ElevenLabs API Key Configured` (or yellow if `.env` still needs your key).
- Enter any text or click one of the **Sample Texts** buttons.
- Select your desired **ElevenLabs Model** and **Speaker Voice**.
- Click **Generate Speech**.
- The audio player will display and begin playing automatically!

---

## 🌐 How Frontend & Backend Communicate

1. **User Action**: The user enters text and clicks `Generate Speech`.
2. **Frontend Validation**: `app.js` checks that `text.trim().length > 0`. If empty, an error message is immediately displayed and the request is aborted.
3. **UI State**: The button changes to `Generating Voice...` and becomes disabled. The loading spinner appears.
4. **Network Request**: `app.js` executes:
   ```javascript
   const response = await fetch('/api/tts', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           text: "Hello world!",
           model_id: "eleven_multilingual_v2",
           voice_id: "21m00Tcm4TlvDq8ikWAM"
       })
   });
   ```
5. **Backend Processing**: `server.js` receives the JSON, reads `process.env.ELEVENLABS_API_KEY`, and queries `https://api.elevenlabs.io/v1/text-to-speech/:voice_id`.
6. **Streaming Response**: The server forwards the resulting MP3 audio buffer back to the browser with `Content-Type: audio/mpeg`.
7. **Audio Playback**: `app.js` turns the binary stream into a `Blob`, assigns it to the `<audio>` player, and triggers `.play()`.

---

## 🚀 How to Deploy

You can easily deploy this full-stack application to popular free/starter cloud hosting platforms:

### Option 1: Render.com (Recommended for beginners)
1. Push this project to a GitHub repository (remember: `.env` will be automatically ignored by `.gitignore`).
2. Log in to [Render.com](https://render.com) and click **New Web Service**.
3. Connect your GitHub repository.
4. Configuration:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Go to the **Environment Variables** tab in Render:
   - Key: `ELEVENLABS_API_KEY`
   - Value: `your_actual_elevenlabs_api_key`
6. Click **Deploy Web Service**. Render gives you a public HTTPS URL (e.g., `https://my-tts-app.onrender.com`).

### Option 2: Railway.app
1. Go to [Railway.app](https://railway.app), create a new project from your GitHub repo.
2. In Railway settings, add `ELEVENLABS_API_KEY` under the **Variables** tab.
3. Railway automatically detects Node.js and starts `npm start`.

### Option 3: Vercel (Using Serverless Functions)
If deploying to Vercel:
- Put the server handler into an `api/tts.js` serverless function.
- Add `ELEVENLABS_API_KEY` in **Vercel Project Settings -> Environment Variables**.

---

## ❓ Troubleshooting & FAQs

- **Q: It says "API Key Not Found"?**  
  **A**: Make sure you saved your key inside the `.env` file (not `.env.example`). If the server was already running when you saved `.env`, restart the server (`Ctrl + C` then `npm start`).

- **Q: Error: "Authentication Failed: Your ElevenLabs API key is invalid"?**  
  **A**: Check that your API key was copied completely from ElevenLabs without leading or trailing spaces.

- **Q: Error: "Rate limit or character quota exceeded"?**  
  **A**: ElevenLabs free tier provides 10,000 characters per month. Check your remaining credits at [elevenlabs.io/subscription](https://elevenlabs.io/subscription).

- **Q: Why is npm failing with "running scripts is disabled on this system"?**  
  **A**: This is Windows PowerShell execution policy. Run `npm.cmd install` and `npm.cmd start`, or `node server.js` directly.
