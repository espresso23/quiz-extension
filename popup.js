// popup.js - Settings popup logic

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testConnection);
  document.getElementById('aiProvider').addEventListener('change', toggleProviderUI);
}

function toggleProviderUI() {
  const provider = document.getElementById('aiProvider').value;
  console.log('[AI Translator] Switching UI to provider:', provider);
  
  const openrouterConfig = document.getElementById('openrouter-config');
  const geminiConfig = document.getElementById('gemini-config');
  
  if (provider === 'gemini') {
    openrouterConfig.style.display = 'none';
    geminiConfig.style.display = 'block';
  } else {
    openrouterConfig.style.display = 'block';
    geminiConfig.style.display = 'none';
  }
}

function ensureModelOption(modelValue) {
  const modelSelect = document.getElementById('model');
  const geminiSelect = document.getElementById('gemini-model');
  if (!modelValue) return;

  const existsInModel = modelSelect && Array.from(modelSelect.options).some((opt) => opt.value === modelValue);
  const existsInGemini = geminiSelect && Array.from(geminiSelect.options).some((opt) => opt.value === modelValue);
  
  if (existsInModel || existsInGemini) return;

  // Add to appropriate select or both if unsure
  const option = document.createElement('option');
  option.value = modelValue;
  option.textContent = `${modelValue} (Custom)`;
  
  if (modelValue.startsWith('gemini-')) {
    geminiSelect.appendChild(option);
  } else {
    modelSelect.appendChild(option);
  }
}

async function loadSettings() {
  try {
    const settings = await requestFromBackground({ action: 'getSettings' });
    
    if (settings) {
      const provider = settings.aiProvider || 'openrouter';
      document.getElementById('aiProvider').value = provider;
      document.getElementById('apiKey').value = settings.apiKey || '';
      document.getElementById('geminiApiKey').value = settings.geminiApiKey || '';
      
      ensureModelOption(settings.model);
      
      if (provider === 'gemini') {
        document.getElementById('gemini-model').value = settings.model || 'gemini-1.5-flash';
      } else {
        document.getElementById('model').value = settings.model || 'google/gemma-4-26b-a4b-it:free';
      }
      
      document.getElementById('autoDetect').checked = settings.autoDetect !== false;
      document.getElementById('showExplanations').checked = settings.showExplanations !== false;
      document.getElementById('stealthMode').checked = settings.stealthMode !== false;
      document.getElementById('autoHideDelay').value = (settings.autoHideDelay || 8000) / 1000;
      
      toggleProviderUI();
    }
  } catch (err) {
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const provider = document.getElementById('aiProvider').value;
  const settings = {
    aiProvider: provider,
    apiKey: document.getElementById('apiKey').value.trim(),
    geminiApiKey: document.getElementById('geminiApiKey').value.trim(),
    model: provider === 'gemini' ? document.getElementById('gemini-model').value : document.getElementById('model').value,
    autoDetect: document.getElementById('autoDetect').checked,
    showExplanations: document.getElementById('showExplanations').checked,
    stealthMode: document.getElementById('stealthMode').checked,
    autoHideDelay: parseInt(document.getElementById('autoHideDelay').value) * 1000
  };
  
  if (provider === 'openrouter' && !settings.apiKey) {
    showStatus('Please enter an OpenRouter API key', 'error');
    return;
  }

  if (provider === 'gemini' && !settings.geminiApiKey) {
    showStatus('Please enter a Gemini API key', 'error');
    return;
  }
  
  try {
    await requestFromBackground({ action: 'saveSettings', settings });
    showStatus('Settings saved successfully!', 'success');
  } catch (err) {
    showStatus('Failed to save settings', 'error');
  }
}

async function testConnection() {
  const provider = document.getElementById('aiProvider').value;
  const apiKey = provider === 'gemini' 
    ? document.getElementById('geminiApiKey').value.trim()
    : document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus(`Please enter a ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} API key first`, 'error');
    return;
  }
  
  showStatus('Testing connection...', 'info');
  
  try {
    const result = await requestFromBackground({
      action: 'solveQuiz',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      questionType: 'multiple_choice'
    });
    
    if (result.error) {
      showStatus(`Error: ${result.error}`, 'error');
    } else {
      showStatus(`Success! Answer: ${result.answer} - ${result.answerText}`, 'success');
    }
  } catch (err) {
    showStatus('Connection test failed', 'error');
  }
}

function requestFromBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 5000);
  }
}
