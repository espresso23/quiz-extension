// content.js - Injected into quiz pages (STEALTH MODE)
// Stealth utility inlined here

const Stealth = (function() {
  'use strict';

  function randomClassName() {
    const prefixes = ['x', 'k', 'm', 'p', 'v', 'r', 't'];
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let result = prefix;
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function randomClassNames(count) {
    const classes = new Set();
    while (classes.size < count) {
      classes.add(randomClassName());
    }
    return Array.from(classes);
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.classes) element.className = options.classes.join(' ');
    if (options.styles) Object.assign(element.style, options.styles);
    return element;
  }

  function createShadowContainer(parent) {
    const container = document.createElement('div');
    container.setAttribute('data-react-component', 'QuizContainer');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'none';
    container.style.visibility = 'hidden';
    parent.appendChild(container);
    const shadow = container.attachShadow({ mode: 'closed' });
    return { container, shadow };
  }

  function isFocusModeActive() {
    return !!document.fullscreenElement;
  }

  function onFocusModeChange(callback) {
    if (!document.body) return null;
    const observer = new MutationObserver(() => callback(isFocusModeActive()));
    observer.observe(document.body, {
      attributes: true, childList: true, subtree: true,
      attributeFilter: ['class', 'data-focus-mode', 'data-exam-mode']
    });
    return observer;
  }

  function stealthHide(element) {
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.opacity = '0';
  }

  function stealthShow(element) {
    element.style.visibility = 'visible';
    element.style.position = 'fixed';
    element.style.pointerEvents = 'auto';
    element.style.opacity = '1';
  }

  function cleanTraces() {
    document.querySelectorAll('[data-ai-quiz-injected]').forEach(el => el.remove());
    ['aiQuizSolver', 'aiQuizAssistant', 'quizSolver', 'quizHelper'].forEach(key => {
      if (window[key]) delete window[key];
    });
  }

  return { randomClassName, randomClassNames, createElement, createShadowContainer, isFocusModeActive, onFocusModeChange, stealthHide, stealthShow, cleanTraces };
})();

