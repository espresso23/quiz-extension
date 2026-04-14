// stealth.js - Utility for stealth mode operations

/**
 * Stealth utility for hiding extension from detection
 */
const Stealth = (function() {
  'use strict';
  
  // Generate random class name that blends in
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
  
  // Generate multiple random class names
  function randomClassNames(count) {
    const classes = new Set();
    while (classes.size < count) {
      classes.add(randomClassName());
    }
    return Array.from(classes);
  }
  
  // Create element with stealth properties
  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    // Use random class names if provided
    if (options.classes) {
      element.className = options.classes.join(' ');
    }
    
    // Set inline styles (harder to detect than CSS classes)
    if (options.styles) {
      Object.assign(element.style, options.styles);
    }
    
    return element;
  }
  
  // Create shadow DOM container
  function createShadowContainer(parent) {
    const container = document.createElement('div');
    // Use common-looking attribute to blend in
    container.setAttribute('data-react-component', 'QuizContainer');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'none';
    container.style.visibility = 'hidden';
    
    parent.appendChild(container);
    
    // Attach shadow DOM (isolated from page)
    const shadow = container.attachShadow({ mode: 'closed' });
    
    return { container, shadow };
  }
  
  // Check if focus mode is active (common patterns)
  function isFocusModeActive() {
    const focusIndicators = [
      '.focus-mode',
      '.exam-mode',
      '.proctor-mode',
      '[data-focus-mode]',
      '[data-exam-mode]',
      '.fullscreen-mode'
    ];
    
    for (const selector of focusIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Check if document is in fullscreen
    return !!document.fullscreenElement;
  }
  
  // Listen for focus mode changes
  function onFocusModeChange(callback) {
    const observer = new MutationObserver((mutations) => {
      const focusModeActive = isFocusModeActive();
      callback(focusModeActive);
    });
    
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-focus-mode', 'data-exam-mode']
    });
    
    return observer;
  }
  
  // Hide element in stealth way
  function stealthHide(element) {
    // Use visibility hidden instead of display none (less detectable)
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.opacity = '0';
  }
  
  // Show element in stealth way
  function stealthShow(element) {
    element.style.visibility = 'visible';
    element.style.position = 'fixed';
    element.style.pointerEvents = 'auto';
    element.style.opacity = '1';
  }
  
  // Remove all traces of extension from page
  function cleanTraces() {
    // Remove any injected elements
    document.querySelectorAll('[data-ai-quiz-injected]').forEach(el => el.remove());
    
    // Remove any global objects (if accidentally created)
    const knownGlobals = [
      'aiQuizSolver',
      'aiQuizAssistant',
      'quizSolver',
      'quizHelper'
    ];
    
    knownGlobals.forEach(key => {
      if (window[key]) {
        delete window[key];
      }
    });
  }
  
  // Anti-detection: spoof element properties
  function spoofElement(element) {
    // Make element appear as native page element
    Object.defineProperty(element, 'id', {
      value: '',
      writable: false,
      configurable: false
    });
  }
  
  // Public API
  return {
    randomClassName,
    randomClassNames,
    createElement,
    createShadowContainer,
    isFocusModeActive,
    onFocusModeChange,
    stealthHide,
    stealthShow,
    cleanTraces,
    spoofElement
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stealth;
}
