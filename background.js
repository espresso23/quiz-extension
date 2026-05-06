// background.js - Service Worker for AI API calls and extension event handling (STEALTH MODE)

// Default settings
const DEFAULT_SETTINGS = {
  aiProvider: 'openrouter',
  apiKey: '',
  geminiApiKey: '',
  model: 'openai/gpt-5',
  modelQuiz: 'openai/gpt-5',
  modelCoding: 'google/gemma-4-26b-a4b-it:free',
  autoDetect: false,
  followUpPrompt: '',
  showExplanations: true,
  stealthMode: true,
  autoHideDelay: 8000
};

const MODEL_CATALOG = [
  'openai/gpt-5',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-pro-exp-02-05:free',
  'deepseek/deepseek-chat',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/learnlm-1.5-pro-experimental:free',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'openrouter/auto'
];

const CONTEXT_MENU_ITEMS = [
  {
    id: 'ai-solve-selection',
    title: 'Translate This Text',
    contexts: ['selection']
  },
  {
    id: 'ai-solve-page',
    title: 'Analyze Page Content',
    contexts: ['page']
  },
  {
    id: 'ai-toggle-ui',
    title: 'Toggle Translator UI',
    contexts: ['page']
  },
  {
    id: 'ai-hide-all',
    title: 'Hide Translator UI',
    contexts: ['page']
  }
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    }
  });
  
  // Create right-click context menu
  void createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void createContextMenus();
});

// Create context menus for stealth activation
async function createContextMenus() {
  await new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

  for (const item of CONTEXT_MENU_ITEMS) {
    await new Promise((resolve) => {
      chrome.contextMenus.create(item, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.warn('[AI Translator] Failed to create context menu:', item.id, err.message || err);
        }
        resolve();
      });
    });
  }
}

/**
 * Safely send a message to a tab without throwing uncaught promise errors.
 */
