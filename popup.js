// popup.js - Settings popup logic

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testConnection);
}

async function loadSettings() {
  try {
    const settings = await requestFromBackground({ action: 'getSettings' });
    
    if (settings) {
      document.getElementById('apiKey').value = settings.apiKey || '';
      document.getElementById('model').value = settings.model || 'google/gemma-4-26b-a4b-it:free';
      document.getElementById('autoDetect').checked = settings.autoDetect !== false;
      document.getElementById('showExplanations').checked = settings.showExplanations !== false;
    }
  } catch (err) {
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const settings = {
    apiKey: document.getElementById('apiKey').value.trim(),
    model: document.getElementById('model').value,
    autoDetect: document.getElementById('autoDetect').checked,
    showExplanations: document.getElementById('showExplanations').checked
  };
  
  if (!settings.apiKey) {
    showStatus('Please enter an API key', 'error');
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
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
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
