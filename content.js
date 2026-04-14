// content.js - Injected into quiz pages to detect and extract quiz questions

(function() {
  'use strict';
  
  // State
  let currentQuestion = null;
  let sidebarOpen = false;
  let settings = null;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  async function init() {
    // Load settings
    settings = await requestSettings();
    
    // Create floating action button
    createFloatingButton();
    
    // Create sidebar panel
    createSidebar();
    
    // Auto-detect quiz if enabled
    if (settings.autoDetect) {
      detectQuiz();
    }
    
    // Listen for URL changes (SPA navigation)
    observeURLChanges();
  }
  
  /**
   * Detect if current page contains a quiz
   */
  function detectQuiz() {
    const question = extractQuestion();
    
    if (question) {
      currentQuestion = question;
      highlightCurrentQuestion(question.element);
      showSolveButton(question.element);
    }
  }
  
  /**
   * Extract question from the DOM
   * Supports multiple common quiz formats
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
    
    // Strategy 3: Look for list items that might be options
    const optionLists = document.querySelectorAll('ul[class*="option"], ul[class*="answer"], ol[class*="choice"]');
    if (optionLists.length > 0) {
      const question = parseOptionList(optionLists[0]);
      if (question) return question;
    }
    
    return null;
  }
  
  /**
   * Parse a generic quiz container
   */
  function parseGenericQuizContainer(container) {
    // Try to find question text
    const questionText = container.querySelector(
      'h1, h2, h3, .question-title, .question-text, p:first-child, label'
    );
    
    if (!questionText) return null;
    
    const text = questionText.textContent.trim();
    if (!text || text.length < 5) return null;
    
    // Try to find options
    const options = [];
    const optionElements = container.querySelectorAll(
      'input[type="radio"] + label, input[type="checkbox"] + label, .option, .choice, .answer-option, li'
    );
    
    optionElements.forEach(el => {
      const optionText = el.textContent.trim();
      if (optionText && optionText.length > 1) {
        options.push({ text: optionText, element: el });
      }
    });
    
    return {
      question: text,
      options: options.map(o => o.text),
      optionElements: options.map(o => o.element),
      questionType: options.length > 0 ? 'multiple_choice' : 'short_answer',
      element: container,
      container: container
    };
  }
  
  /**
   * Parse radio button question
   */
  function parseRadioQuestion(radioInputs) {
    // Find the first radio group
    const firstGroup = radioInputs[0].name;
    if (!firstGroup) return null;
    
    const groupInputs = document.querySelectorAll(`input[name="${firstGroup}"]`);
    if (groupInputs.length < 2) return null;
    
    const options = [];
    groupInputs.forEach(input => {
      const label = input.closest('label') || 
                    document.querySelector(`label[for="${input.id}"]`) ||
                    input.nextElementSibling;
      
      if (label) {
        options.push(label.textContent.trim());
      }
    });
    
    if (options.length === 0) return null;
    
    // Find question text (usually before the radio group)
    let questionText = '';
    const container = groupInputs[0].closest('.question, .quiz-item, li, div');
    if (container) {
      const heading = container.querySelector('h3, h4, p, .question-text');
      if (heading) questionText = heading.textContent.trim();
    }
    
    return {
      question: questionText || 'Select the correct answer:',
      options: options,
      questionType: 'multiple_choice',
      element: groupInputs[0].closest('.question, .quiz-item, li, div') || groupInputs[0].parentElement,
      container: groupInputs[0].closest('form, .quiz, .question-container') || document.body
    };
  }
  
  /**
   * Parse option list
   */
  function parseOptionList(list) {
    const items = list.querySelectorAll('li');
    if (items.length < 2) return null;
    
    const options = Array.from(items).map(item => item.textContent.trim());
    
    // Look for question text before the list
    const previousElement = list.previousElementSibling;
    const questionText = previousElement ? previousElement.textContent.trim() : '';
    
    return {
      question: questionText || 'Select the correct answer:',
      options: options,
      questionType: 'multiple_choice',
      element: list,
      container: list.parentElement
    };
  }
  
  /**
   * Create floating action button
   */
  function createFloatingButton() {
    // Remove existing button if any
    const existing = document.getElementById('ai-quiz-fab');
    if (existing) existing.remove();
    
    const button = document.createElement('button');
    button.id = 'ai-quiz-fab';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>
      </svg>
      <span>AI Solve</span>
    `;
    button.className = 'ai-quiz-fab';
    button.addEventListener('click', toggleSidebar);
    
    document.body.appendChild(button);
  }
  
  /**
   * Show solve button next to detected question
   */
  function showSolveButton(element) {
    if (!element) return;
    
    // Remove existing solve buttons
    document.querySelectorAll('.ai-solve-btn').forEach(btn => btn.remove());
    
    const button = document.createElement('button');
    button.className = 'ai-solve-btn';
    button.textContent = 'Translator Now';
    button.addEventListener('click', () => solveCurrentQuestion());
    
    // Position near the question
    element.style.position = 'relative';
    element.appendChild(button);
  }
  
  /**
   * Highlight the detected question
   */
  function highlightCurrentQuestion(element) {
    if (!element) return;
    
    element.classList.add('ai-quiz-highlight');
  }
  
  /**
   * Create sidebar panel
   */
  function createSidebar() {
    // Remove existing sidebar if any
    const existing = document.getElementById('ai-quiz-sidebar');
    if (existing) existing.remove();
    
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-quiz-sidebar';
    sidebar.className = 'ai-quiz-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h3>Translator</h3>
        <button class="sidebar-close" onclick="document.getElementById('ai-quiz-sidebar').classList.remove('open')">&times;</button>
      </div>
      <div class="sidebar-content">
        <div class="sidebar-question" id="sidebar-question">
          <p>No question detected. Click the Translator button on a quiz question.</p>
        </div>
        <div class="sidebar-options" id="sidebar-options"></div>
        <button class="sidebar-solve-btn" id="sidebar-solve-btn" onclick="window.aiQuizSolve()">
          Get Translator Answer
        </button>
        <div class="sidebar-result" id="sidebar-result" style="display:none;">
          <div class="result-answer" id="result-answer"></div>
          <div class="result-explanation" id="result-explanation"></div>
        </div>
        <div class="sidebar-loading" id="sidebar-loading" style="display:none;">
          <div class="spinner"></div>
          <p>Asking AI...</p>
        </div>
        <div class="sidebar-error" id="sidebar-error" style="display:none;"></div>
      </div>
    `;
    
    document.body.appendChild(sidebar);
  }
  
  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    const sidebar = document.getElementById('ai-quiz-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
      sidebarOpen = sidebar.classList.contains('open');
      
      if (sidebarOpen && currentQuestion) {
        updateSidebarWithQuestion(currentQuestion);
      }
    }
  }
  
  /**
   * Update sidebar with current question
   */
  function updateSidebarWithQuestion(question) {
    const questionEl = document.getElementById('sidebar-question');
    const optionsEl = document.getElementById('sidebar-options');
    
    if (questionEl && question) {
      questionEl.innerHTML = `<h4>Question:</h4><p>${escapeHtml(question.question)}</p>`;
    }
    
    if (optionsEl && question && question.options) {
      optionsEl.innerHTML = '<h4>Options:</h4>' + 
        question.options.map((opt, i) => 
          `<div class="option-item" data-index="${i}">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</div>`
        ).join('');
    }
    
    // Reset result
    const resultEl = document.getElementById('sidebar-result');
    if (resultEl) resultEl.style.display = 'none';
  }
  
  /**
   * Solve the current question
   */
  async function solveCurrentQuestion() {
    if (!currentQuestion) {
      showError('No question detected. Please navigate to a quiz page.');
      return;
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
      
    } catch (err) {
      showError('Failed to communicate with extension. Make sure the extension is loaded.');
      console.error('AI Quiz Assistant error:', err);
    } finally {
      showLoading(false);
    }
  }
  
  // Make function available globally for inline onclick
  window.aiQuizSolve = solveCurrentQuestion;
  
  /**
   * Display AI result
   */
  function displayResult(result) {
    const resultEl = document.getElementById('sidebar-result');
    const answerEl = document.getElementById('result-answer');
    const explanationEl = document.getElementById('result-explanation');
    
    if (!resultEl || !answerEl || !explanationEl) return;
    
    answerEl.innerHTML = `<strong>Answer: ${result.answer} - ${escapeHtml(result.answerText)}</strong>`;
    
    if (result.explanation && settings.showExplanations) {
      explanationEl.innerHTML = `<h5>Explanation:</h5><p>${escapeHtml(result.explanation)}</p>`;
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
    if (!currentQuestion || !answerLetter) return;
    
    const index = answerLetter.charCodeAt(0) - 65;
    
    if (currentQuestion.optionElements && currentQuestion.optionElements[index]) {
      const el = currentQuestion.optionElements[index];
      el.classList.add('ai-quiz-correct-highlight');
      
      // Optionally auto-select the answer
      const radioOrCheckbox = el.querySelector('input[type="radio"], input[type="checkbox"]');
      if (radioOrCheckbox) {
        radioOrCheckbox.checked = true;
        radioOrCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  
  /**
   * Show/hide loading state
   */
  function showLoading(show) {
    const loadingEl = document.getElementById('sidebar-loading');
    const solveBtn = document.getElementById('sidebar-solve-btn');
    
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (solveBtn) solveBtn.disabled = show;
  }
  
  /**
   * Show error message
   */
  function showError(message) {
    const errorEl = document.getElementById('sidebar-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  /**
   * Hide error message
   */
  function hideError() {
    const errorEl = document.getElementById('sidebar-error');
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
        // Re-detect quiz on navigation
        setTimeout(() => {
          currentQuestion = null;
          detectQuiz();
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
