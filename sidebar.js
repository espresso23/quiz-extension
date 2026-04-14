// sidebar.js - Sidebar panel logic

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSettings();
});

function setupEventListeners() {
  document.getElementById('manualSolveBtn').addEventListener('click', handleManualInput);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('retryBtn').addEventListener('click', retryLastRequest);
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateSidebar') {
      updateSidebarWithQuestion(request.question);
    }
  });
}

async function loadSettings() {
  try {
    const settings = await requestFromBackground({ action: 'getSettings' });
    if (settings && !settings.apiKey) {
      showStatus('⚠️ API key not configured. Click ⚙️ to set up.');
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function handleManualInput() {
  const question = document.getElementById('questionInput').value.trim();
  const optionsText = document.getElementById('optionsInput').value.trim();
  
  if (!question) {
    showError('Please enter a question');
    return;
  }
  
  const options = optionsText
    ? optionsText.split('\n').map(o => o.trim()).filter(o => o)
    : [];
  
  solveQuestion(question, options);
}

async function solveQuestion(question, options = []) {
  showLoading(true);
  hideError();
  hideResult();
  
  try {
    const result = await requestFromBackground({
      action: 'solveQuiz',
      question: question,
      options: options,
      questionType: options.length > 0 ? 'multiple_choice' : 'short_answer'
    });
    
    if (result.error) {
      showError(result.error);
      return;
    }
    
    displayResult(question, options, result);
    
  } catch (err) {
    showError('Failed to communicate with extension. Make sure the extension is loaded.');
    console.error('AI Quiz Assistant error:', err);
  } finally {
    showLoading(false);
  }
}

function updateSidebarWithQuestion(question) {
  if (!question) return;
  
  document.getElementById('questionInput').value = question.question || '';
  document.getElementById('optionsInput').value = (question.options || []).join('\n');
}

function displayResult(question, options, result) {
  document.getElementById('displayQuestion').textContent = question;
  
  const optionsEl = document.getElementById('displayOptions');
  if (options.length > 0) {
    optionsEl.innerHTML = options.map((opt, i) => 
      `<div class="option-item ${result.answer === String.fromCharCode(65 + i) ? 'correct' : ''}">
        ${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}
      </div>`
    ).join('');
    optionsEl.style.display = 'block';
  } else {
    optionsEl.style.display = 'none';
  }
  
  document.getElementById('displayAnswer').textContent = `${result.answer} - ${result.answerText}`;
  document.getElementById('displayExplanation').textContent = result.explanation;
  
  const settings = JSON.parse(localStorage.getItem('quizAssistantSettings') || '{}');
  if (settings.showExplanations === false || !result.explanation) {
    document.getElementById('explanationSection').style.display = 'none';
  } else {
    document.getElementById('explanationSection').style.display = 'block';
  }
  
  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('statusSection').style.display = 'none';
  document.getElementById('manualInput').style.display = 'none';
}

function showLoading(show) {
  document.getElementById('loadingSection').style.display = show ? 'flex' : 'none';
  
  if (show) {
    document.getElementById('statusSection').style.display = 'none';
    document.getElementById('manualInput').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    hideError();
  }
}

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorSection').style.display = 'block';
  document.getElementById('loadingSection').style.display = 'none';
}

function hideError() {
  document.getElementById('errorSection').style.display = 'none';
}

function hideResult() {
  document.getElementById('resultSection').style.display = 'none';
}

function showStatus(message) {
  const statusEl = document.querySelector('#statusSection .status-text');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function openSettings() {
  // Open the extension popup
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('popup.html'));
  }
}

let lastRequest = null;

function retryLastRequest() {
  if (lastRequest) {
    solveQuestion(lastRequest.question, lastRequest.options);
  } else {
    hideError();
    document.getElementById('statusSection').style.display = 'block';
    document.getElementById('manualInput').style.display = 'block';
  }
}

function requestFromBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
