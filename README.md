# 🤖 AI Quiz Assistant - Browser Extension

A Chrome/Edge extension that uses **free AI models via OpenRouter** to help answer quiz questions on learning platforms like skillup.global.

## ⚠️ Disclaimer

This extension is for **educational and learning purposes only**. Always follow your institution's academic integrity policies. Use this tool to understand explanations and learn from the AI's responses, not to cheat.

---

## 🚀 Features

- **Auto-detect quiz questions** on supported learning platforms
- **Multiple choice support** - Single and multiple correct answers
- **100% Free AI** - Uses OpenRouter's free models (Google Gemma, etc.)
- **No billing required** - All models are completely free
- **Sidebar panel** - Clean, modern UI for viewing answers
- **Floating action button** - Quick access to AI assistant
- **Customizable settings** - Choose model, toggle auto-detect, etc.
- **Local storage** - API keys stored securely in your browser

---

## 📦 Installation

### Development Mode

1. **Download or clone this repository**
   ```bash
   # If this was a git repo:
   git clone <repository-url>
   cd ai-quiz-assistant
   ```

2. **Create PNG icons** (required for Chrome)
   - Create three PNG files in the `icons/` folder:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - You can use the included `generate-icons.html` tool:
     - Open it in your browser
     - Click "Download All" to get all 3 icons
     - Move them to the `icons/` folder

3. **Load the extension in Chrome/Edge**
   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `ai-quiz-assistant` folder

4. **Configure API key**
   - Click the extension icon in the toolbar
   - Enter your OpenRouter API key (free to get)
   - Select your preferred free model
   - Click **Save Settings**
   - Click **Test Connection** to verify

### Getting a Free OpenRouter API Key

1. Go to: https://openrouter.ai/keys
2. Sign up (free, no credit card required)
3. Click "Create Key"
4. Copy the key and paste it in the extension settings

**That's it! No billing setup needed - all models are 100% free!**

---

## 🆓 Free AI Models Available

| Model | Description | Speed |
|-------|-------------|-------|
| `google/gemma-4-26b-a4b-it:free` | Google Gemma 4 (26B) - **Recommended** | ⚡⚡⚡ |
| `google/gemma-4-31b-it:free` | Google Gemma 4 (31B) - More Powerful | ⚡⚡ |
| `openrouter/free` | Auto-select best free model | ⚡⚡⚡ |
| `minimax/minimax-m2.5:free` | MiniMax M2.5 | ⚡⚡ |
| `nvidia/nemotron-3-nano-30b-a3b:free` | NVIDIA Nemotron Nano | ⚡⚡⚡ |

📚 **View all free models**: https://openrouter.ai/models?pricing=free

---

## 📁 Project Structure

```
ai-quiz-assistant/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker (OpenRouter API calls)
├── content.js                 # Injected into quiz pages (quiz detection, UI)
├── styles.css                 # Styles injected into quiz pages
├── popup.html                 # Settings popup UI
├── popup.js                   # Popup logic
├── popup.css                  # Popup styles
├── sidebar.html               # Sidebar panel UI
├── sidebar.js                 # Sidebar logic
├── sidebar.css                # Sidebar styles
├── utils/
│   ├── quiz-parser.js         # Quiz format parsing utilities
│   └── ai-service.js          # AI provider communication utilities
├── icons/
│   ├── icon16.png             # 16x16 icon (required)
│   ├── icon48.png             # 48x48 icon (required)
│   └── icon128.png            # 128x128 icon (required)
├── generate-icons.html        # Tool to generate icons
└── README.md                  # This file
```

---

## 🛠️ How It Works

1. **Quiz Detection**: Content script scans the page for quiz elements (radio buttons, checkboxes, option lists)
2. **Question Extraction**: Parses question text and answer options from the DOM
3. **AI Request**: Sends question to background service worker, which calls OpenRouter API
4. **Response Display**: Shows answer and explanation in sidebar panel
5. **Highlighting**: Optionally highlights the correct answer on the page

---

## ⚙️ Configuration

### Settings (click extension icon)

| Setting | Description |
|---------|-------------|
| **OpenRouter API Key** | Your free API key from openrouter.ai |
| **Model** | Select free AI model (affects speed & accuracy) |
| **Auto-detect** | Automatically detect quiz questions on page load |
| **Show Explanations** | Display explanations with answers |

---

## 🎯 Supported Quiz Formats

The extension can detect and parse:
- ✅ Multiple choice (radio buttons)
- ✅ Multiple select (checkboxes)
- ✅ List-based options
- ✅ Div-based option containers
- ✅ Table-based quizzes
- ✅ Custom HTML structures

---

## 🔒 Privacy & Security

- **API keys stored locally only** - Never transmitted to third parties
- **No analytics or tracking** - Extension doesn't collect usage data
- **Open-source** - All code is visible and auditable
- **HTTPS only** - API calls use secure connections
- **No billing info required** - OpenRouter free tier needs no payment details

---

## 🐛 Troubleshooting

### Extension icon not showing
- Make sure PNG icons exist in the `icons/` folder
- Use `generate-icons.html` to create them
- Reload the extension at `chrome://extensions/`

### "API key not configured" error
- Click the extension icon and enter your OpenRouter API key
- Get a free key at https://openrouter.ai/keys

### Quiz not detected
- Navigate to a page with quiz questions
- Click the floating "AI Solve" button manually
- The quiz format might not be supported yet (open an issue)

### API connection failed
- Check your internet connection
- Verify your OpenRouter API key is correct
- Check OpenRouter status at https://status.openrouter.ai
- Free models have rate limits - wait a moment and retry

---

## 📝 Development

### Testing locally
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the **reload** icon on the extension card
4. Refresh the quiz page to load updated content scripts

### Debugging
- **Content scripts**: Open DevTools on the quiz page → Console
- **Background script**: `chrome://extensions/` → Click "Inspect views: service worker"
- **Popup**: Right-click extension icon → "Inspect popup"

---

## 🔄 Why OpenRouter?

- ✅ **100% Free Models** - No billing required
- ✅ **Multiple Models** - Access to Google Gemma, NVIDIA Nemotron, and more
- ✅ **No Rate Limit Issues** - Generous free tier
- ✅ **Simple Setup** - One API key for all models
- ✅ **Open Standard** - Compatible with OpenAI API format

---

## 📄 License

MIT License - Feel free to modify and use as needed.

---

## 🙏 Acknowledgments

- Built with Manifest V3 (Chrome Extension API)
- Uses OpenRouter API for free AI models
- Powered by Google Gemma and other open models
- Inspired by educational technology tools

---

## 📧 Support

For issues, feature requests, or questions, please open an issue on the repository.

**Remember**: Use this tool responsibly and for learning purposes! 🎓
