// popup.js - Settings popup logic

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const providerEl = document.getElementById('aiProvider');
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (testBtn) testBtn.addEventListener('click', testConnection);
  if (providerEl) {
    providerEl.addEventListener('change', () => toggleProviderUI(providerEl.value));
  }
}

function ensureModelOption(modelValue, selectId) {
  const modelSelect = document.getElementById(selectId);
  if (!modelSelect || !modelValue) return;

  const exists = Array.from(modelSelect.options).some((opt) => opt.value === modelValue);
  if (exists) return;

  const option = document.createElement('option');
  option.value = modelValue;
  option.textContent = `${modelValue} (Custom)`;
  modelSelect.appendChild(option);
}

function toggleProviderUI(provider) {
  const openrouterConfig = document.getElementById('openrouter-config');
  const geminiConfig = document.getElementById('gemini-config');
  if (!openrouterConfig || !geminiConfig) return;

  if (provider === 'gemini') {
    openrouterConfig.style.display = 'none';
    geminiConfig.style.display = 'block';
  } else {
    openrouterConfig.style.display = 'block';
    geminiConfig.style.display = 'none';
  }
}

async function loadSettings() {
  try {
    const settings = await requestFromBackground({ action: 'getSettings' });
    
    if (settings) {
      const providerEl = document.getElementById('aiProvider');
      const apiKeyEl = document.getElementById('apiKey');
      const geminiApiKeyEl = document.getElementById('geminiApiKey');
      const modelQuizEl = document.getElementById('modelQuiz');
      const modelCodingEl = document.getElementById('modelCoding');
      const customModelQuizEl = document.getElementById('customModelQuiz');
      const customModelCodingEl = document.getElementById('customModelCoding');
      const geminiModelQuizEl = document.getElementById('geminiModelQuiz');
      const geminiModelCodingEl = document.getElementById('geminiModelCoding');
      const autoDetectEl = document.getElementById('autoDetect');
      const showExplanationsEl = document.getElementById('showExplanations');
      const stealthModeEl = document.getElementById('stealthMode');
      const autoHideDelayEl = document.getElementById('autoHideDelay');

      if (providerEl) providerEl.value = settings.aiProvider || 'openrouter';
      if (apiKeyEl) apiKeyEl.value = settings.apiKey || '';
      if (geminiApiKeyEl) geminiApiKeyEl.value = settings.geminiApiKey || '';

      const modelQuizValue = settings.modelQuiz || settings.model || 'google/gemini-2.0-flash-exp:free';
      const modelCodingValue = settings.modelCoding || settings.model || 'google/gemini-2.0-flash-exp:free';

      if (modelQuizEl) {
        const exists = Array.from(modelQuizEl.options).some(opt => opt.value === modelQuizValue);
        if (exists) {
          modelQuizEl.value = modelQuizValue;
          if (customModelQuizEl) customModelQuizEl.value = '';
        } else {
          ensureModelOption(modelQuizValue, 'modelQuiz');
          modelQuizEl.value = modelQuizValue;
          if (customModelQuizEl) customModelQuizEl.value = modelQuizValue;
        }
      }

      if (modelCodingEl) {
        const exists = Array.from(modelCodingEl.options).some(opt => opt.value === modelCodingValue);
        if (exists) {
          modelCodingEl.value = modelCodingValue;
          if (customModelCodingEl) customModelCodingEl.value = '';
        } else {
          ensureModelOption(modelCodingValue, 'modelCoding');
          modelCodingEl.value = modelCodingValue;
          if (customModelCodingEl) customModelCodingEl.value = modelCodingValue;
        }
      }

      if (geminiModelQuizEl) {
        const exists = Array.from(geminiModelQuizEl.options).some(opt => opt.value === modelQuizValue);
        if (exists) {
          geminiModelQuizEl.value = modelQuizValue;
        } else {
          ensureModelOption(modelQuizValue, 'geminiModelQuiz');
          geminiModelQuizEl.value = modelQuizValue;
        }
      }

      if (geminiModelCodingEl) {
        const exists = Array.from(geminiModelCodingEl.options).some(opt => opt.value === modelCodingValue);
        if (exists) {
          geminiModelCodingEl.value = modelCodingValue;
        } else {
          ensureModelOption(modelCodingValue, 'geminiModelCoding');
          geminiModelCodingEl.value = modelCodingValue;
        }
      }

      if (autoDetectEl) autoDetectEl.checked = settings.autoDetect === true;
      if (showExplanationsEl) showExplanationsEl.checked = settings.showExplanations !== false;
      if (stealthModeEl) stealthModeEl.checked = settings.stealthMode !== false;
      if (autoHideDelayEl) autoHideDelayEl.value = (settings.autoHideDelay || 8000) / 1000;

      toggleProviderUI(settings.aiProvider || 'openrouter');
    }
  } catch (err) {
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const parsed = getPopupSettingsFromInputs();
  if (!parsed.ok) {
    showStatus(parsed.error || 'Invalid settings', 'error');
    return;
  }
  const settings = parsed.settings;

  try {
    await requestFromBackground({ action: 'saveSettings', settings });
    showStatus('Settings saved successfully!', 'success');
  } catch (err) {
    showStatus('Failed to save settings', 'error');
  }
}

async function testConnection() {
  const parsed = getPopupSettingsFromInputs();
  if (!parsed.ok) {
    showStatus(parsed.error || 'Invalid settings', 'error');
    return;
  }

  showStatus('Saving settings and testing connection...', 'info');

  try {
    await requestFromBackground({ action: 'saveSettings', settings: parsed.settings });
    const result = await requestFromBackground({
      action: 'solveQuiz',
      model: parsed.settings.modelQuiz || parsed.settings.model || '',
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

function getPopupSettingsFromInputs() {
  const providerEl = document.getElementById('aiProvider');
  const apiKeyEl = document.getElementById('apiKey');
  const geminiApiKeyEl = document.getElementById('geminiApiKey');
  const modelQuizEl = document.getElementById('modelQuiz');
  const modelCodingEl = document.getElementById('modelCoding');
  const customModelQuizEl = document.getElementById('customModelQuiz');
  const customModelCodingEl = document.getElementById('customModelCoding');
  const geminiModelQuizEl = document.getElementById('geminiModelQuiz');
  const geminiModelCodingEl = document.getElementById('geminiModelCoding');
  const autoDetectEl = document.getElementById('autoDetect');
  const showExplanationsEl = document.getElementById('showExplanations');
  const stealthModeEl = document.getElementById('stealthMode');
  const autoHideDelayEl = document.getElementById('autoHideDelay');

  const provider = providerEl ? providerEl.value : 'openrouter';
  const modelQuiz = provider === 'gemini'
    ? (geminiModelQuizEl?.value || 'gemini-2.0-flash')
    : ((customModelQuizEl?.value.trim()) || (modelQuizEl?.value) || 'google/gemini-2.0-flash-exp:free');
  const modelCoding = provider === 'gemini'
    ? (geminiModelCodingEl?.value || 'gemini-2.0-flash')
    : ((customModelCodingEl?.value.trim()) || (modelCodingEl?.value) || 'google/gemini-2.0-flash-exp:free');

  const settings = {
    aiProvider: provider,
    apiKey: apiKeyEl ? apiKeyEl.value.trim() : '',
    geminiApiKey: geminiApiKeyEl ? geminiApiKeyEl.value.trim() : '',
    model: modelQuiz,
    modelQuiz: modelQuiz,
    modelCoding: modelCoding,
    autoDetect: autoDetectEl ? autoDetectEl.checked : false,
    showExplanations: showExplanationsEl ? showExplanationsEl.checked : true,
    stealthMode: stealthModeEl ? stealthModeEl.checked : true,
    autoHideDelay: autoHideDelayEl ? parseInt(autoHideDelayEl.value) * 1000 : 8000
  };

  if (provider === 'gemini') {
    if (!settings.geminiApiKey) {
      return { ok: false, error: 'Please enter a Gemini API key' };
    }
  } else if (!settings.apiKey) {
    return { ok: false, error: 'Please enter an OpenRouter API key' };
  }

  return { ok: true, settings };
}
