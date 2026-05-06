# AI Translator Browser Extension

AI Translator is a Chrome/Edge extension for quiz assistance on learning platforms. It detects active questions, calls OpenRouter models, and shows answer hints in a stealth sidebar.

## Highlights

- Supports quiz flows on LinkedIn Learning, Harvard ManageMentor, and Akajob/SkillUp.
- Handles multiple choice, multiple select, visual-heavy questions, and coding questions.
- Includes in-tab prefetch and background preload so later questions can be answered faster.
- Supports both free and paid OpenRouter models (including Gemini 2.5 variants).
- Uses a CSP-safe page bridge (`page-bridge.js`) for sites that block inline injected scripts.
- Includes extension-context recovery messaging when service worker/content communication breaks after reload/update.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Q` | Toggle sidebar |
| `Ctrl+Shift+E` | Solve current detected question |
| `Ctrl+Shift+A` | Toggle auto-detect/prefetch on current page |
| `Alt+Shift+Q` | Legacy toggle fallback |
| `Alt+Shift+E` | Legacy solve fallback |
| `Alt+Shift+A` | Legacy auto-detect toggle |
| `Alt+Shift+R` | Regenerate answer (force refresh) |

## Installation

1. Open `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Open extension popup and set your OpenRouter API key.

### Icons

If icons are missing:

1. Open `generate-icons.html` in a browser.
2. Click **Download All**.
3. Move generated PNG files into `icons/`.

## Configuration

Open popup settings and configure:

- `AI Provider` (OpenRouter or Gemini)
- `OpenRouter API Key`
- `Gemini API Key` (if using Gemini provider)
- `Quiz model` and `Coding model` (free, paid, or custom model ID)
- `Stealth mode`
- `Auto-detect` (default OFF, can toggle in content sidebar)
- `Follow-up prompt` (optional, improve answer precision)
- `Show explanations`
- `Auto-hide delay`
<img width="558" height="792" alt="image" src="https://github.com/user-attachments/assets/5649c28e-7b75-496e-b0ad-84204cc48542" />

## Supported Model Options (Current Popup List)

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash`
- `google/gemini-2.0-flash-001`
- `google/gemini-2.0-flash-exp:free`
- `google/gemini-2.0-pro-exp-02-05:free`
- `deepseek/deepseek-chat`
- `anthropic/claude-3.5-sonnet`
- `qwen/qwen-2.5-coder-32b-instruct:free`
- `meta-llama/llama-3.3-70b-instruct:free`
- `google/learnlm-1.5-pro-experimental:free`
- `openrouter/auto`

You can also load a custom model ID from saved settings; popup keeps unknown IDs as a custom option.

## How It Works
<img width="1188" height="871" alt="image" src="https://github.com/user-attachments/assets/4d73a83c-97ce-49ba-a5b2-ae51a772e419" />

### Detection and Solving

- Content script (`content.js`) parses the active page for question text and options.
- For visual-only options/questions, it can switch to the vision solve path (`solveQuizVision`).
- For coding questions on Akajob, it uses `solveCodingQuestion` with coding-specific prompt/response handling.

### Prefetch and Caching

- Question fingerprints are used for in-session dedupe and cache lookup.
- Auto-detect can pre-solve high-confidence questions silently, but is OFF by default to reduce token usage.
- Harvard/Akajob async preload uses message bridge events to discover question sets from network JSON responses.
- When auto-detect is OFF, prefetch/background preload are also paused.

### CSP-Safe Bridge

- `page-bridge.js` is declared in `web_accessible_resources` and injected as an external script.
- Bridge emits question payloads from intercepted `fetch`/`XMLHttpRequest` JSON responses.
- Bridge also supports coding editor write-back control messages for insert operations.

## Coding Question Mode

When a coding question is detected (Akajob Monaco editor + coding layout):

- Sidebar renders coding result details: approach, complexity, full code, tests, notes.
- `Insert Logic` inserts only logic block into the template marker region.
- `Copy Logic` copies logic block for manual paste.

### Insert Logic Safety Rules

- Requires start marker (for example `//write your Logic here`).
- Requires end marker (for example output/sample/expected output/test cases comment marker).
- If end marker is missing, insert is aborted to avoid duplicate code.
- Wrapper-like logic blocks (`class`, `main`, full function wrappers) are rejected for safety.

## Project Structure

```text
manifest.json         Extension manifest and permissions
background.js         Service worker (OpenRouter calls, model normalization, parsing)
content.js            Main page logic (detect, sidebar, prefetch, coding insert)
page-bridge.js        Page-context bridge for CSP-safe network/editor hooks
popup.html            Settings UI
popup.js              Settings load/save/test logic
popup.css             Popup styles
sidebar.html/js/css   Legacy/extra sidebar assets
styles.css            Additional style assets
utils/                Older helper modules
icons/                Extension icons
```

## Troubleshooting

- `Failed to communicate with extension` or `context invalidated`:
  - Refresh the current tab once after extension reload/update.
- Sidebar does not appear:
  - Try `Ctrl+Shift+Q` and check shortcuts in browser extension command settings.
- Wrong/no answer due to parse noise:
  - Select question + options manually, then press `Ctrl+Shift+E`.
- Akajob options collapse unexpectedly:
  - Ensure you are on current build with case-sensitive option dedupe for Akajob parser.
- Coding insert duplicates or breaks template:
  - Current logic aborts if no clear end marker is found; add/confirm markers in template comments.

## Privacy

- API key is stored in browser extension storage.
- Requests are sent only to OpenRouter endpoints used by the extension.
- No analytics/tracking module is implemented in this repository.

## Development Notes

- Use `node --check` for fast syntax validation:

```bash
node --check content.js
node --check background.js
node --check page-bridge.js
```

- Reload unpacked extension after code changes.

## Disclaimer

For educational use only. Follow your platform/institution policies and academic integrity rules.
