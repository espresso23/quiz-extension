// popup.js - Settings popup logic

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (testBtn) testBtn.addEventListener('click', testConnection);
}

function ensureModelOption(modelValue) {
  const modelSelect = document.getElementById('model');
  if (!modelSelect || !modelValue) return;

  const exists = Array.from(modelSelect.options).some((opt) => opt.value === modelValue);
  if (exists) return;

  const option = document.createElement('option');
  option.value = modelValue;
  option.textContent = `${modelValue} (Custom)`;
  modelSelect.appendChild(option);
}

async function loadSettings() {
  try {
    const settings = await requestFromBackground({ action: 'getSettings' });
    
    if (settings) {
      const apiKeyEl = document.getElementById('apiKey');
      const modelEl = document.getElementById('model');
      const autoDetectEl = document.getElementById('autoDetect');
      const showExplanationsEl = document.getElementById('showExplanations');
      const stealthModeEl = document.getElementById('stealthMode');
      const autoHideDelayEl = document.getElementById('autoHideDelay');

      if (apiKeyEl) apiKeyEl.value = settings.apiKey || '';
      
      ensureModelOption(settings.model);
      if (modelEl) modelEl.value = settings.model || 'google/gemini-2.0-flash-exp:free';
      
      if (autoDetectEl) autoDetectEl.checked = settings.autoDetect !== false;
      if (showExplanationsEl) showExplanationsEl.checked = settings.showExplanations !== false;
      if (stealthModeEl) stealthModeEl.checked = settings.stealthMode !== false;
      if (autoHideDelayEl) autoHideDelayEl.value = (settings.autoHideDelay || 8000) / 1000;
    }
  } catch (err) {
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const apiKeyEl = document.getElementById('apiKey');
  const modelEl = document.getElementById('model');
  const autoDetectEl = document.getElementById('autoDetect');
  const showExplanationsEl = document.getElementById('showExplanations');
  const stealthModeEl = document.getElementById('stealthMode');
  const autoHideDelayEl = document.getElementById('autoHideDelay');

  const settings = {
    aiProvider: 'openrouter',
    apiKey: apiKeyEl ? apiKeyEl.value.trim() : '',
    model: modelEl ? modelEl.value : 'google/gemini-2.0-flash-exp:free',
    autoDetect: autoDetectEl ? autoDetectEl.checked : true,
    showExplanations: showExplanationsEl ? showExplanationsEl.checked : true,
    stealthMode: stealthModeEl ? stealthModeEl.checked : true,
    autoHideDelay: autoHideDelayEl ? parseInt(autoHideDelayEl.value) * 1000 : 8000
  };
  
  if (!settings.apiKey) {
    showStatus('Please enter an OpenRouter API key', 'error');
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
  const apiKeyEl = document.getElementById('apiKey');
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
  
  if (!apiKey) {
    showStatus(`Please enter an OpenRouter API key first`, 'error');
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
    
    if (result && result.error) {
      showStatus(`Error: ${result.error}`, 'error');
    } else if (result) {
      showStatus(`Success! Answer: ${result.answer} - ${result.answerText}`, 'success');
    } else {
      showStatus('No response from background', 'error');
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
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 5000);
  }
}
