// background.js - Service Worker for AI API calls and extension event handling (STEALTH MODE)

// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'google/gemma-4-26b-a4b-it:free', // Free Gemini model via OpenRouter
  autoDetect: false, // Disabled by default for stealth
  showExplanations: true,
  stealthMode: true, // Enabled by default
  autoHideDelay: 8000 // Auto-hide after 8 seconds
};

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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ai-solve-selection' && info.selectionText) {
    // Send selected text to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'solveQuiz',
      question: info.selectionText,
      options: [],
      questionType: 'short_answer'
    });
  }

  if (info.menuItemId === 'ai-solve-page') {
    chrome.tabs.sendMessage(tab.id, { action: 'solveQuestion' });
  }

  if (info.menuItemId === 'ai-toggle-ui') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleUI' });
  }

  if (info.menuItemId === 'ai-hide-all') {
    chrome.tabs.sendMessage(tab.id, { action: 'hideAllUI' });
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
chrome.commands.onCommand.addListener((command, tab) => {
  console.log('[AI Translator] Command received:', command);
  if (command === 'solve_current_question') {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'solveQuestion' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[AI Translator] Tab not ready:', chrome.runtime.lastError.message);
        }
      });
    }
  }
});

// Handle side panel opening
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

/**
 * Main function to solve quiz question using AI via OpenRouter
 */
async function handleQuizQuestion(question, options, questionType = 'multiple_choice') {
  const settings = await getSettings();
  
  if (!settings.apiKey) {
    throw new Error('API key not configured. Please set your OpenRouter API key in extension settings.');
  }
  
  const prompt = buildPrompt(question, options, questionType);
  
  return callOpenRouterAPI(settings.apiKey, prompt, settings.model);
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

/**
 * Call OpenRouter API (supports all models including free Gemini)
 */
async function callOpenRouterAPI(apiKey, prompt, model = 'google/gemma-4-26b-a4b-it:free') {
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
      messages: [
        { role: 'system', content: 'You are a helpful quiz assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  return parseAIResponse(content);
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(content) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    // Fallback: try to extract answer from text
    return {
      answer: '',
      answerText: content,
      explanation: 'Could not parse structured response. Raw AI output shown above.'
    };
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
