# AI Translator - Browser Extension

A Chrome/Edge extension that provides AI-powered text translation and learning assistance on educational platforms.

---

## Overview

AI Translator helps students understand quiz questions and educational content by providing instant AI-powered analysis and explanations. Uses free models via OpenRouter API.

---

## Installation

### 1. Generate Icons

Open `generate-icons.html` in your browser and click "Download All". Move the 3 PNG files to the `icons/` folder.

### 2. Load Extension

- Navigate to `chrome://extensions/` (or `edge://extensions/`)
- Enable **Developer mode** (top right toggle)
- Click **Load unpacked**
- Select this extension folder

### 3. Configure API Key

- Click the extension icon in toolbar
- Enter your OpenRouter API key
- Get free key at: https://openrouter.ai/keys
- Click **Save Settings**

No billing required - all models are free.

---

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Q` | Toggle assistant |
| `Ctrl+Shift+E` | Analyze current question |

### Right-Click Menu

- Select text on any page, right-click, and choose "AI Solve This Question"
- Right-click anywhere on page to access assistant options

### Supported Sites

Works on any website with quiz or multiple-choice content:
- skillup.global
- levelup.akajob.io
- LinkedIn Learning
- Coursera, Udemy, edX
- Google Forms quizzes
- Any platform with radio buttons or checkboxes

---

## Features

- AI-powered question analysis using free models (Google Gemma)
- Smart auto-detection of quiz questions (high confidence only)
- Stealth mode - hidden by default, activated via shortcuts
- Auto-hide after configurable delay
- Works with multiple choice and short answer questions
- Provides answers with explanations

---

## Settings

| Setting | Description |
|---------|-------------|
| API Key | Your OpenRouter API key |
| Model | Free AI model selection |
| Stealth Mode | Hide UI by default (recommended) |
| Auto-detect | Detect quiz questions and generate one hint per question |
| Auto-hide delay | Seconds before UI hides automatically |

---

## Free Models

| Model ID | Description |
|----------|-------------|
| google/gemma-4-26b-a4b-it:free | Google Gemma 4 (26B) - Recommended |
| google/gemma-4-31b-it:free | Google Gemma 4 (31B) - More powerful |
| openrouter/free | Auto-select best free model |
| minimax/minimax-m2.5:free | MiniMax M2.5 |
| nvidia/nemotron-3-nano-30b-a3b:free | NVIDIA Nemotron Nano |

View all: https://openrouter.ai/models?pricing=free

---

## Project Structure

```
manifest.json          - Extension configuration
background.js          - Service worker (API calls, context menus)
content.js             - Page injection (quiz detection, UI)
styles.css             - Minimal injected styles
popup.html/js/css      - Settings popup
sidebar.html/js/css    - Sidebar panel
utils/stealth.js       - Anti-detection utilities
utils/quiz-parser.js   - Quiz format parsing
utils/ai-service.js    - AI communication utilities
```

---

## Stealth Mode

Enabled by default. Extension UI is completely hidden until activated via keyboard shortcut. Features:

- Shadow DOM isolation - elements hidden from page scanning
- Random class names - no detectable patterns
- Focus mode detection - auto-hides during exam mode
- No global objects or console traces
- Auto-hide timer - UI disappears after configured delay

---

## Troubleshooting

**Extension icon not showing**: Ensure PNG icons exist in `icons/` folder.

**API key not configured**: Click extension icon and enter OpenRouter API key.

**Quiz not detected**: Navigate to quiz page, select question text, press `Ctrl+Shift+E` to manually trigger.

**API failed**: Verify key is correct, check internet connection, retry (free models have rate limits).

---

## Privacy

- API keys stored locally only
- No analytics or tracking
- API calls use HTTPS
- No billing information required

---

## License

MIT License

---

## Disclaimer

For educational purposes only. Use responsibly and follow your institution's academic integrity policies.
