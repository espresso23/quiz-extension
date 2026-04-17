// background.js - Service Worker for AI API calls and extension event handling (STEALTH MODE)

// Default settings
const DEFAULT_SETTINGS = {
  aiProvider: 'openrouter', // 'openrouter' or 'gemini'
  apiKey: '', // OpenRouter API Key
  geminiApiKey: '', // Google Gemini API Key
  model: 'google/gemma-4-26b-a4b-it:free', // Default model
  autoDetect: true,
  showExplanations: true,
  stealthMode: true,
  autoHideDelay: 8000
};

const MODEL_CATALOG = [
  'google/gemini-2.0-pro-exp-02-05',
  'google/gemini-2.0-flash',
  'google/gemini-exp-1206',
  'google/gemma-4-31b-it:free',
  'openrouter/auto'
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    }
  });
  
  // Create right-click context menu
  createContextMenus();
});

// Create context menus for stealth activation
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'ai-solve-selection',
    title: 'Translate This Text',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-solve-page',
    title: 'Analyze Page Content',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'ai-toggle-ui',
    title: 'Toggle Translator UI',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'ai-hide-all',
    title: 'Hide Translator UI',
    contexts: ['page']
  });
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
    handleQuizQuestion(request.question, request.options, request.questionType)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'solveCodingQuestion') {
    handleCodingQuestion(request.payload)
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
    handleVisionQuizQuestion(request.payload, sender)
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
    chrome.storage.sync.set({ settings: request.settings }, () => {
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
  const selectedModel = requestOptions.model || normalizePreferredModel(settings.model);

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
    geminiModel = 'gemini-2.0-flash'; // Secure fallback
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
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!content) {
    throw new Error('Gemini API returned empty response content');
  }

  return responseParser(content);
}

/**
 * Main function to solve quiz question using AI via OpenRouter
 */
async function handleQuizQuestion(question, options, questionType = 'multiple_choice') {
  const prompt = buildPrompt(question, options, questionType);
  return callAI(prompt, parseAIResponse, { allowVision: false });
}

async function handleCodingQuestion(payload) {
  const prompt = buildCodingPrompt(payload);
  return callAI(prompt, parseCodingResponse, {
    allowVision: false,
    temperature: 0.2,
    maxTokens: 1400
  });
}

async function handleVisionQuizQuestion(payload, sender) {
  const capturedImage = await captureQuizRegionImage(payload, sender);
  const prompt = payload?.question || 'Analyze this quiz question and provide the correct answer.';

  return callAI(prompt, parseAIResponse, {
    image: capturedImage,
    temperature: 0.1,
    maxTokens: 700,
    allowVision: true
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
function buildPrompt(question, options, questionType) {
  let prompt = `You are a quiz assistant. Answer the following question correctly.\n\n`;
  prompt += `Question Type: ${questionType}\n`;
  prompt += `Question: ${question}\n\n`;
  
  if (options && options.length > 0) {
    prompt += `Options:\n`;
    options.forEach((option, index) => {
      prompt += `${String.fromCharCode(65 + index)}. ${option}\n`;
    });
    prompt += '\n';
  }
  
  prompt += `Respond in this exact JSON format:
{
  "answer": "The letter of the correct answer (A, B, C, D, etc.)",
  "answerText": "The full text of the correct answer",
  "explanation": "A clear, concise explanation of why this is the correct answer"
}

Do not include any other text. Only return valid JSON.`;
  
  return prompt;
}

function buildCodingPrompt(payload) {
  const question = String(payload?.question || '').trim();
  const language = normalizeCodingLanguage(payload?.language);
  const starterCode = String(payload?.starterCode || '').trim();

  let prompt = 'You are an expert coding interview assistant.\n';
  prompt += 'Solve the coding problem and return ONLY valid JSON.\n\n';
  prompt += `Preferred Language: ${language}\n\n`;
  prompt += `Problem:\n${question}\n\n`;

  if (starterCode) {
    prompt += `Starter code (if any):\n${starterCode}\n\n`;
  }

  prompt += 'Respond in this exact JSON format:\n';
  prompt += '{\n';
  prompt += '  "approach": "short explanation",\n';
  prompt += '  "timeComplexity": "O(...)" ,\n';
  prompt += '  "spaceComplexity": "O(...)" ,\n';
  prompt += '  "logicBlock": "only the statements to place after //write your Logic here (no full class/function wrapper)",\n';
  prompt += '  "code": "full solution code",\n';
  prompt += '  "testCases": ["input -> output", "..."],\n';
  prompt += '  "notes": "important implementation notes"\n';
  prompt += '}\n\n';
  prompt += 'Rules:\n';
  prompt += '- Use only the requested language.\n';
  prompt += '- Code must compile/run for standard online judge style input-output.\n';
  prompt += '- logicBlock must be insert-safe and should not contain full class/function wrappers when avoidable.\n';
  prompt += '- Keep explanation concise and practical.\n';
  prompt += '- Do not include markdown fences. JSON only.\n';

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

function pickVisionModel(preferredModel) {
  if (preferredModel && /vl|vision|gemini-2\.0-flash-exp|llama-3\.2-11b-vision/i.test(preferredModel)) {
    return preferredModel;
  }

  return 'openrouter/auto';
}

function buildVisionFallbackModels(primaryModel) {
  const models = [
    primaryModel,
    'openrouter/auto',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen2.5-vl-72b-instruct:free',
    'openrouter/free'
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
async function callOpenRouterAPI(apiKey, prompt, model = 'google/gemini-2.5-flash', responseParser = parseAIResponse, requestOptions = {}) {
  const fallbackModels = Array.isArray(requestOptions.fallbackModels) && requestOptions.fallbackModels.length > 0
    ? requestOptions.fallbackModels
    : [
        'google/gemini-2.5-flash',
        'google/gemini-2.5-pro',
        'google/gemini-exp-1206',
        'google/gemma-4-31b-it:free'
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
  const invalidModel = message.includes('not a valid model id') ||
    message.includes('invalid model') ||
    message.includes('unknown model') ||
    message.includes('model not found');

  if (invalidModel) return true;

  if (!model || (!model.includes(':free') && model !== 'openrouter/free' && model !== 'openrouter/auto')) return false;

  return message.includes('rate limit exceeded') ||
    message.includes('free-models-per-min') ||
    message.includes('rate limit') ||
    message.includes('overloaded') ||
    message.includes('provider returned error') ||
    message.includes('temporarily unavailable') ||
    message.includes('quota');
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
  const safeContent = typeof content === 'string' ? content : String(content || '');
  try {
    // Try to extract JSON from the response
    const jsonMatch = safeContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer?.toUpperCase() || '',
        answerText: parsed.answerText || '',
        explanation: parsed.explanation || ''
      };
    }
    throw new Error('No JSON found in response');
  } catch (e) {
    const repaired = repairUnstructuredAnswerToJson(safeContent);
    if (repaired) {
      return repaired;
    }

    // Fallback: try to extract answer from text
    return {
      answer: '',
      answerText: safeContent,
      explanation: 'Could not parse structured response. Raw AI output shown above.'
    };
  }
}

function parseCodingResponse(content) {
  const safeContent = typeof content === 'string' ? content : String(content || '');

  try {
    const jsonMatch = safeContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in coding response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      mode: 'coding',
      approach: String(parsed.approach || '').trim(),
      timeComplexity: String(parsed.timeComplexity || '').trim(),
      spaceComplexity: String(parsed.spaceComplexity || '').trim(),
      logicBlock: normalizeLogicBlockFromModel(parsed.logicBlock, parsed.code),
      code: String(parsed.code || '').trim(),
      testCases: Array.isArray(parsed.testCases)
        ? parsed.testCases.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      notes: String(parsed.notes || '').trim()
    };
  } catch (error) {
    return {
      mode: 'coding',
      approach: 'Could not parse structured coding response.',
      timeComplexity: '',
      spaceComplexity: '',
      logicBlock: '',
      code: safeContent,
      testCases: [],
      notes: 'Raw model output shown in code block.'
    };
  }
}

function normalizeLogicBlockFromModel(logicBlock, code) {
  const normalizedLogic = stripCodeFences(String(logicBlock || '').trim());
  if (normalizedLogic) return normalizedLogic;

  const normalizedCode = stripCodeFences(String(code || '').trim());
  if (!normalizedCode) return '';

  // Avoid inserting full wrappers into template by default.
  if (/\bclass\s+\w+/.test(normalizedCode) || /\bpublic\s+static\s+void\s+main\b/.test(normalizedCode)) {
    return '';
  }

  return normalizedCode;
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