async function sendMessageToTabSafe(tabId, message) {
  if (!tabId) return false;

  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (error) {
    // Happens on restricted pages or when content script is not available.
    if (error && error.message && error.message.includes('Receiving end does not exist')) {
      console.debug('[AI Translator] No content script receiver in tab:', tabId);
      return false;
    }

    console.warn('[AI Translator] Failed to send tab message:', error);
    return false;
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ai-solve-selection' && info.selectionText) {
    // Send selected text to content script
    await sendMessageToTabSafe(tab?.id, {
      action: 'solveQuiz',
      question: info.selectionText,
      options: [],
      questionType: 'short_answer'
    });
  }

  if (info.menuItemId === 'ai-solve-page') {
    await sendMessageToTabSafe(tab?.id, { action: 'solveQuestion' });
  }

  if (info.menuItemId === 'ai-toggle-ui') {
    await sendMessageToTabSafe(tab?.id, { action: 'toggleUI' });
  }

  if (info.menuItemId === 'ai-hide-all') {
    await sendMessageToTabSafe(tab?.id, { action: 'hideAllUI' });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveQuiz') {
    handleQuizQuestion(request.question, request.options, request.questionType, request.model, request.followUpPrompt)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'solveCodingQuestion') {
    handleCodingQuestion(request.payload, request.model)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.action === 'parseQuestionFromDOM') {
    handleParseQuestionFromDOM(request.snapshot, request.hintQuestion, request.hintOptions)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.action === 'solveQuizVision') {
    handleVisionQuizQuestion(request.payload, sender, request.model)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    const incoming = request.settings || {};
    const quizModel = normalizePreferredModel(incoming.modelQuiz || incoming.model || DEFAULT_SETTINGS.model);
    const codingModel = normalizePreferredModel(incoming.modelCoding || incoming.model || DEFAULT_SETTINGS.model);
    const safeSettings = {
      ...DEFAULT_SETTINGS,
      ...incoming,
      autoDetect: incoming.autoDetect === true,
      followUpPrompt: normalizeFollowUpPrompt(incoming.followUpPrompt || ''),
      modelQuiz: quizModel,
      modelCoding: codingModel,
      model: quizModel
    };

    chrome.storage.sync.set({ settings: safeSettings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[AI Translator] Command received:', command);

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs && tabs.length > 0 ? tabs[0] : null;

  if (!activeTab || !activeTab.id) return;

  if (command === 'solve_selection') {
    await sendMessageToTabSafe(activeTab.id, { action: 'solveQuestion' });
  }

  if (command === 'toggle_assistant') {
    await sendMessageToTabSafe(activeTab.id, { action: 'toggleUI' });
  }
});

// Open popup on action click (default behavior)

/**
 * Generic AI call dispatcher
 */
async function callAI(prompt, responseParser = parseAIResponse, requestOptions = {}) {
  const settings = await getSettings();
  const provider = settings.aiProvider || 'openrouter';
  const selectedModel = requestOptions.model || normalizePreferredModel(settings.modelQuiz || settings.model);

  if (provider === 'gemini') {
    if (!settings.geminiApiKey) {
      throw new Error('Gemini API key not configured. Please set your Gemini API key in extension settings.');
    }
    return callGeminiAPI(settings.geminiApiKey, prompt, selectedModel, responseParser, requestOptions);
  } else {
    if (!settings.apiKey) {
      throw new Error('API key not configured. Please set your OpenRouter API key in extension settings.');
    }
    return callOpenRouterAPI(settings.apiKey, prompt, selectedModel, responseParser, requestOptions);
  }
}

/**
 * Call Google Gemini API directly
 */
async function callGeminiAPI(apiKey, prompt, model, responseParser = parseAIResponse, requestOptions = {}) {
  // Map models if needed
  let geminiModel = model;
  if (geminiModel.includes('/')) {
    // If it's an OpenRouter style model name, try to extract the base name
    geminiModel = geminiModel.split('/').pop();
  }
  
  // Ensure it's a valid Gemini model name for the API
  if (!geminiModel.startsWith('gemini-')) {
    geminiModel = 'gemini-1.5-flash'; // Safer default fallback
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  
  const contents = [];
  const userParts = [];

  if (requestOptions.image) {
    const base64Data = requestOptions.image.split(',')[1] || requestOptions.image;
    userParts.push({
      inline_data: {
        mime_type: 'image/png',
        data: base64Data
      }
    });
  }

  if (prompt) {
    userParts.push({ text: prompt });
  } else if (requestOptions.customMessages) {
    // Convert OpenRouter messages to Gemini parts if possible
    const lastUserMsg = requestOptions.customMessages.findLast(m => m.role === 'user');
    if (lastUserMsg) {
      if (typeof lastUserMsg.content === 'string') {
        userParts.push({ text: lastUserMsg.content });
      } else if (Array.isArray(lastUserMsg.content)) {
        for (const part of lastUserMsg.content) {
          if (part.type === 'text') {
            userParts.push({ text: part.text });
          } else if (part.type === 'image_url') {
            const imgData = part.image_url.url;
            const base64 = imgData.split(',')[1] || imgData;
            userParts.push({
              inline_data: {
                mime_type: 'image/png',
                data: base64
              }
            });
          }
        }
      }
    }
  }

  contents.push({
    role: 'user',
    parts: userParts
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: requestOptions.temperature || 0.3,
          maxOutputTokens: requestOptions.maxTokens || 1000,
          response_mime_type: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMsg = errorData.error?.message || response.statusText;
      
      // Fallback logic for "Model not found" or "Model not supported"
      if (errorMsg.includes('not found') || errorMsg.includes('not supported') || response.status === 404) {
        if (geminiModel !== 'gemini-2.0-flash' && geminiModel !== 'gemini-1.5-flash') {
          console.log(`[AI Translator] Model ${geminiModel} not available, falling back to gemini-2.0-flash`);
          return callGeminiAPI(apiKey, prompt, 'gemini-2.0-flash', responseParser, requestOptions);
        }
      }

      // Fallback logic for "Quota exceeded"
      if (errorMsg.toLowerCase().includes('quota') || response.status === 429) {
        if (geminiModel.startsWith('gemini-2.0')) {
          console.log(`[AI Translator] Gemini 2.0 quota exceeded, trying Gemini 1.5 Flash...`);
          return callGeminiAPI(apiKey, prompt, 'gemini-1.5-flash', responseParser, requestOptions);
        }
        throw new Error(`Bạn đã hết hạn mức (Quota) miễn phí của Gemini. Vui lòng đợi vài phút hoặc đổi sang OpenRouter trong phần cài đặt.`);
      }
      
      throw new Error(`Gemini API error: ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) {
      throw new Error('Gemini API returned empty response content');
    }

    return responseParser(content);
  } catch (err) {
    if (err.message.includes('not found') && geminiModel !== 'gemini-2.0-flash' && geminiModel !== 'gemini-1.5-flash') {
      return callGeminiAPI(apiKey, prompt, 'gemini-2.0-flash', responseParser, requestOptions);
    }
    throw err;
  }
}

/**
 * Main function to solve quiz question using AI via OpenRouter
 */
async function handleQuizQuestion(question, options, questionType = 'multiple_choice', modelOverride = '', followUpPrompt = '') {
  const normalizedFollowUpPrompt = normalizeFollowUpPrompt(followUpPrompt);
  const prompt = buildPrompt(question, options, questionType, normalizedFollowUpPrompt);
  const settings = await getSettings();
  const resolvedModel = normalizePreferredModel(modelOverride || settings.modelQuiz || settings.model);
  const requestOptions = {
    allowVision: false,
    model: resolvedModel
  };
  return callAI(prompt, parseAIResponse, requestOptions);
}

async function handleCodingQuestion(payload, modelOverride = '') {
  const followUpPrompt = normalizeFollowUpPrompt(payload?.followUpPrompt || '');
  const prompt = buildCodingPrompt(payload, followUpPrompt);
  const settings = await getSettings();
  const resolvedModel = normalizePreferredModel(modelOverride || settings.modelCoding || settings.model);
  const requestOptions = {
    allowVision: false,
    temperature: 0.2,
    maxTokens: 1400,
    model: resolvedModel
  };

  return callAI(prompt, parseCodingResponse, requestOptions);
}

async function handleVisionQuizQuestion(payload, sender, modelOverride = '') {
  const settings = await getSettings();
  const capturedImage = await captureQuizRegionImage(payload, sender);
  const followUpPrompt = normalizeFollowUpPrompt(payload?.followUpPrompt || '');
  const prompt = payload?.question || 'Analyze this quiz question and provide the correct answer.';
  const provider = settings.aiProvider || 'openrouter';
  const preferredModel = normalizePreferredModel(modelOverride || settings.modelQuiz || settings.model);

  if (provider === 'openrouter') {
    const visionModel = pickVisionModel(preferredModel);
    const visionFallbackModels = buildVisionFallbackModels(visionModel);

    return callAI('', parseAIResponse, {
      customMessages: buildVisionMessages(payload, capturedImage),
      model: visionModel,
      fallbackModels: visionFallbackModels,
      temperature: 0.1,
      maxTokens: 700,
      allowVision: true
    });
  }

  return callAI(prompt, parseAIResponse, {
    image: capturedImage,
    temperature: 0.1,
    maxTokens: 700,
    allowVision: true,
    model: preferredModel
  });
}

async function captureQuizRegionImage(payload, sender) {
  try {
    const windowId = sender?.tab?.windowId;
    if (!Number.isInteger(windowId)) return '';

    const captured = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    if (!captured) return '';

    const rect = payload?.captureRect;
    if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
      return captured;
    }

    const cropped = await cropDataUrlImage(captured, rect);
    return cropped || captured;
  } catch (error) {
    console.warn('[AI Translator] captureVisibleTab failed, using fallback images:', error);
    return '';
  }
}

async function cropDataUrlImage(dataUrl, rect) {
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      return dataUrl;
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const dpr = Number.isFinite(rect.devicePixelRatio) && rect.devicePixelRatio > 0 ? rect.devicePixelRatio : 1;
    const sx = Math.max(0, Math.floor((rect.left || 0) * dpr));
    const sy = Math.max(0, Math.floor((rect.top || 0) * dpr));
    const sw = Math.max(1, Math.floor((rect.width || 1) * dpr));
    const sh = Math.max(1, Math.floor((rect.height || 1) * dpr));

    const maxW = bitmap.width - sx;
    const maxH = bitmap.height - sy;
    if (maxW <= 1 || maxH <= 1) return dataUrl;

    const cw = Math.max(1, Math.min(sw, maxW));
    const ch = Math.max(1, Math.min(sh, maxH));

    const canvas = new OffscreenCanvas(cw, ch);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(bitmap, sx, sy, cw, ch, 0, 0, cw, ch);
    const outBlob = await canvas.convertToBlob({ type: 'image/png' });
    return await blobToDataUrl(outBlob);
  } catch (error) {
    console.warn('[AI Translator] crop screenshot failed:', error);
    return dataUrl;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

async function handleParseQuestionFromDOM(snapshot, hintQuestion = '', hintOptions = []) {
  const settings = await getSettings();
  const prompt = buildDOMParsePrompt(snapshot, hintQuestion, hintOptions);
  
  // Use a fast model for parsing if using OpenRouter, or stick to user preference if it's gemini
  let parseModel = normalizePreferredModel(settings.model || 'google/gemma-4-26b-a4b-it:free');
  
  return callAI(prompt, parseQuestionExtractionResponse, {
    model: settings.aiProvider === 'openrouter' ? 'google/gemma-4-26b-a4b-it:free' : parseModel
  });
}

/**
 * Build AI prompt for the quiz question
 */
function buildPrompt(question, options, questionType, followUpPrompt = '') {
  const normalizedFollowUpPrompt = normalizeFollowUpPrompt(followUpPrompt);
  let prompt = `You are a professional quiz assistant and subject matter expert. 
Your task is to analyze the following question and provide the most accurate answer.

STEP 1: Carefully reason through the question and evaluate each option.
STEP 2: Identify the correct answer based on standard academic and industry knowledge.
STEP 3: Format your final response strictly as a single JSON object.

Question Type: ${questionType}
Question: ${question}

`;
  
  if (options && options.length > 0) {
    prompt += `Options:\n`;
    options.forEach((option, index) => {
      prompt += `${String.fromCharCode(65 + index)}. ${option}\n`;
    });
    prompt += '\n';
  }
  
  prompt += `RESPONSE RULES:
- Return ONLY valid JSON.
- DO NOT include markdown code blocks (e.g., \`\`\`json).
- DO NOT include any introductory or concluding text.
- For "answer", provide only the letter (A, B, C, etc.).
- For "answerText", provide the full text of that option.
- For "explanation", provide a professional explanation.

JSON structure:
{
  "answer": "A",
  "answerText": "Exact text of the correct option",
  "explanation": "Detailed professional reasoning"
}`;

  if (normalizedFollowUpPrompt) {
    prompt += `\n\nFOLLOW-UP REQUIREMENT (must obey):\n${normalizedFollowUpPrompt}`;
  }
  
  return prompt;
}

function buildCodingPrompt(payload, followUpPrompt = '') {
  const normalizedFollowUpPrompt = normalizeFollowUpPrompt(followUpPrompt);
  const question = String(payload?.question || '').trim();
  const language = normalizeCodingLanguage(payload?.language);
  const starterCode = String(payload?.starterCode || '').trim();

  let prompt = `You are an expert coding interview assistant.
Solve the following coding problem and return ONLY a valid JSON object.

Preferred Language: ${language}

Problem:
${question}

`;

  if (starterCode) {
    prompt += `STARTER CODE (THE SOURCE OF TRUTH):
\`\`\`${language.toLowerCase()}
${starterCode}
\`\`\`

`;
  } else {
    prompt += `NOTE: The editor is currently EMPTY. Provide a COMPLETE standalone program.
For JavaScript, use "gets()" or "readLine()" for line-by-line input.
For Python, use "input()" or "sys.stdin.read()".

`;
  }

  prompt += `CRITICAL RULES FOR "logicBlock":
1. ABSOLUTELY NO WRAPPERS: Do NOT include function headers, class declarations, or main method wrappers if they already exist in the starter code.
2. ONLY INNER LOGIC: Provide only the statements that will be inserted into the editor's placeholder.
3. NEVER REWRITE INPUT/OUTPUT: Do not include code that reads from STDIN or prints to STDOUT (like N=input(), print(result)) if that code is already in the starter template. Focus strictly on solving the problem within the provided function.

EXAMPLE (Python):
Starter: 
def solve(N, A):
    # write logic here:
    return result

Your logicBlock:
    result = sum(A) // N
(NOT "def solve(N, A): ...")
(NOT "A = list(map(int, input().split()))")
(NOT "print(solve(N, A))")

RESPONSE RULES:
- Return ONLY valid JSON.
- DO NOT include markdown code blocks (e.g., \`\`\`json).
- DO NOT include any introductory or concluding text.

JSON structure:
{
  "approach": "short explanation",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "logicBlock": "the RAW implementation statements ONLY",
  "code": "full combined compilable solution",
  "testCases": ["input -> output", "..."],
  "notes": "important notes"
}`;

  if (normalizedFollowUpPrompt) {
    prompt += `\n\nFOLLOW-UP REQUIREMENT (must obey):\n${normalizedFollowUpPrompt}`;
  }

  return prompt;
}

function normalizeCodingLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (!value) return 'Java';

  if (value.includes('javascript') || value === 'js' || value.includes('node')) return 'JavaScript';
  if (value.includes('java')) return 'Java';
  if (value.includes('python')) return 'Python';
  if (value.includes('c++') || value.includes('cpp')) return 'C++';
  if (value.includes('c#') || value.includes('csharp')) return 'C#';
  if (value === 'c') return 'C';

  return language;
}

function buildDOMParsePrompt(snapshot, hintQuestion, hintOptions) {
  let prompt = 'You extract quiz question and options from noisy webpage text.\n';
  prompt += 'Return only valid JSON. Do not include markdown or explanation.\n\n';
  prompt += 'JSON schema:\n';
  prompt += '{\n';
  prompt += '  "question": "string",\n';
  prompt += '  "options": ["string", "..."],\n';
  prompt += '  "questionType": "multiple_choice" | "multiple_select",\n';
  prompt += '  "confidence": 0.0\n';
  prompt += '}\n\n';
  prompt += 'Rules:\n';
  prompt += '- Keep only the current active question.\n';
  prompt += '- Keep options concise and deduplicated.\n';
  prompt += '- Ignore UI noise: submit, incorrect, replay, review this video, next, previous.\n';
  prompt += '- If question is unclear, still infer best question text from nearby option block.\n';
  prompt += '- options must be 2-12 items.\n';

  if (hintQuestion) {
    prompt += `\nHint question: ${hintQuestion}\n`;
  }

  if (Array.isArray(hintOptions) && hintOptions.length > 0) {
    prompt += 'Hint options:\n';
    hintOptions.slice(0, 10).forEach((opt, idx) => {
      prompt += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
    });
  }

  prompt += '\nDOM snapshot:\n';
  prompt += snapshot || '(empty)';

  return prompt;
}

function buildVisionMessages(payload, capturedImage = '') {
  const followUpPrompt = normalizeFollowUpPrompt(payload?.followUpPrompt || '');
  const question = String(payload?.question || '').trim();
  const options = Array.isArray(payload?.options) ? payload.options : [];
  const visualHints = Array.isArray(payload?.visualHints) ? payload.visualHints : [];
  const imageItems = Array.isArray(payload?.images) ? payload.images : [];

  let prompt = 'You are a quiz assistant. Read the question and option images carefully, then answer with valid JSON only.\n\n';
  if (question) {
    prompt += `Question: ${question}\n\n`;
  }
  if (options.length > 0) {
    prompt += 'Text options (if available):\n';
    options.forEach((opt, i) => {
      prompt += `${String.fromCharCode(65 + i)}. ${opt}\n`;
    });
    prompt += '\n';
  }

  if (visualHints.length > 0) {
    prompt += 'Visual hints extracted from option images:\n';
    visualHints.forEach((hint) => {
      prompt += `- ${hint}\n`;
    });
    prompt += '\n';
  }

  prompt += 'Important instructions:\n';
  prompt += '- Read chart/table data directly from image if present.\n';
  prompt += '- If options are entities (like M, N, P, Q, R), choose based on the image data and map to option letter.\n';
  prompt += '- Never answer with uncertainty. Choose the best supported option from provided choices.\n\n';

  prompt += 'Return exact JSON:\n';
  prompt += '{\n';
  prompt += '  "answer": "A|B|C|D|...",\n';
  prompt += '  "answerText": "full answer text",\n';
  prompt += '  "explanation": "short explanation"\n';
  prompt += '}\n';

  if (followUpPrompt) {
    prompt += `\nFollow-up requirement (must obey):\n${followUpPrompt}\n`;
  }

  const content = [{ type: 'text', text: prompt }];

  if (capturedImage) {
    content.push({ type: 'image_url', image_url: { url: capturedImage } });
  }

  imageItems.slice(0, 6).forEach((img) => {
    if (!img) return;
    if (typeof img === 'string') {
      content.push({ type: 'image_url', image_url: { url: img } });
      return;
    }

    if (img.kind === 'visual-node') {
      return;
    }

    if (img.url) {
      content.push({ type: 'image_url', image_url: { url: img.url } });
      return;
    }

    if (img.dataUrl) {
      content.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }
  });

  return [
    { role: 'system', content: 'Always return valid JSON only.' },
    { role: 'user', content }
  ];
}

function normalizeFollowUpPrompt(value) {
  const prompt = String(value || '').replace(/\s+/g, ' ').trim();
  if (!prompt) return '';
  return prompt.slice(0, 600);
}

function pickVisionModel(preferredModel) {
  if (!preferredModel) {
    return 'meta-llama/llama-3.2-11b-vision-instruct:free';
  }

  if (preferredModel === 'openrouter/free') {
    return 'meta-llama/llama-3.2-11b-vision-instruct:free';
  }

  if (/vl|vision|gemini-/i.test(preferredModel)) {
    return preferredModel;
  }

  return preferredModel;
}

function buildVisionFallbackModels(primaryModel) {
  const models = [
    primaryModel,
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen2.5-vl-72b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'openrouter/auto'
  ];

  const unique = [];
  const seen = new Set();
  models.forEach((model) => {
    if (!model || seen.has(model)) return;
    seen.add(model);
    unique.push(model);
  });

  return unique;
}

function normalizePreferredModel(model) {
  const preferred = String(model || '').trim();
  if (!preferred) return DEFAULT_SETTINGS.model;

  if (MODEL_CATALOG.includes(preferred)) {
    return preferred;
  }

  // Allow custom model ids entered from previous versions.
  return preferred;
}

/**
 * Call OpenRouter API (supports all models including free Gemini)
 */
async function callOpenRouterAPI(apiKey, prompt, model = 'google/gemini-2.0-flash-exp:free', responseParser = parseAIResponse, requestOptions = {}) {
  const fallbackModels = Array.isArray(requestOptions.fallbackModels) && requestOptions.fallbackModels.length > 0
    ? requestOptions.fallbackModels
    : [
        'google/gemma-4-26b-a4b-it:free',
        'openrouter/auto'
      ];

  const triedModels = new Set();
  return callOpenRouterAPIWithFallback(apiKey, prompt, model, fallbackModels, triedModels, responseParser, requestOptions);
}

async function callOpenRouterAPIWithFallback(apiKey, prompt, model, fallbackModels, triedModels, responseParser, requestOptions = {}) {
  triedModels.add(model);

  let messages = requestOptions.customMessages;
  
  if (!messages) {
    if (requestOptions.image) {
      // Direct vision support for OpenRouter path
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze this quiz question and provide the correct answer.' },
            { type: 'image_url', image_url: { url: requestOptions.image } }
          ]
        }
      ];
    } else {
      messages = [
        { role: 'system', content: 'You are a helpful quiz assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ];
    }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/ai-quiz-assistant',
      'X-Title': 'AI Quiz Assistant'
    },
    body: JSON.stringify({
      model: model,
      messages,
      temperature: Number.isFinite(requestOptions.temperature) ? requestOptions.temperature : 0.3,
      max_tokens: Number.isFinite(requestOptions.maxTokens) ? requestOptions.maxTokens : 500
    })
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const error = await response.json();
      if (error.error) {
        errorMsg = error.error.message || JSON.stringify(error.error);

        if (shouldRetryWithFallback(errorMsg, model)) {
          const nextModel = pickNextFallbackModel(model, fallbackModels, triedModels);
          if (nextModel) {
            console.log('[AI Translator] Model failed (' + model + '), retrying with:', nextModel);
            return callOpenRouterAPIWithFallback(apiKey, prompt, nextModel, fallbackModels, triedModels, responseParser, requestOptions);
          }
        }
      }
    } catch (e) {
      // ignore parse error
    }
    throw new Error(`OpenRouter API error: ${errorMsg}`);
  }
  
  const data = await response.json();
  const content = extractResponseContent(data);

  if (!content) {
    const nextModel = pickNextFallbackModel(model, fallbackModels, triedModels);
    if (nextModel && isFreeModel(model)) {
      console.log('[AI Translator] Empty model output (' + model + '), retrying with:', nextModel);
      return callOpenRouterAPIWithFallback(apiKey, prompt, nextModel, fallbackModels, triedModels, responseParser, requestOptions);
    }
    throw new Error('OpenRouter API returned empty response content');
  }

  return responseParser(content);
}

function isFreeModel(model) {
  if (!model) return false;
  return model === 'openrouter/free' || model.includes(':free');
}

function extractResponseContent(data) {
  if (!data) return '';

  const choice = data.choices && data.choices[0] ? data.choices[0] : null;
  if (!choice) return '';

  const message = choice.message || null;
  const content = message ? message.content : null;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part.text === 'string') return part.text;
        if (typeof part.content === 'string') return part.content;
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
    if (joined) return joined;
  }

  if (typeof choice.text === 'string') {
    return choice.text.trim();
  }

  if (message && typeof message.reasoning === 'string') {
    return message.reasoning.trim();
  }

  return '';
}

function shouldRetryWithFallback(errorMsg, model) {
  const message = (errorMsg || '').toLowerCase();
  
  // Model validity or capability errors
  const invalidModel = message.includes('not a valid model id') ||
    message.includes('invalid model') ||
    message.includes('unknown model') ||
    message.includes('model not found');

  const visionUnsupported = message.includes('does not support image') ||
    message.includes('does not support vision') ||
    message.includes('multimodal is not supported') ||
    message.includes('image input is not supported') ||
    message.includes('vision is not supported') ||
    message.includes('unsupported content type');

  if (invalidModel || visionUnsupported) return true;

  // Rate limits or provider availability errors - mostly for free models
  const isFree = !model || model.includes(':free') || model.includes('openrouter/free') || model.includes('openrouter/auto');
  
  const availabilityError = message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('overloaded') ||
    message.includes('provider returned error') ||
    message.includes('temporarily unavailable') ||
    message.includes('no provider available') ||
    message.includes('no provider found') ||
    message.includes('provider has no endpoint') ||
    message.includes('upstream') ||
    message.includes('timeout') ||
    message.includes('quota') ||
    message.includes('insufficient balance') ||
    message.includes('credit');

  if (isFree && availabilityError) return true;

  return false;
}

function pickNextFallbackModel(currentModel, fallbackModels, triedModels) {
  for (const candidate of fallbackModels) {
    if (candidate === currentModel) continue;
    if (triedModels.has(candidate)) continue;
    return candidate;
  }
  return '';
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(content) {
  let safeContent = typeof content === 'string' ? content : String(content || '');
  
  // Pre-clean: remove markdown fences if AI ignored instructions
  safeContent = safeContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

  try {
    // Try to extract the first JSON-like structure
    const startIdx = safeContent.indexOf('{');
    const endIdx = safeContent.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = safeContent.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      
      return {
        answer: String(parsed.answer || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5),
        answerText: String(parsed.answerText || ''),
        explanation: String(parsed.explanation || '')
      };
    }
    throw new Error('No valid JSON block found');
  } catch (e) {
    console.warn('[AI Translator] JSON parse failed, trying repair:', e.message);
    const repaired = repairUnstructuredAnswerToJson(safeContent);
    if (repaired) {
      return repaired;
    }

    return {
      answer: '',
      answerText: 'Could not parse structured response',
      explanation: safeContent
    };
  }
}

function parseCodingResponse(content) {
  let safeContent = typeof content === 'string' ? content : String(content || '');
  
  // Clean markdown fences
  safeContent = safeContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

  try {
    const startIdx = safeContent.indexOf('{');
    const endIdx = safeContent.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = safeContent.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      
      return {
        mode: 'coding',
        approach: String(parsed.approach || '').trim(),
        timeComplexity: String(parsed.timeComplexity || '').trim(),
        spaceComplexity: String(parsed.spaceComplexity || '').trim(),
        logicBlock: normalizeLogicBlockFromModel(parsed.logicBlock, parsed.code),
        code: String(parsed.code || '').trim(),
        testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
        notes: String(parsed.notes || '').trim()
      };
    }
    throw new Error('No JSON block found');
  } catch (error) {
    console.warn('[AI Translator] Coding JSON parse failed:', error.message);
    return {
      mode: 'coding',
      approach: 'Could not parse structured coding response.',
      timeComplexity: 'N/A',
      spaceComplexity: 'N/A',
      logicBlock: '',
      code: safeContent,
      testCases: [],
      notes: 'Raw model output shown in code block.'
    };
  }
}