// Main content script
(function() {
  'use strict';

  console.log('[AI Translator] Content script loaded on:', window.location.href);
  
  // State
  let currentQuestion = null;
  let sidebarVisible = false;
  let settings = null;
  let shadowContainer = null;
  let shadowRoot = null;
  let sidebarElement = null;
  let fabButton = null;
  let focusModeObserver = null;
  let autoHideTimer = null;
  
  // Stealth: Run at document_start, wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  async function init() {
    // Load settings
    settings = await requestSettings();
    console.log('[AI Translator] Settings loaded:', settings);
    
    // Apply stealth defaults
    if (!settings.stealthMode) {
      settings.stealthMode = true; // Force stealth mode by default
    }
    
    // Create hidden UI elements (not visible by default)
    createHiddenUI();
    console.log('[AI Translator] Hidden UI created');
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Setup focus mode detection
    setupFocusModeDetection();
    
    // Auto-detect quiz only if enabled AND not in stealth mode
    if (settings.autoDetect && !settings.stealthMode) {
      setTimeout(() => detectQuiz(), 1000);
    }
    
    // Listen for URL changes (SPA navigation)
    observeURLChanges();
    
    console.log('[AI Translator] Init complete. Use Ctrl+Shift+Q to toggle UI');
  }
  
  /**
   * Create UI elements in hidden state
   */
  function createHiddenUI() {
    // Create shadow DOM container for isolation
    const { container, shadow } = Stealth.createShadowContainer(document.body);
    shadowContainer = container;
    shadowRoot = shadow;
    
    // Create floating action button (hidden by default)
    createHiddenFAB(shadowRoot);
    
    // Create sidebar panel (hidden by default)
    createHiddenSidebar(shadowRoot);
    
    // Mark as injected (for internal tracking only)
    container.setAttribute('data-ai-quiz-injected', 'true');
  }
  
  /**
   * Create floating action button (hidden)
   */
  function createHiddenFAB(shadow) {
    fabButton = Stealth.createElement('button', {
      classes: Stealth.randomClassNames(2),
      styles: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: '999999',
        visibility: 'hidden', // Hidden by default
        opacity: '0',
        transition: 'all 0.3s ease'
      }
    });
    
    fabButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>
      </svg>
    `;
    
    fabButton.addEventListener('click', toggleSidebar);
    shadow.appendChild(fabButton);
  }
  
  /**
   * Create sidebar panel (hidden)
   */
  function createHiddenSidebar(shadow) {
    sidebarElement = Stealth.createElement('div', {
      classes: Stealth.randomClassNames(2),
      styles: {
        position: 'fixed',
        top: '0',
        right: '0',
        width: '400px',
        height: '100vh',
        zIndex: '999998',
        background: 'white',
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.15)',
        visibility: 'hidden', // Hidden by default
        opacity: '0',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }
    });
    
    sidebarElement.innerHTML = `
      <div class="${Stealth.randomClassName()}" style="background: linear-gradient(135deg, #4a90d9, #6c5ce7); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 16px; margin: 0;">AI Translator</h3>
        <button class="${Stealth.randomClassName()}" style="background: rgba(255,255,255,0.2); border: none; border-radius: 4px; width: 32px; height: 32px; font-size: 20px; color: white; cursor: pointer;">&times;</button>
      </div>
      <div class="${Stealth.randomClassName()}" style="flex: 1; padding: 16px; overflow-y: auto;">
        <div class="${Stealth.randomClassName()}" id="sidebar-question" style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <p style="font-size: 13px; color: #666;">No text detected. Press Ctrl+Shift+S to translate.</p>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-options" style="margin-bottom: 12px;"></div>
        <button class="${Stealth.randomClassName()}" id="sidebar-solve-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #4a90d9, #6c5ce7); color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; margin-bottom: 16px;">
          Get Translation
        </button>
        <div class="${Stealth.randomClassName()}" id="sidebar-result" style="display: none; margin-bottom: 16px;">
          <div class="${Stealth.randomClassName()}" id="result-answer" style="background: #e7f3ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 16px; font-weight: 600; color: #4a90d9;"></div>
          <div class="${Stealth.randomClassName()}" id="result-explanation" style="background: #fff3cd; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #856404;"></div>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-loading" style="display: none; flex-direction: column; align-items: center; padding: 40px 16px;">
          <div style="width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top-color: #4a90d9; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
          <p style="font-size: 13px; color: #666;">Processing...</p>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-error" style="display: none; background: #f8d7da; padding: 16px; border-radius: 8px; color: #721c24; font-size: 13px; text-align: center;"></div>
      </div>
    `;
    
    // Add close button handler
    const closeBtn = sidebarElement.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSidebar);
    }
    
    // Add solve button handler
    const solveBtn = sidebarElement.querySelector('#sidebar-solve-btn');
    if (solveBtn) {
      solveBtn.addEventListener('click', solveCurrentQuestion);
    }
    
    shadow.appendChild(sidebarElement);
  }
  
  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+Q or Cmd+Shift+Q - Toggle sidebar
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        console.log('[AI Translator] Toggle shortcut pressed');
        toggleSidebar();
      }
      
      // Ctrl+Shift+L or Cmd+Shift+L - Solve current question (stealth)
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        console.log('[AI Translator] Solve shortcut pressed');
        solveCurrentQuestion();
      }
      
      // Esc - Hide all UI instantly
      if (e.key === 'Escape') {
        e.preventDefault();
        hideAllUI();
      }
    });
    
    // Listen for commands from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleUI') {
        toggleSidebar();
        sendResponse({ success: true });
      }
      
      if (request.action === 'solveQuestion') {
        solveCurrentQuestion();
        sendResponse({ success: true });
      }
      
      if (request.action === 'hideAllUI') {
        hideAllUI();
        sendResponse({ success: true });
      }
    });
  }
  
  /**
   * Setup focus mode detection
   */
  function setupFocusModeDetection() {
    focusModeObserver = Stealth.onFocusModeChange((isActive) => {
      if (isActive && settings.stealthMode) {
        // Auto-hide when focus mode is active
        hideAllUI();
      }
    });
  }
  
  /**
   * Detect if current page contains a quiz
   */
  function detectQuiz() {
    const question = extractQuestion();
    
    if (question) {
      currentQuestion = question;
      // Don't highlight in stealth mode
      if (!settings.stealthMode) {
        highlightCurrentQuestion(question.element);
      }
    }
  }
  
  /**
   * Extract question from the DOM
   */
  function extractQuestion() {
    // Strategy 1: Look for common quiz container patterns
    const quizSelectors = [
      '.quiz-question',
      '.question-container',
      '.question-text',
      '[class*="question"]',
      '[class*="quiz"]',
      '[class*="assessment"]',
      'form[class*="quiz"]',
      'div[class*="test"]'
    ];
    
    for (const selector of quizSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const question = parseGenericQuizContainer(container);
        if (question) return question;
      }
    }
    
    // Strategy 2: Look for radio/checkbox groups with labels
    const radioGroups = document.querySelectorAll('input[type="radio"]');
    if (radioGroups.length > 0) {
      const question = parseRadioQuestion(radioGroups);
      if (question) return question;
    }
    
    return null;
  }
  
  /**
   * Parse a generic quiz container
   */
  function parseGenericQuizContainer(container) {
    const questionText = container.querySelector(
      'h1, h2, h3, .question-title, .question-text, p:first-child, label'
    );
    
    if (!questionText) return null;
    
    const text = questionText.textContent.trim();
    if (!text || text.length < 5) return null;
    
    const options = [];
    const optionElements = [];
    
    container.querySelectorAll('input[type="radio"] + label, input[type="checkbox"] + label, .option, .choice, .answer-option, li').forEach(el => {
      const optionText = el.textContent.trim();
      if (optionText && optionText.length > 1) {
        options.push(optionText);
        optionElements.push(el);
      }
    });
    
    return {
      question: text,
      options,
      optionElements,
      questionType: options.length > 0 ? 'multiple_choice' : 'short_answer',
      element: container
    };
  }
  
  /**
   * Parse radio button question
   */
  function parseRadioQuestion(radioInputs) {
    const firstGroup = radioInputs[0].name;
    if (!firstGroup) return null;
    
    const groupInputs = document.querySelectorAll(`input[name="${firstGroup}"]`);
    if (groupInputs.length < 2) return null;
    
    const options = [];
    const optionElements = [];
    
    groupInputs.forEach(input => {
      const label = input.closest('label') || 
                    document.querySelector(`label[for="${input.id}"]`) ||
                    input.nextElementSibling;
      
      if (label) {
        options.push(label.textContent.trim());
        optionElements.push(label);
      }
    });
    
    if (options.length === 0) return null;
    
    let questionText = '';
    const container = groupInputs[0].closest('.question, .quiz-item, li, div');
    if (container) {
      const heading = container.querySelector('h3, h4, p, .question-text');
      if (heading) questionText = heading.textContent.trim();
    }
    
    return {
      question: questionText || 'Select the correct answer:',
      options,
      optionElements,
      questionType: 'multiple_choice',
      element: groupInputs[0].closest('.question, .quiz-item, li, div') || groupInputs[0].parentElement
    };
  }
  
  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    if (!sidebarElement) {
      console.log('[AI Translator] toggleSidebar called but sidebarElement is null');
      return;
    }
    
    sidebarVisible = !sidebarVisible;
    console.log('[AI Translator] toggleSidebar, visible:', sidebarVisible);
    
    if (sidebarVisible) {
      Stealth.stealthShow(sidebarElement);
      console.log('[AI Translator] Sidebar shown');
      
      // Update with current question if available
      if (currentQuestion) {
        updateSidebarWithQuestion(currentQuestion);
      }
      
      // Auto-hide after 10 seconds in stealth mode
      if (settings.stealthMode) {
        clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          hideSidebar();
        }, 10000);
      }
    } else {
      hideSidebar();
    }
  }
  
  /**
   * Hide sidebar
   */
  function hideSidebar() {
    if (!sidebarElement) return;
    
    sidebarVisible = false;
    Stealth.stealthHide(sidebarElement);
    clearTimeout(autoHideTimer);
  }
  
  /**
   * Hide all UI instantly
   */
  function hideAllUI() {
    hideSidebar();
    
    if (fabButton) {
      Stealth.stealthHide(fabButton);
    }
    
    // Clean any traces
    Stealth.cleanTraces();
  }
  
  /**
   * Update sidebar with current question
   */
  function updateSidebarWithQuestion(question) {
    const questionEl = sidebarElement?.querySelector('#sidebar-question');
    const optionsEl = sidebarElement?.querySelector('#sidebar-options');
    
    if (questionEl && question) {
      questionEl.innerHTML = `<h4 style="font-size: 12px; color: #666; margin-bottom: 6px;">Question:</h4><p style="font-size: 14px; font-weight: 500;">${escapeHtml(question.question)}</p>`;
    }
    
    if (optionsEl && question && question.options) {
      optionsEl.innerHTML = '<h4 style="font-size: 12px; color: #666; margin-bottom: 8px;">Options:</h4>' + 
        question.options.map((opt, i) => 
          `<div style="padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; font-size: 13px;">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</div>`
        ).join('');
    }
    
    // Reset result
    const resultEl = sidebarElement?.querySelector('#sidebar-result');
    if (resultEl) resultEl.style.display = 'none';
  }
  
  /**
   * Solve the current question
   */
  async function solveCurrentQuestion() {
    if (!currentQuestion) {
      // Try to detect question first
      currentQuestion = extractQuestion();
      
      if (!currentQuestion) {
        showError('No question detected. Navigate to a page with quiz or form content.');
        return;
      }
    }
    
    // Show sidebar if hidden
    if (!sidebarVisible) {
      Stealth.stealthShow(sidebarElement);
      sidebarVisible = true;
      updateSidebarWithQuestion(currentQuestion);
    }
    
    showLoading(true);
    hideError();
    
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'solveQuiz',
        question: currentQuestion.question,
        options: currentQuestion.options,
        questionType: currentQuestion.questionType
      });
      
      if (result.error) {
        showError(result.error);
        return;
      }
      
      displayResult(result);
      highlightCorrectOption(result.answer);
      
      // Auto-hide after showing answer (stealth mode)
      if (settings.stealthMode) {
        clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          hideAllUI();
        }, settings.autoHideDelay || 8000);
      }
      
    } catch (err) {
      showError('Failed to communicate with extension. Make sure the extension is loaded.');
    } finally {
      showLoading(false);
    }
  }
  
  /**
   * Display AI result
   */
  function displayResult(result) {
    const resultEl = sidebarElement?.querySelector('#sidebar-result');
    const answerEl = sidebarElement?.querySelector('#result-answer');
    const explanationEl = sidebarElement?.querySelector('#result-explanation');
    
    if (!resultEl || !answerEl || !explanationEl) return;
    
    answerEl.innerHTML = `<strong>Answer: ${result.answer} - ${escapeHtml(result.answerText)}</strong>`;
    
    if (result.explanation && settings.showExplanations) {
      explanationEl.innerHTML = `<h5 style="font-size: 13px; margin-bottom: 8px; color: #856404;">Explanation:</h5><p>${escapeHtml(result.explanation)}</p>`;
      explanationEl.style.display = 'block';
    } else {
      explanationEl.style.display = 'none';
    }
    
    resultEl.style.display = 'block';
  }
  
  /**
   * Highlight the correct option on the page
   */
  function highlightCorrectOption(answerLetter) {
    if (!currentQuestion || !answerLetter || settings.stealthMode) return;
    
    const index = answerLetter.charCodeAt(0) - 65;
    
    if (currentQuestion.optionElements && currentQuestion.optionElements[index]) {
      const el = currentQuestion.optionElements[index];
      el.style.background = '#d4edda';
      el.style.borderColor = '#28a745';
      el.style.outline = '2px solid #28a745';
      
      const radioOrCheckbox = el.querySelector('input[type="radio"], input[type="checkbox"]');
      if (radioOrCheckbox) {
        radioOrCheckbox.checked = true;
        radioOrCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  
  /**
   * Highlight the detected question
   */
  function highlightCurrentQuestion(element) {
    if (!element || settings.stealthMode) return;
    
    element.style.outline = '2px solid #4a90d9';
    element.style.outlineOffset = '4px';
    element.style.background = 'rgba(74, 144, 217, 0.05)';
  }
  
  /**
   * Show/hide loading state
   */
  function showLoading(show) {
    const loadingEl = sidebarElement?.querySelector('#sidebar-loading');
    const solveBtn = sidebarElement?.querySelector('#sidebar-solve-btn');
    
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (solveBtn) solveBtn.disabled = show;
  }
  
  /**
   * Show error message
   */
  function showError(message) {
    const errorEl = sidebarElement?.querySelector('#sidebar-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  /**
   * Hide error message
   */
  function hideError() {
    const errorEl = sidebarElement?.querySelector('#sidebar-error');
    if (errorEl) errorEl.style.display = 'none';
  }
  
  /**
   * Request settings from background script
   */
  function requestSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        resolve(response || {});
      });
    });
  }
  
  /**
   * Observe URL changes for SPA navigation
   */
  function observeURLChanges() {
    let lastURL = location.href;
    
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastURL) {
        lastURL = url;
        setTimeout(() => {
          currentQuestion = null;
          if (settings.autoDetect && !settings.stealthMode) {
            detectQuiz();
          }
        }, 500);
      }
    }).observe(document, { subtree: true, childList: true });
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
})();