function normalizeLogicBlockFromModel(logicBlock, code) {
  let normalized = stripCodeFences(String(logicBlock || '').trim());
  
  if (!normalized) {
    normalized = stripCodeFences(String(code || '').trim());
  }
  
  if (!normalized) return '';

  // Heuristic to remove function/class wrappers if AI included them by mistake
  const lines = normalized.split('\n');
  if (lines.length > 2) {
    const firstLine = lines[0].trim();
    const lastLine = lines[lines.length - 1].trim();

    // Remove Python def/class wrapper
    if (firstLine.startsWith('def ') && firstLine.endsWith(':') && lastLine === '') {
       return lines.slice(1).map(l => l.replace(/^    /, '')).join('\n').trim();
    }

    // Remove Java/JS function wrapper
    if ((firstLine.includes('function ') || firstLine.includes('class ')) && firstLine.endsWith('{') && lastLine === '}') {
       return lines.slice(1, -1).map(l => l.replace(/^    /, '')).join('\n').trim();
    }
  }

  return normalized;
}

function stripCodeFences(text) {
  let value = String(text || '').trim();
  if (!value) return '';

  if (value.startsWith('```')) {
    value = value.replace(/^```[a-zA-Z0-9_\-]*\s*/,'');
    value = value.replace(/```$/,'').trim();
  }

  return value;
}

function repairUnstructuredAnswerToJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const letterMatch = raw.match(/\banswer\s*[:\-]?\s*([A-H])\b/i) || raw.match(/\b([A-H])\b/);
  const letter = letterMatch ? String(letterMatch[1] || '').toUpperCase() : '';
  if (!letter) return null;

  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const answerLine = lines.find((line) => /answer/i.test(line)) || lines[0] || '';
  const explanationLine = lines.find((line) => /because|since|therefore|hence|profit|maximum|minimum|chart|graph|table/i.test(line)) || raw;

  return {
    answer: letter,
    answerText: answerLine.length > 240 ? answerLine.slice(0, 240) : answerLine,
    explanation: explanationLine.length > 1200 ? explanationLine.slice(0, 1200) : explanationLine
  };
}

function parseQuestionExtractionResponse(content) {
  const safeContent = typeof content === 'string' ? content : String(content || '');
  try {
    const jsonMatch = safeContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in parser response');

    const parsed = JSON.parse(jsonMatch[0]);
    const options = Array.isArray(parsed.options) ? parsed.options : [];
    return {
      question: String(parsed.question || '').trim(),
      options: options.map((opt) => String(opt || '').trim()).filter(Boolean),
      questionType: parsed.questionType === 'multiple_select' ? 'multiple_select' : 'multiple_choice',
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0.6
    };
  } catch (error) {
    throw new Error('Unable to parse question from DOM snapshot');
  }
}

/**
 * Get current settings from storage
 */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      resolve(result.settings || DEFAULT_SETTINGS);
    });
  });
}
