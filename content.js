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
    if (options.styles && element.style) Object.assign(element.style, options.styles);
    return element;
  }

  function createShadowContainer(parent) {
    if (!parent) return { container: null, shadow: null };
    const container = document.createElement('div');
    container.setAttribute('data-react-component', 'QuizContainer');
    
    if (container.style) {
      // Keep host mounted and visible so children in shadow DOM can render.
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.overflow = 'visible';
      container.style.zIndex = '2147483646';
      container.style.pointerEvents = 'none';
      container.style.visibility = 'visible';
      container.style.background = 'transparent';
    }
    
    try {
      parent.appendChild(container);
      const shadow = container.attachShadow({ mode: 'closed' });
      return { container, shadow };
    } catch (e) {
      console.warn('[AI Translator] Failed to create shadow container:', e);
      return { container: null, shadow: null };
    }
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
    if (!element || !element.style) return;
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.opacity = '0';
  }

  function stealthShow(element) {
    if (!element || !element.style) return;
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
  let sidebarPinned = false;
  let sidebarGhostTimer = null;
  let sidebarHideTimer = null;
  let sidebarPointerInside = false;
  let sidebarFocusInside = false;
  let settings = null;
  let lastModelSignature = '';
  let shadowContainer = null;
  let shadowRoot = null;
  let sidebarElement = null;
  let focusModeObserver = null;
  let autoHideTimer = null;
  let autoDetectObserver = null;
  let autoDetectTimer = null;
  let autoSolveCooldownUntil = 0;
  let aiRecoveryCooldownUntil = 0;
  let quizProgressObserver = null;
  let quizProgressTimer = null;
  let lastObservedQuestionFingerprint = '';
  let sessionTotalQuestions = 0;
  let sessionCurrentQuestionNumber = 0;
  let extensionContextLost = false;
  let extensionContextNotified = false;
  let harvardPrefetchObserver = null;
  let harvardPrefetchTimer = null;
  let harvardPrefetchRunning = false;
  let harvardTotalQuestions = 0;
  let harvardCurrentQuestionNumber = 0;
  let harvardSeenQuestionFingerprints = new Set();
  let harvardBridgeInjected = false;
  let harvardBackgroundQueueRunning = false;
  let harvardBackgroundDiscovered = 0;
  const harvardBackgroundQueued = new Set();
  const harvardBackgroundSolved = new Set();
  const harvardBackgroundPayloads = new Map();
  let harvardMessageListenerAttached = false;
  let akajobPrefetchObserver = null;
  let akajobPrefetchTimer = null;
  let akajobPrefetchRunning = false;
  let akajobTotalQuestions = 0;
  let akajobCurrentQuestionNumber = 0;
  let akajobBridgeInjected = false;
  let akajobBackgroundQueueRunning = false;
  let akajobBackgroundDiscovered = 0;
  const akajobBackgroundQueued = new Set();
  const akajobBackgroundSolved = new Set();
  const akajobBackgroundPayloads = new Map();
  const akajobPendingInsertRequests = new Map();
  const akajobPendingReadRequests = new Map();
  let akajobMessageListenerAttached = false;
  const sessionCachedFingerprints = new Set();
  const questionHintCache = new Map();
  const latestSolvedResults = new Map();
  const processedQuestionFingerprints = new Map();
  const pendingAutoSolveFingerprints = new Set();
  const prefetchInFlight = new Map();
  let hoverHintTooltipEl = null;
  const hoverHintBindings = [];
  const hoverHintMarkers = [];
  let followUpPromptDraft = '';
  let latestCodingLogicBlock = '';
  let latestCodingFullCode = '';
  const OPENROUTER_MODELS = [
    { value: 'openai/gpt-4o', label: 'GPT-4o (Smartest)' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best)' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Stable)' },
    { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)' },
    { value: 'google/gemini-2.0-pro-exp-02-05:free', label: 'Gemini 2.0 Pro Exp (Free)' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (Coding King)' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Expert)' },
    { value: 'qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder (Free)' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 (70B) - Free' },
    { value: 'google/learnlm-1.5-pro-experimental:free', label: 'LearnLM 1.5 Pro (Free)' },
    { value: 'openrouter/auto', label: 'Auto-Select Best' }
  ];
  const GEMINI_MODELS = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Experimental (Feb 5)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Stable)' },
    { value: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash-Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ];
  
  // Stealth: Run at document_start, wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  async function init() {
    // Load settings
    const savedSettings = await requestSettings();
    settings = {
      aiProvider: savedSettings?.aiProvider || 'openrouter',
      apiKey: savedSettings?.apiKey || '',
      geminiApiKey: savedSettings?.geminiApiKey || '',
      model: savedSettings?.model || 'google/gemini-2.0-flash-exp:free',
      modelQuiz: savedSettings?.modelQuiz || savedSettings?.model || 'google/gemini-2.0-flash-exp:free',
      modelCoding: savedSettings?.modelCoding || savedSettings?.model || 'google/gemini-2.0-flash-exp:free',
      autoDetect: savedSettings?.autoDetect === true,
      showExplanations: savedSettings?.showExplanations !== false,
      stealthMode: savedSettings?.stealthMode !== false,
      autoHideDelay: Number.isFinite(savedSettings?.autoHideDelay) ? savedSettings.autoHideDelay : 8000,
      followUpPrompt: normalizeFollowUpPromptText(savedSettings?.followUpPrompt || '')
    };

    settings.autoHideDelay = Math.max(3000, settings.autoHideDelay || 8000);
    lastModelSignature = getActiveModelSignature(settings);
    console.log('[AI Translator] Settings loaded:', settings);
    
    // Create hidden UI elements (not visible by default)
    createHiddenUI();
    console.log('[AI Translator] Hidden UI created');
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Keep runtime settings in sync (popup updates)
    setupSettingsSync();
    
    // Setup focus mode detection
    setupFocusModeDetection();

    // Setup/teardown auto-detect + prefetch systems based on in-page toggle.
    configureAutoDetectState(settings.autoDetect === true, 'init');
    
    // Listen for URL changes (SPA navigation)
    observeURLChanges();
    
    console.log('[AI Translator] Init complete. Use Ctrl+Shift+Q (or Alt+Shift+Q) to toggle UI');
  }
  
  /**
   * Create UI elements in hidden state
   */
  function createHiddenUI() {
    if (shadowContainer && document.contains(shadowContainer) && sidebarElement) {
      return;
    }

    // Create shadow DOM container for isolation
    const mountTarget = document.documentElement || document.body;
    const { container, shadow } = Stealth.createShadowContainer(mountTarget);
    shadowContainer = container;
    shadowRoot = shadow;

    // Create sidebar panel only - NO visible button
    if (shadowRoot) {
      createHiddenSidebar(shadowRoot);
    }

    // Mark as injected (for internal tracking only)
    if (container) {
      container.setAttribute('data-ai-quiz-injected', 'true');
    }
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
        width: '360px',
        height: '100vh',
        zIndex: '999998',
        background: 'rgba(246, 251, 255, 0.92)',
        boxShadow: '-3px 0 12px rgba(20, 36, 56, 0.2)',
        backdropFilter: 'blur(6px)',
        visibility: 'hidden', // Hidden by default
        opacity: '0',
        transform: 'translateX(22px)',
        transition: 'transform 0.28s ease, opacity 0.28s ease, box-shadow 0.28s ease, filter 0.28s ease',
        display: 'flex',
        flexDirection: 'column'
      }
    });
    
    sidebarElement.innerHTML = `
      <div class="${Stealth.randomClassName()}" style="background: linear-gradient(135deg, #2f5f88, #4578a0); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 16px; margin: 0;">AI Translator</h3>
        <button class="${Stealth.randomClassName()}" style="background: rgba(255,255,255,0.2); border: none; border-radius: 4px; width: 32px; height: 32px; font-size: 20px; color: white; cursor: pointer;">&times;</button>
      </div>
      <div class="${Stealth.randomClassName()}" style="flex: 1; padding: 16px; overflow-y: auto;">
        <div class="${Stealth.randomClassName()}" id="sidebar-progress" style="background: #eef3fb; border: 1px solid #d8e3f5; color: #345; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; display: none;"></div>
        <div class="${Stealth.randomClassName()}" id="sidebar-quick-controls" style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
          <button class="${Stealth.randomClassName()}" id="sidebar-auto-detect-toggle" style="flex: 1; padding: 8px 10px; background: #f2f6fd; color: #2f4f7f; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; cursor: pointer;">Auto-detect: OFF</button>
          <span style="font-size: 11px; color: #5d6f86; white-space: nowrap;">Ctrl+Shift+A</span>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-settings-wrap" style="border: 1px solid #d9e2f1; border-radius: 8px; margin-bottom: 12px; background: #f7faff;">
          <button class="${Stealth.randomClassName()}" id="sidebar-settings-toggle" aria-expanded="false" style="width: 100%; text-align: left; border: none; background: transparent; padding: 10px 12px; cursor: pointer; font-size: 13px; color: #2f4f7f; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
            <span>Settings</span>
            <span id="sidebar-settings-chevron">+</span>
          </button>
          <div class="${Stealth.randomClassName()}" id="sidebar-settings-panel" style="display: none; padding: 0 12px 12px 12px;">
            <div style="margin-bottom: 8px;">
              <label for="sidebar-ai-provider" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">AI Provider</label>
              <select id="sidebar-ai-provider" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; background: white;">
                <option value="openrouter">OpenRouter</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div id="sidebar-openrouter-config" style="display: block;">
              <div style="margin-bottom: 8px;">
                <label for="sidebar-api-key" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">OpenRouter API Key</label>
                <input type="password" id="sidebar-api-key" placeholder="Enter OpenRouter API key" autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
              </div>
              <div style="margin-bottom: 8px;">
                <label for="sidebar-openrouter-model" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">OpenRouter Quiz Model</label>
                <select id="sidebar-openrouter-model" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; background: white;"></select>
              </div>
              <div style="margin-bottom: 8px;">
                <label for="sidebar-openrouter-model-coding" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">OpenRouter Coding Model</label>
                <select id="sidebar-openrouter-model-coding" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; background: white;"></select>
                <input type="text" id="sidebar-custom-model" placeholder="Or enter custom model ID" style="width: 100%; padding: 6px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 11px; box-sizing: border-box; margin-top: 4px;">
              </div>
            </div>

            <div id="sidebar-gemini-config" style="display: none;">
              <div style="margin-bottom: 8px;">
                <label for="sidebar-gemini-api-key" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">Gemini API Key</label>
                <input type="password" id="sidebar-gemini-api-key" placeholder="Enter Gemini API key" autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
              </div>
              <div style="margin-bottom: 8px;">
                <label for="sidebar-gemini-model" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">Gemini Quiz Model</label>
                <select id="sidebar-gemini-model" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; background: white;"></select>
              </div>
              <div style="margin-bottom: 8px;">
                <label for="sidebar-gemini-model-coding" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">Gemini Coding Model</label>
                <select id="sidebar-gemini-model-coding" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; background: white;"></select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin: 8px 0;">
              <label style="font-size: 12px; color: #44546a; display: flex; gap: 6px; align-items: center; cursor: pointer;">
                <input type="checkbox" id="sidebar-auto-detect"> Auto-detect
              </label>
              <label style="font-size: 12px; color: #44546a; display: flex; gap: 6px; align-items: center; cursor: pointer;">
                <input type="checkbox" id="sidebar-show-explanations"> Show explanations
              </label>
              <label style="font-size: 12px; color: #44546a; display: flex; gap: 6px; align-items: center; cursor: pointer;">
                <input type="checkbox" id="sidebar-stealth-mode"> Stealth mode
              </label>
            </div>

            <div style="margin-bottom: 10px;">
              <label for="sidebar-auto-hide-delay" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">Auto-hide delay (seconds)</label>
              <input type="number" id="sidebar-auto-hide-delay" min="3" max="30" step="1" value="8" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 10px;">
              <label for="sidebar-follow-up-prompt" style="font-size: 12px; color: #4d5f7a; display: block; margin-bottom: 4px;">Follow-up prompt (improve answer quality)</label>
              <textarea id="sidebar-follow-up-prompt" rows="3" placeholder="Ví dụ: ưu tiên chính xác theo Java core; kiểm tra kỹ bẫy đáp án gần giống nhau" style="width: 100%; padding: 8px; border: 1px solid #ccd8ec; border-radius: 6px; font-size: 12px; box-sizing: border-box; resize: vertical;"></textarea>
              <button class="${Stealth.randomClassName()}" id="sidebar-follow-up-apply" style="margin-top: 6px; width: 100%; padding: 8px; background: #5d6670; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Lưu follow-up prompt</button>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button class="${Stealth.randomClassName()}" id="sidebar-settings-save" style="flex: 1; padding: 9px; background: #2f80ed; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Save</button>
              <button class="${Stealth.randomClassName()}" id="sidebar-settings-test" style="flex: 1; padding: 9px; background: #4b5563; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Test</button>
            </div>
            <div id="sidebar-settings-status" style="display: none; border-radius: 6px; padding: 8px; font-size: 12px;"></div>
          </div>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-question" style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <p style="font-size: 13px; color: #666;">Bôi đen câu hỏi và đáp án, sau đó nhấn Ctrl+Shift+E (hoặc Alt+Shift+E) để xem câu trả lời. Ctrl+Shift+A để bật/tắt auto-detect ngay trên trang.</p>
        </div>
        <div class="${Stealth.randomClassName()}" id="sidebar-options" style="margin-bottom: 12px;"></div>
        <button class="${Stealth.randomClassName()}" id="sidebar-solve-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #356d95, #4d86ad); color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; margin-bottom: 16px;">
          Xem câu trả lời
        </button>
        <button class="${Stealth.randomClassName()}" id="sidebar-regenerate-btn" style="width: 100%; padding: 10px; background: #4b5563; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-top: -8px; margin-bottom: 16px;">
          Regenerate (gọi lại AI)
        </button>
        <div class="${Stealth.randomClassName()}" id="sidebar-result" style="display: none; margin-bottom: 16px;">
          <div class="${Stealth.randomClassName()}" id="result-answer" style="background: #e7f3ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 16px; font-weight: 600; color: #4a90d9;"></div>
          <div class="${Stealth.randomClassName()}" id="result-explanation" style="background: #fff3cd; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #856404;"></div>
          <div class="${Stealth.randomClassName()}" id="coding-actions" style="display: none; gap: 8px; margin-top: 10px;">
            <button class="${Stealth.randomClassName()}" id="insert-logic-btn" style="flex: 1; padding: 10px; background: #4a90d9; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">Insert Logic</button>
            <button class="${Stealth.randomClassName()}" id="copy-logic-btn" style="flex: 1; padding: 10px; background: #5d6670; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">Copy Logic</button>
          </div>
          <div class="${Stealth.randomClassName()}" id="coding-insert-status" style="display: none; margin-top: 8px; font-size: 12px; color: #345;"></div>
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

    const regenerateBtn = sidebarElement.querySelector('#sidebar-regenerate-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => solveCurrentQuestion(null, { forceRefresh: true }));
    }

    const quickAutoDetectToggleBtn = sidebarElement.querySelector('#sidebar-auto-detect-toggle');
    if (quickAutoDetectToggleBtn) {
      quickAutoDetectToggleBtn.addEventListener('click', () => {
        const nextAutoDetect = !(settings && settings.autoDetect === true);
        toggleAutoDetectSetting(nextAutoDetect, true);
      });
    }

    const applyFollowUpBtn = sidebarElement.querySelector('#sidebar-follow-up-apply');
    if (applyFollowUpBtn) {
      applyFollowUpBtn.addEventListener('click', () => {
        saveFollowUpPromptFromSidebar();
      });
    }

    const insertLogicBtn = sidebarElement.querySelector('#insert-logic-btn');
    if (insertLogicBtn) {
      insertLogicBtn.addEventListener('click', handleInsertLogicClick);
    }

    const copyLogicBtn = sidebarElement.querySelector('#copy-logic-btn');
    if (copyLogicBtn) {
      copyLogicBtn.addEventListener('click', handleCopyLogicClick);
    }

    const settingsToggleBtn = sidebarElement.querySelector('#sidebar-settings-toggle');
    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener('click', () => toggleSidebarSettingsPanel());
    }

    const providerSelect = sidebarElement.querySelector('#sidebar-ai-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        toggleSidebarProviderUI();
        applySidebarProviderModelSelection();
      });
    }

    const openrouterModelSelect = sidebarElement.querySelector('#sidebar-openrouter-model');
    if (openrouterModelSelect) {
      openrouterModelSelect.addEventListener('change', applySidebarProviderModelSelection);
    }

    const openrouterCodingModelSelect = sidebarElement.querySelector('#sidebar-openrouter-model-coding');
    if (openrouterCodingModelSelect) {
      openrouterCodingModelSelect.addEventListener('change', applySidebarProviderModelSelection);
    }

    const geminiModelSelect = sidebarElement.querySelector('#sidebar-gemini-model');
    if (geminiModelSelect) {
      geminiModelSelect.addEventListener('change', applySidebarProviderModelSelection);
    }

    const geminiCodingModelSelect = sidebarElement.querySelector('#sidebar-gemini-model-coding');
    if (geminiCodingModelSelect) {
      geminiCodingModelSelect.addEventListener('change', applySidebarProviderModelSelection);
    }

    const saveSettingsBtn = sidebarElement.querySelector('#sidebar-settings-save');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => saveSidebarSettings());
    }

    const testSettingsBtn = sidebarElement.querySelector('#sidebar-settings-test');
    if (testSettingsBtn) {
      testSettingsBtn.addEventListener('click', testSidebarConnection);
    }

    const autoDetectInput = sidebarElement.querySelector('#sidebar-auto-detect');
    if (autoDetectInput) {
      autoDetectInput.addEventListener('change', () => {
        const desired = !!autoDetectInput.checked;
        toggleAutoDetectSetting(desired, true);
      });
    }

    populateSidebarModelSelects();
    syncSidebarSettingsUIFromState();
    attachSidebarInteractionHandlers();
    
    shadow.appendChild(sidebarElement);
  }

  function attachSidebarInteractionHandlers() {
    if (!sidebarElement) return;

    sidebarElement.addEventListener('mouseenter', () => {
      sidebarPointerInside = true;
      applySidebarActiveState();
      clearSidebarStealthTimers();
    });

    sidebarElement.addEventListener('mouseleave', () => {
      sidebarPointerInside = false;
      scheduleSidebarStealthCycle({ ghostDelay: 700 });
    });

    sidebarElement.addEventListener('focusin', () => {
      sidebarFocusInside = true;
      applySidebarActiveState();
      clearSidebarStealthTimers();
    });

    sidebarElement.addEventListener('focusout', (event) => {
      const related = event?.relatedTarget;
      sidebarFocusInside = !!(related && sidebarElement.contains(related));
      if (!sidebarFocusInside) {
        scheduleSidebarStealthCycle({ ghostDelay: 900 });
      }
    });
  }

  function getActiveModelSignature(sourceSettings = settings, questionType = '') {
    const provider = sourceSettings?.aiProvider || 'openrouter';
    const quizModel = String(sourceSettings?.modelQuiz || sourceSettings?.model || '').trim();
    const codingModel = String(sourceSettings?.modelCoding || sourceSettings?.model || '').trim();
    if (questionType === 'coding') {
      return `${provider}::coding::${codingModel}`;
    }
    if (questionType === 'quiz') {
      return `${provider}::quiz::${quizModel}`;
    }
    return `${provider}::quiz::${quizModel}::coding::${codingModel}`;
  }

  function invalidateModelDependentCaches(reason = 'model changed') {
    questionHintCache.clear();
    sessionCachedFingerprints.clear();
    latestSolvedResults.clear();
    processedQuestionFingerprints.clear();
    pendingAutoSolveFingerprints.clear();
    prefetchInFlight.clear();
    clearHoverHintBindings();
    harvardSeenQuestionFingerprints.clear();
    harvardBackgroundSolved.clear();
    akajobBackgroundSolved.clear();
    updateProgressBadge();
    console.log('[AI Translator] Cleared cached hints because', reason);
  }

  function isSidebarInteractionActive() {
    return sidebarPointerInside || sidebarFocusInside;
  }

  function clearSidebarStealthTimers() {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
    clearTimeout(sidebarGhostTimer);
    sidebarGhostTimer = null;
    clearTimeout(sidebarHideTimer);
    sidebarHideTimer = null;
  }

  function applySidebarActiveState() {
    if (!sidebarElement) return;
    Stealth.stealthShow(sidebarElement);
    sidebarElement.style.transform = 'translateX(0)';
    sidebarElement.style.opacity = '1';
    sidebarElement.style.filter = 'none';
    sidebarElement.style.boxShadow = '-3px 0 12px rgba(20, 36, 56, 0.2)';
    sidebarElement.style.pointerEvents = 'auto';
  }

  function applySidebarGhostState() {
    if (!sidebarElement || !sidebarVisible || isSidebarInteractionActive()) return;
    Stealth.stealthShow(sidebarElement);
    sidebarElement.style.transform = 'translateX(calc(100% - 44px))';
    sidebarElement.style.opacity = '0.3';
    sidebarElement.style.filter = 'saturate(0.72)';
    sidebarElement.style.boxShadow = '-1px 0 6px rgba(20, 36, 56, 0.12)';
    sidebarElement.style.pointerEvents = 'auto';
  }

  function scheduleSidebarStealthCycle(options = {}) {
    if (!sidebarVisible || !settings?.stealthMode || sidebarPinned) return;

    const ghostDelay = Number.isFinite(options.ghostDelay) ? Math.max(350, options.ghostDelay) : 1300;
    const hideDelay = Number.isFinite(options.hideDelay)
      ? Math.max(1800, options.hideDelay)
      : Math.max(3000, settings.autoHideDelay || 8000);

    clearSidebarStealthTimers();

    sidebarGhostTimer = setTimeout(() => {
      if (!sidebarVisible) return;
      if (isSidebarInteractionActive()) {
        scheduleSidebarStealthCycle({ ghostDelay: 700, hideDelay });
        return;
      }
      applySidebarGhostState();
    }, ghostDelay);

    sidebarHideTimer = setTimeout(() => {
      if (!sidebarVisible) return;
      if (isSidebarInteractionActive()) {
        scheduleSidebarStealthCycle({ ghostDelay: 700, hideDelay });
        return;
      }
      hideSidebar();
    }, hideDelay);

    autoHideTimer = sidebarHideTimer;
  }

  function showSidebarStealth(options = {}) {
    if (!sidebarElement) return;

    sidebarPinned = !!options.pin;
    sidebarVisible = true;
    applySidebarActiveState();
    forceSidebarIntoViewport();

    if (!sidebarPinned) {
      scheduleSidebarStealthCycle({ ghostDelay: options.ghostDelay });
    }
  }
  
  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+Q or Alt+Shift+Q - Toggle sidebar
      if (isToggleShortcut(e)) {
        e.preventDefault();
        console.log('[AI Translator] Toggle shortcut pressed');
        toggleSidebar();
      }
      
      // Ctrl+Shift+E or Alt+Shift+E - Solve current question (stealth)
      if (isSolveShortcut(e)) {
        e.preventDefault();
        console.log('[AI Translator] Solve shortcut pressed');
        solveCurrentQuestion();
      }

      // Ctrl+Shift+A or Alt+Shift+A - Toggle auto-detect/prefetch
      if (isAutoDetectShortcut(e)) {
        e.preventDefault();
        const nextAutoDetect = !(settings && settings.autoDetect === true);
        toggleAutoDetectSetting(nextAutoDetect, true);
      }

      // Alt+Shift+R - Regenerate current answer
      if (isRegenerateShortcut(e)) {
        e.preventDefault();
        solveCurrentQuestion(null, { forceRefresh: true });
      }
      
      // Esc - Hide all UI instantly
      if (e.key === 'Escape') {
        e.preventDefault();
        hideAllUI();
      }
    }, true);
    
    // Listen for commands from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleUI') {
        toggleSidebar();
        sendResponse({ success: true });
      }

      if (request.action === 'solveQuiz') {
        const payload = buildQuestionFromRequest(request);
        solveCurrentQuestion(payload, { allowSelectionOverride: false, skipAIFallback: true });
        sendResponse({ success: true });
      }
      
      if (request.action === 'solveQuestion') {
        solveCurrentQuestion();
        sendResponse({ success: true });
      }

      if (request.action === 'toggleAutoDetect') {
        const nextAutoDetect = !(settings && settings.autoDetect === true);
        toggleAutoDetectSetting(nextAutoDetect, true);
        sendResponse({ success: true, autoDetect: nextAutoDetect });
      }
      
      if (request.action === 'hideAllUI') {
        hideAllUI();
        sendResponse({ success: true });
      }
    });
  }

  function isToggleShortcut(event) {
    if (!event || event.metaKey) return false;
    const isAltShift = event.altKey && event.shiftKey && !event.ctrlKey;
    const isCtrlShift = event.ctrlKey && event.shiftKey && !event.altKey;
    return (isAltShift || isCtrlShift) && event.code === 'KeyQ';
  }

  function isSolveShortcut(event) {
    if (!event || event.metaKey) return false;
    const isAltShift = event.altKey && event.shiftKey && !event.ctrlKey;
    const isCtrlShift = event.ctrlKey && event.shiftKey && !event.altKey;
    return (isAltShift || isCtrlShift) && event.code === 'KeyE';
  }

  function isAutoDetectShortcut(event) {
    if (!event || event.metaKey) return false;
    const isAltShift = event.altKey && event.shiftKey && !event.ctrlKey;
    const isCtrlShift = event.ctrlKey && event.shiftKey && !event.altKey;
    return (isAltShift || isCtrlShift) && event.code === 'KeyA';
  }

  function isRegenerateShortcut(event) {
    if (!event || event.metaKey) return false;
    const isAltShift = event.altKey && event.shiftKey && !event.ctrlKey;
    return isAltShift && event.code === 'KeyR';
  }

  function getSidebarNode(selector) {
    return sidebarElement?.querySelector(selector) || null;
  }

  function populateSidebarModelSelects() {
    const openrouterSelect = getSidebarNode('#sidebar-openrouter-model');
    const openrouterCodingSelect = getSidebarNode('#sidebar-openrouter-model-coding');
    const geminiSelect = getSidebarNode('#sidebar-gemini-model');
    const geminiCodingSelect = getSidebarNode('#sidebar-gemini-model-coding');
    if (!openrouterSelect || !openrouterCodingSelect || !geminiSelect || !geminiCodingSelect) return;

    const currentQuiz = openrouterSelect.value || settings?.modelQuiz || settings?.model || '';
    const currentCoding = openrouterCodingSelect.value || settings?.modelCoding || settings?.model || '';

    // Clear and refill with full list
    openrouterSelect.innerHTML = OPENROUTER_MODELS
      .map((model) => `<option value="${escapeHtml(model.value)}">${escapeHtml(model.label)}</option>`)
      .join('');
    openrouterCodingSelect.innerHTML = OPENROUTER_MODELS
      .map((model) => `<option value="${escapeHtml(model.value)}">${escapeHtml(model.label)}</option>`)
      .join('');

    geminiSelect.innerHTML = GEMINI_MODELS
      .map((model) => `<option value="${escapeHtml(model.value)}">${escapeHtml(model.label)}</option>`)
      .join('');
    geminiCodingSelect.innerHTML = GEMINI_MODELS
      .map((model) => `<option value="${escapeHtml(model.value)}">${escapeHtml(model.label)}</option>`)
      .join('');

    if (currentQuiz) {
      ensureSidebarModelOption(openrouterSelect, currentQuiz);
      openrouterSelect.value = currentQuiz;
    }
    if (currentCoding) {
      ensureSidebarModelOption(openrouterCodingSelect, currentCoding);
      openrouterCodingSelect.value = currentCoding;
    }
    if (currentQuiz) {
      ensureSidebarModelOption(geminiSelect, currentQuiz);
      geminiSelect.value = currentQuiz;
    }
    if (currentCoding) {
      ensureSidebarModelOption(geminiCodingSelect, currentCoding);
      geminiCodingSelect.value = currentCoding;
    }
  }

  function ensureSidebarModelOption(selectEl, modelValue) {
    if (!selectEl || !modelValue) return;
    const exists = Array.from(selectEl.options).some((opt) => opt.value === modelValue);
    if (exists) return;

    const option = document.createElement('option');
    option.value = modelValue;
    option.textContent = `${modelValue} (Custom)`;
    selectEl.appendChild(option);
  }

  function toggleSidebarSettingsPanel(forceOpen) {
    const panel = getSidebarNode('#sidebar-settings-panel');
    const toggleBtn = getSidebarNode('#sidebar-settings-toggle');
    const chevron = getSidebarNode('#sidebar-settings-chevron');
    if (!panel || !toggleBtn || !chevron) return;

    const currentOpen = panel.style.display !== 'none';
    const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !currentOpen;

    panel.style.display = nextOpen ? 'block' : 'none';
    toggleBtn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    chevron.textContent = nextOpen ? '-' : '+';
  }

  function toggleSidebarProviderUI() {
    const providerSelect = getSidebarNode('#sidebar-ai-provider');
    const openrouterConfig = getSidebarNode('#sidebar-openrouter-config');
    const geminiConfig = getSidebarNode('#sidebar-gemini-config');
    if (!providerSelect || !openrouterConfig || !geminiConfig) return;

    const provider = providerSelect.value;
    if (provider === 'gemini') {
      openrouterConfig.style.display = 'none';
      geminiConfig.style.display = 'block';
    } else {
      openrouterConfig.style.display = 'block';
      geminiConfig.style.display = 'none';
    }
  }

  function applySidebarProviderModelSelection() {
    if (!settings) return;

    const provider = getSidebarNode('#sidebar-ai-provider')?.value || settings.aiProvider || 'openrouter';
    const openrouterModel = String(getSidebarNode('#sidebar-openrouter-model')?.value || '').trim();
    const openrouterCodingModel = String(getSidebarNode('#sidebar-openrouter-model-coding')?.value || '').trim();
    const geminiModel = String(getSidebarNode('#sidebar-gemini-model')?.value || '').trim();
    const geminiCodingModel = String(getSidebarNode('#sidebar-gemini-model-coding')?.value || '').trim();
    const modelQuiz = provider === 'gemini'
      ? (geminiModel || settings.modelQuiz || settings.model || 'gemini-2.0-flash')
      : (openrouterModel || settings.modelQuiz || settings.model || 'google/gemini-2.0-flash-exp:free');
    const modelCoding = provider === 'gemini'
      ? (geminiCodingModel || settings.modelCoding || settings.model || 'gemini-2.0-flash')
      : (openrouterCodingModel || settings.modelCoding || settings.model || 'google/gemini-2.0-flash-exp:free');
    const model = modelQuiz;

    const previousSignature = getActiveModelSignature(settings);
    settings = {
      ...settings,
      aiProvider: provider,
      model,
      modelQuiz,
      modelCoding
    };

    const nextSignature = getActiveModelSignature(settings);
    if (previousSignature !== nextSignature) {
      invalidateModelDependentCaches('temporary sidebar model selection change');
      lastModelSignature = nextSignature;
    }
  }

  function syncSidebarSettingsUIFromState() {
    if (!settings || !sidebarElement) return;

    populateSidebarModelSelects();

    const apiKeyInput = getSidebarNode('#sidebar-api-key');
    const providerSelect = getSidebarNode('#sidebar-ai-provider');
    const openrouterModelSelect = getSidebarNode('#sidebar-openrouter-model');
    const openrouterCodingModelSelect = getSidebarNode('#sidebar-openrouter-model-coding');
    const customModelInput = getSidebarNode('#sidebar-custom-model');
    const geminiKeyInput = getSidebarNode('#sidebar-gemini-api-key');
    const geminiModelSelect = getSidebarNode('#sidebar-gemini-model');
    const geminiCodingModelSelect = getSidebarNode('#sidebar-gemini-model-coding');
    const autoDetectInput = getSidebarNode('#sidebar-auto-detect');
    const quickAutoDetectToggleBtn = getSidebarNode('#sidebar-auto-detect-toggle');
    const followUpPromptInput = getSidebarNode('#sidebar-follow-up-prompt');
    const showExplanationsInput = getSidebarNode('#sidebar-show-explanations');
    const stealthModeInput = getSidebarNode('#sidebar-stealth-mode');
    const autoHideDelayInput = getSidebarNode('#sidebar-auto-hide-delay');

    if (apiKeyInput) {
      apiKeyInput.value = settings.apiKey || '';
    }

    if (providerSelect) {
      providerSelect.value = settings.aiProvider || 'openrouter';
    }

    if (geminiKeyInput) {
      geminiKeyInput.value = settings.geminiApiKey || '';
    }

    const quizModelValue = String(settings.modelQuiz || settings.model || '').trim();
    const codingModelValue = String(settings.modelCoding || settings.model || '').trim();

    if (quizModelValue && openrouterModelSelect) {
      const exists = Array.from(openrouterModelSelect.options).some(opt => opt.value === quizModelValue);
      if (exists) {
        openrouterModelSelect.value = quizModelValue;
      } else {
        ensureSidebarModelOption(openrouterModelSelect, quizModelValue);
        openrouterModelSelect.value = quizModelValue;
      }
    }

    if (codingModelValue && openrouterCodingModelSelect) {
      const exists = Array.from(openrouterCodingModelSelect.options).some(opt => opt.value === codingModelValue);
      if (exists) {
        openrouterCodingModelSelect.value = codingModelValue;
      } else {
        ensureSidebarModelOption(openrouterCodingModelSelect, codingModelValue);
        openrouterCodingModelSelect.value = codingModelValue;
      }
    }

    if (quizModelValue && geminiModelSelect) {
      const exists = Array.from(geminiModelSelect.options).some(opt => opt.value === quizModelValue);
      if (exists) {
        geminiModelSelect.value = quizModelValue;
      } else {
        ensureSidebarModelOption(geminiModelSelect, quizModelValue);
        geminiModelSelect.value = quizModelValue;
      }
    }

    if (codingModelValue && geminiCodingModelSelect) {
      const exists = Array.from(geminiCodingModelSelect.options).some(opt => opt.value === codingModelValue);
      if (exists) {
        geminiCodingModelSelect.value = codingModelValue;
      } else {
        ensureSidebarModelOption(geminiCodingModelSelect, codingModelValue);
        geminiCodingModelSelect.value = codingModelValue;
      }
    }

    if (customModelInput) {
      customModelInput.value = '';
    }

    if (autoDetectInput) {
      autoDetectInput.checked = settings.autoDetect === true;
    }

    if (quickAutoDetectToggleBtn) {
      const enabled = settings.autoDetect === true;
      quickAutoDetectToggleBtn.textContent = `Auto-detect: ${enabled ? 'ON' : 'OFF'}`;
      quickAutoDetectToggleBtn.style.background = enabled ? '#e8f6ea' : '#f2f6fd';
      quickAutoDetectToggleBtn.style.borderColor = enabled ? '#b7dfbf' : '#ccd8ec';
      quickAutoDetectToggleBtn.style.color = enabled ? '#1f7a2d' : '#2f4f7f';
    }

    if (followUpPromptInput) {
      const persistedPrompt = normalizeFollowUpPromptText(settings.followUpPrompt || '');
      if (!followUpPromptDraft) {
        followUpPromptDraft = persistedPrompt;
      }
      followUpPromptInput.value = followUpPromptDraft || persistedPrompt;
    }

    if (showExplanationsInput) {
      showExplanationsInput.checked = settings.showExplanations !== false;
    }

    if (stealthModeInput) {
      stealthModeInput.checked = settings.stealthMode !== false;
    }

    if (autoHideDelayInput) {
      autoHideDelayInput.value = String(Math.max(3, Math.floor((settings.autoHideDelay || 8000) / 1000)));
    }

    toggleSidebarProviderUI();
  }

  async function saveFollowUpPromptFromSidebar() {
    const input = getSidebarNode('#sidebar-follow-up-prompt');
    if (!input) return;

    const promptValue = normalizeFollowUpPromptText(input.value || '');
    followUpPromptDraft = promptValue;

    try {
      await persistRuntimeSettings({ followUpPrompt: promptValue });
      setSidebarSettingsStatus('Follow-up prompt saved.', 'success');
    } catch (error) {
      setSidebarSettingsStatus(formatExtensionErrorMessage(error), 'error');
    }
  }

  function getSidebarSettingsFromInputs() {
    const apiKey = String(getSidebarNode('#sidebar-api-key')?.value || '').trim();
    const openrouterModel = String(getSidebarNode('#sidebar-openrouter-model')?.value || '').trim();
    const openrouterCodingModel = String(getSidebarNode('#sidebar-openrouter-model-coding')?.value || '').trim();
    const customModel = String(getSidebarNode('#sidebar-custom-model')?.value || '').trim();
    const geminiApiKey = String(getSidebarNode('#sidebar-gemini-api-key')?.value || '').trim();
    const geminiModel = String(getSidebarNode('#sidebar-gemini-model')?.value || '').trim();
    const geminiCodingModel = String(getSidebarNode('#sidebar-gemini-model-coding')?.value || '').trim();
    const provider = String(getSidebarNode('#sidebar-ai-provider')?.value || settings?.aiProvider || 'openrouter');
    const autoDetect = !!getSidebarNode('#sidebar-auto-detect')?.checked;
    const followUpPrompt = normalizeFollowUpPromptText(getSidebarNode('#sidebar-follow-up-prompt')?.value || '');
    const showExplanations = !!getSidebarNode('#sidebar-show-explanations')?.checked;
    const stealthMode = !!getSidebarNode('#sidebar-stealth-mode')?.checked;
    const delayInput = parseInt(String(getSidebarNode('#sidebar-auto-hide-delay')?.value || '8'), 10);
    const safeDelay = Number.isFinite(delayInput) ? Math.min(30, Math.max(3, delayInput)) : 8;
    const modelQuiz = provider === 'gemini'
      ? (geminiModel || settings?.modelQuiz || settings?.model || 'gemini-2.0-flash')
      : (customModel || openrouterModel || settings?.modelQuiz || settings?.model || 'google/gemini-2.0-flash-exp:free');
    const modelCoding = provider === 'gemini'
      ? (geminiCodingModel || settings?.modelCoding || settings?.model || 'gemini-2.0-flash')
      : (customModel || openrouterCodingModel || settings?.modelCoding || settings?.model || 'google/gemini-2.0-flash-exp:free');
    const model = modelQuiz;

    if (provider === 'gemini') {
      if (!geminiApiKey) {
        return { ok: false, error: 'Please enter a Gemini API key' };
      }
    } else if (!apiKey) {
      return { ok: false, error: 'Please enter an OpenRouter API key' };
    }

    followUpPromptDraft = followUpPrompt;

    return {
      ok: true,
      settings: {
        ...(settings || {}),
        aiProvider: provider || 'openrouter',
        apiKey,
        geminiApiKey,
        model,
        modelQuiz,
        modelCoding,
        autoDetect,
        followUpPrompt,
        showExplanations,
        stealthMode,
        autoHideDelay: safeDelay * 1000
      }
    };
  }

  function setSidebarSettingsStatus(message, type = 'info') {
    const statusEl = getSidebarNode('#sidebar-settings-status');
    if (!statusEl) return;

    const text = String(message || '').trim();
    if (!text) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      return;
    }

    statusEl.style.display = 'block';
    statusEl.textContent = text;

    if (type === 'success') {
      statusEl.style.background = '#e8f6ea';
      statusEl.style.border = '1px solid #b7dfbf';
      statusEl.style.color = '#1f7a2d';
      return;
    }

    if (type === 'error') {
      statusEl.style.background = '#fdecec';
      statusEl.style.border = '1px solid #f5c2c7';
      statusEl.style.color = '#9b1c1c';
      return;
    }

    statusEl.style.background = '#eef3fb';
    statusEl.style.border = '1px solid #d8e3f5';
    statusEl.style.color = '#345';
  }

  async function saveSidebarSettings(saveOptions = {}) {
    const options = {
      showSuccess: true,
      ...saveOptions
    };

    const saveBtn = getSidebarNode('#sidebar-settings-save');
    const parsed = getSidebarSettingsFromInputs();
    if (!parsed.ok) {
      setSidebarSettingsStatus(parsed.error || 'Invalid settings.', 'error');
      return { ok: false, error: parsed.error || 'Invalid settings.' };
    }

    try {
      const previousSignature = getActiveModelSignature(settings);
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      await sendRuntimeMessage({ action: 'saveSettings', settings: parsed.settings });
      settings = {
        ...settings,
        ...parsed.settings,
        autoDetect: parsed.settings.autoDetect === true,
        followUpPrompt: normalizeText(parsed.settings.followUpPrompt || ''),
        autoHideDelay: Math.max(3000, parsed.settings.autoHideDelay || 8000)
      };
      followUpPromptDraft = normalizeFollowUpPromptText(settings.followUpPrompt || '');

      const nextSignature = getActiveModelSignature(settings);
      if (previousSignature !== nextSignature) {
        invalidateModelDependentCaches('settings saved from sidebar');
      }
      lastModelSignature = nextSignature;

      syncSidebarSettingsUIFromState();
      if (options.showSuccess) {
        setSidebarSettingsStatus('Settings saved successfully.', 'success');
      }

      return { ok: true, settings: parsed.settings };
    } catch (error) {
      const message = formatExtensionErrorMessage(error);
      setSidebarSettingsStatus(message, 'error');
      return { ok: false, error: message };
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    }
  }

  async function testSidebarConnection() {
    const testBtn = getSidebarNode('#sidebar-settings-test');

    try {
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
      }

      setSidebarSettingsStatus('Saving settings and testing connection...', 'info');
      const saved = await saveSidebarSettings({ showSuccess: false });
      if (!saved.ok) return;

      const result = await sendRuntimeMessage({
        action: 'solveQuiz',
        model: settings?.modelQuiz || settings?.model || '',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        questionType: 'multiple_choice',
        followUpPrompt: normalizeFollowUpPromptText(settings?.followUpPrompt || '')
      });

      if (!result) {
        setSidebarSettingsStatus('No response from background service.', 'error');
        return;
      }

      if (result.error) {
        setSidebarSettingsStatus(`Test failed: ${result.error}`, 'error');
        return;
      }

      const model = (settings && (settings.modelQuiz || settings.model)) ? `Model: ${settings.modelQuiz || settings.model}. ` : '';
      setSidebarSettingsStatus(`${model}Test successful. Answer: ${result.answer} - ${result.answerText}`, 'success');
    } catch (error) {
      const message = formatExtensionErrorMessage(error);
      setSidebarSettingsStatus(message, 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = 'Test';
      }
    }
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

      return question;
    }

    return null;
  }

  function configureAutoDetectState(enabled, reason = 'manual-toggle') {
    const shouldEnable = !!enabled;
    const wasEnabled = settings && settings.autoDetect === true;
    settings.autoDetect = shouldEnable;
    const needsSetup = !autoDetectObserver && !quizProgressObserver && !harvardPrefetchObserver && !akajobPrefetchObserver;

    if (shouldEnable && (!wasEnabled || needsSetup)) {
      setupAutoDetect();
      setupQuizProgressObserver();
      setupHarvardPrefetchObserver();
      setupHarvardBackgroundPreload();
      setupAkaJobPrefetchObserver();
      setupAkaJobBackgroundPreload();
      scheduleAutoDetectScan(500);
      scheduleQuizProgressRefresh(700);
      scheduleHarvardPrefetch(800);
      scheduleAkaJobPrefetch(800);
      console.log('[AI Translator] Auto-detect enabled by', reason);
    }

    if (!shouldEnable) {
      stopAutoDetectAndPrefetch('auto-detect disabled');
    }

    syncSidebarSettingsUIFromState();
    updateProgressBadge();
  }

  function stopAutoDetectAndPrefetch(reason = 'manual-stop') {
    if (autoDetectObserver) {
      autoDetectObserver.disconnect();
      autoDetectObserver = null;
    }
    clearTimeout(autoDetectTimer);

    if (quizProgressObserver) {
      quizProgressObserver.disconnect();
      quizProgressObserver = null;
    }
    clearTimeout(quizProgressTimer);

    if (harvardPrefetchObserver) {
      harvardPrefetchObserver.disconnect();
      harvardPrefetchObserver = null;
    }
    clearTimeout(harvardPrefetchTimer);
    harvardPrefetchRunning = false;
    harvardBackgroundQueueRunning = false;
    harvardBackgroundPayloads.clear();
    harvardBackgroundQueued.clear();

    if (akajobPrefetchObserver) {
      akajobPrefetchObserver.disconnect();
      akajobPrefetchObserver = null;
    }
    clearTimeout(akajobPrefetchTimer);
    akajobPrefetchRunning = false;
    akajobBackgroundQueueRunning = false;
    akajobBackgroundPayloads.clear();
    akajobBackgroundQueued.clear();

    pendingAutoSolveFingerprints.clear();
    prefetchInFlight.clear();
    hideHoverHintTooltip();
    console.log('[AI Translator] Auto-detect/prefetch stopped:', reason);
  }

  async function toggleAutoDetectSetting(enabled, persist = true) {
    const nextAutoDetect = !!enabled;
    configureAutoDetectState(nextAutoDetect, 'quick-toggle');

    if (persist) {
      try {
        await persistRuntimeSettings({ autoDetect: nextAutoDetect });
        setSidebarSettingsStatus(`Auto-detect ${nextAutoDetect ? 'ON' : 'OFF'} (saved).`, 'success');
      } catch (error) {
        setSidebarSettingsStatus(formatExtensionErrorMessage(error), 'error');
      }
    }
  }

  async function persistRuntimeSettings(partialSettings) {
    const nextSettings = {
      ...(settings || {}),
      ...(partialSettings || {})
    };
    if (nextSettings.autoDetect !== true) {
      nextSettings.autoDetect = false;
    }
    nextSettings.followUpPrompt = normalizeFollowUpPromptText(nextSettings.followUpPrompt || '');
    await sendRuntimeMessage({ action: 'saveSettings', settings: nextSettings });
    settings = nextSettings;
    return nextSettings;
  }

  function setupAutoDetect() {
    if (settings.autoDetect !== true) return;
    if (!document.body) return;
    if (extensionContextLost) return;

    if (autoDetectObserver) {
      autoDetectObserver.disconnect();
      autoDetectObserver = null;
    }

    scheduleAutoDetectScan(900);

    autoDetectObserver = new MutationObserver(() => {
      scheduleAutoDetectScan(700);
    });

    autoDetectObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden', 'style']
    });
  }

  function setupSettingsSync() {
    if (!chrome?.storage?.onChanged) return;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes.settings) return;

      const next = changes.settings.newValue || {};
      const previousAutoDetect = settings.autoDetect === true;
      const previousSignature = getActiveModelSignature(settings);

      settings = {
        ...settings,
        ...next,
        aiProvider: next.aiProvider || settings.aiProvider || 'openrouter',
        apiKey: next.apiKey !== undefined ? next.apiKey : settings.apiKey,
        geminiApiKey: next.geminiApiKey !== undefined ? next.geminiApiKey : settings.geminiApiKey,
        model: next.model !== undefined ? next.model : settings.model,
        modelQuiz: next.modelQuiz !== undefined ? next.modelQuiz : settings.modelQuiz,
        modelCoding: next.modelCoding !== undefined ? next.modelCoding : settings.modelCoding,
        autoDetect: next.autoDetect === true,
        showExplanations: next.showExplanations !== false,
        stealthMode: next.stealthMode !== false,
        autoHideDelay: Number.isFinite(next.autoHideDelay) ? next.autoHideDelay : (settings.autoHideDelay || 8000),
        followUpPrompt: normalizeFollowUpPromptText(next.followUpPrompt !== undefined ? next.followUpPrompt : settings.followUpPrompt)
      };
      followUpPromptDraft = normalizeFollowUpPromptText(settings.followUpPrompt || '');

      const nextSignature = getActiveModelSignature(settings);
      if (previousSignature !== nextSignature || (lastModelSignature && nextSignature !== lastModelSignature)) {
        invalidateModelDependentCaches('settings sync model/provider update');
      }
      lastModelSignature = nextSignature;

      if (settings.autoDetect !== previousAutoDetect) {
        configureAutoDetectState(settings.autoDetect, 'storage-sync');
      }

      syncSidebarSettingsUIFromState();
    });
  }

  function hasValidApiKey() {
    if (!settings) return false;
    if (settings.aiProvider === 'gemini') return !!settings.geminiApiKey;
    return !!settings.apiKey;
  }

  function scheduleAutoDetectScan(delay = 700) {
    if (settings.autoDetect !== true) return;

    clearTimeout(autoDetectTimer);
    autoDetectTimer = setTimeout(() => {
      runAutoDetectScan();
    }, delay);
  }

  function runAutoDetectScan() {
    if (settings.autoDetect !== true) return;
    if (extensionContextLost) return;

    const question = detectQuiz();
    if (!question) return;

    const confidence = calculateQuestionConfidence(question);
    if (confidence < 0.72) return;

    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return;

    cleanupQuestionState();

    if (processedQuestionFingerprints.has(fingerprint) || pendingAutoSolveFingerprints.has(fingerprint)) {
      return;
    }

    if (!hasValidApiKey()) {
      processedQuestionFingerprints.set(fingerprint, Date.now());
      return;
    }

    const now = Date.now();
    if (now < autoSolveCooldownUntil) return;

    pendingAutoSolveFingerprints.add(fingerprint);
    autoSolveCooldownUntil = now + 3000;

    attemptAutoSolve(question, fingerprint)
      .finally(() => {
        pendingAutoSolveFingerprints.delete(fingerprint);
      });
  }

  function cleanupQuestionState() {
    const cutoff = Date.now() - (20 * 60 * 1000);

    for (const [fingerprint, timestamp] of processedQuestionFingerprints.entries()) {
      if (timestamp < cutoff) {
        processedQuestionFingerprints.delete(fingerprint);
      }
    }

    for (const [fingerprint, entry] of questionHintCache.entries()) {
      if (!entry || entry.timestamp < cutoff) {
        questionHintCache.delete(fingerprint);
      }
    }

    for (const [fingerprint, entry] of latestSolvedResults.entries()) {
      if (!entry || entry.timestamp < cutoff) {
        latestSolvedResults.delete(fingerprint);
      }
    }
  }

  function calculateQuestionConfidence(question) {
    if (!question || !question.question) return 0;

    let score = 0;
    const questionLength = question.question.length;
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;

    if (questionLength >= 18) score += 0.45;
    else if (questionLength >= 10) score += 0.25;

    if (optionCount >= 2 && optionCount <= 8) score += 0.35;
    else if (optionCount === 1) score += 0.1;

    if (question.questionType === 'multiple_choice' || question.questionType === 'multiple_select') {
      score += 0.15;
    }

    if (question.element) score += 0.1;

    return Math.min(score, 1);
  }

  function getQuestionFingerprint(question) {
    if (!question || !question.question) return '';

    const normalizedQuestion = normalizeText(question.question).toLowerCase();
    if (!normalizedQuestion) return '';

    const normalizedOptions = (question.options || [])
      .map(opt => normalizeText(opt).toLowerCase())
      .filter(Boolean)
      .join('|');

    const linkedInProgress = getLinkedInQuestionProgress();
    const progressKey = linkedInProgress ? `::q${linkedInProgress.current || 0}of${linkedInProgress.total || 0}` : '';

    const akajobProgress = getAkaJobQuestionProgress();
    const akajobKey = akajobProgress ? `::ak${akajobProgress.current || 0}of${akajobProgress.total || 0}` : '';

    const typeKey = question.questionType ? `::type-${question.questionType}` : '';
    const languageKey = question.questionType === 'coding' ? `::lang-${normalizeText(question.language || '').toLowerCase()}` : '';

    return `${location.hostname}${location.pathname}${progressKey}${akajobKey}${typeKey}${languageKey}::${normalizedQuestion}::${normalizedOptions}`;
  }

  async function attemptAutoSolve(question, fingerprint) {
    try {
      const result = await solveCurrentQuestion(question, {
        allowSelectionOverride: false,
        silent: true,
        skipAutoHide: true,
        markFingerprint: fingerprint
      });

      if (result && !result.error) {
        console.log('[AI Translator] Auto hint ready for detected question');
        markFingerprintAsCached(fingerprint);
        if (question?.source === 'akajob_skillup') {
          akajobBackgroundSolved.add(fingerprint);
        }
        if (question?.source === 'harvard_manage_mentor') {
          harvardSeenQuestionFingerprints.add(fingerprint);
        }
      }
    } finally {
      processedQuestionFingerprints.set(fingerprint, Date.now());
    }
  }
  
  /**
   * Extract question from the DOM
   */
  function extractQuestion() {
    const akajobCodingQuestion = parseAkaJobCodingQuestion();
    if (akajobCodingQuestion) return akajobCodingQuestion;

    const akajobQuestion = parseAkaJobSkillupQuestion();
    if (akajobQuestion) return akajobQuestion;

    const harvardQuestion = parseHarvardManageMentorQuestion();
    if (harvardQuestion) return harvardQuestion;

    const linkedInQuestion = parseLinkedInLearningQuestion();
    if (linkedInQuestion) return linkedInQuestion;

    // Strategy 1: Radio groups (most quiz pages)
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    if (radioInputs.length > 0) {
      const question = parseRadioQuestion(radioInputs);
      if (question) return question;
    }

    // Strategy 2: ARIA radio groups (custom UI frameworks)
    const ariaRadios = document.querySelectorAll('[role="radio"]');
    if (ariaRadios.length > 1) {
      const question = parseAriaRadioQuestion(ariaRadios);
      if (question) return question;
    }

    // Strategy 3: structural containers from option-like elements
    const structuralCandidates = collectStructuralQuizContainers();
    let bestStructured = null;
    let bestStructuredScore = 0;

    for (const container of structuralCandidates) {
      const question = parseGenericQuizContainer(container);
      if (!question) continue;

      const score = scoreQuestionCandidate(question);
      if (score > bestStructuredScore) {
        bestStructuredScore = score;
        bestStructured = question;
      }
    }

    if (bestStructured) return bestStructured;

    // Strategy 4: common quiz container patterns
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

    const candidates = collectCandidateContainers(quizSelectors);
    let bestQuestion = null;
    let bestScore = 0;

    for (const container of candidates) {
      const question = parseGenericQuizContainer(container);
      if (!question) continue;

      const score = scoreQuestionCandidate(question);
      if (score > bestScore) {
        bestScore = score;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  function parseAkaJobCodingQuestion() {
    if (!isAkaJobSkillupPage()) return null;

    const codingEditor = document.querySelector('#monaco-editor, ngx-monaco-editor, .monaco-editor');
    if (!codingEditor) return null;

    const questionContainer = document.querySelector('.question-content-container, .task-que-wrap');
    if (!questionContainer) return null;

    const questionNode = questionContainer.querySelector('.para-small-code, .para-big, p') || questionContainer;
    const question = normalizeText(questionNode.textContent || '');
    if (!question || isLikelyNavigationText(question)) return null;

    const language = getAkaJobCodingLanguage();
    const starterCode = extractAkaJobStarterCode();
    const progress = getAkaJobQuestionProgress();
    if (progress) {
      akajobCurrentQuestionNumber = progress.current;
      akajobTotalQuestions = progress.total;
    }

    return {
      question,
      options: [],
      optionElements: [],
      questionType: 'coding',
      element: questionContainer.closest('.left.pane') || questionContainer,
      questionTextElement: questionContainer,
      source: 'akajob_coding',
      language,
      starterCode,
      codingEditorElement: codingEditor
    };
  }

  function getAkaJobCodingLanguage() {
    const select = document.querySelector('#langChange');
    if (!select) return 'Java';

    const selectedOption = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    const label = normalizeText(selectedOption?.textContent || select.value || 'Java');
    return label || 'Java';
  }

  function extractAkaJobStarterCode() {
    const viewLines = Array.from(document.querySelectorAll('#monaco-editor .view-lines .view-line'));
    if (viewLines.length > 0) {
      const lines = viewLines.map((line) => {
        const text = line.textContent || '';
        return text.replace(/\u00a0/g, ' ');
      });
      const combined = lines.join('\n').trimEnd();
      if (combined) return combined;
    }

    const inputArea = document.querySelector('#monaco-editor textarea.inputarea');
    const inputValue = normalizeText(inputArea?.value || '');
    if (inputValue) return inputValue;

    return '';
  }

  function parseHarvardManageMentorQuestion() {
    const blocks = Array.from(document.querySelectorAll('section[class*="assmt_activity__question-block"]'));
    if (blocks.length === 0) return null;

    const activeBlock = blocks.find((block) => isElementVisible(block)) || blocks[0];
    if (!activeBlock) return null;

    const questionLegend = activeBlock.querySelector('legend[class*="assmt_activity__question-content-entry"], legend[aria-label]');
    const ariaQuestion = normalizeText(questionLegend?.getAttribute('aria-label') || '');
    const textQuestion = normalizeText(questionLegend?.textContent || '');
    const question = sanitizeQuestionFromPrompt(ariaQuestion || textQuestion, []);

    if (!question || isQuestionPlaceholder(question) || isLikelyNavigationText(question)) {
      return null;
    }

    const inputs = Array.from(activeBlock.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
    if (inputs.length < 2) return null;

    const options = [];
    const optionElements = [];
    const seen = new Set();

    inputs.forEach((input, index) => {
      const label = findLabelForInputInBlock(activeBlock, input);
      const answerTextNode = label?.querySelector('[class*="choice-answer-text"], p, span');
      let optionText = normalizeText(answerTextNode?.textContent || label?.textContent || input.getAttribute('aria-label') || '');

      if (!optionText || isUselessOptionText(optionText)) {
        optionText = `Option ${optionLetter(index)}`;
      }

      if (!optionText || isLikelyNavigationText(optionText) || isQuestionMetaText(optionText)) return;

      const dedupeKey = optionText.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      options.push(optionText);
      optionElements.push(label || input.parentElement || input);
    });

    if (options.length < 2) return null;

    const hasCheckbox = inputs.some((input) => (input.type || '').toLowerCase() === 'checkbox');

    return {
      question,
      options,
      optionElements,
      questionType: hasCheckbox ? 'multiple_select' : 'multiple_choice',
      element: activeBlock,
      source: 'harvard_manage_mentor'
    };
  }

  function parseAkaJobSkillupQuestion() {
    if (!isAkaJobSkillupPage()) return null;

    const questionContainer = document.querySelector('.question-content-container');
    if (!questionContainer) return null;

    const questionNode = questionContainer.querySelector('.para-big, p') || questionContainer;
    const question = normalizeText(questionNode.textContent || '');
    if (!question || isQuestionPlaceholder(question) || isLikelyNavigationText(question)) return null;

    const optionItems = Array.from(document.querySelectorAll('.ans-option-wrap .list-block li'));
    if (optionItems.length < 2) return null;

    const options = [];
    const optionElements = [];
    const seen = new Set();

    optionItems.forEach((item, index) => {
      const label = item.querySelector('label') || item;
      let text = normalizeText(label.textContent || '');
      if (!text || isUselessOptionText(text)) {
        text = `Option ${optionLetter(index)}`;
      }

      if (!text || isLikelyNavigationText(text) || isQuestionMetaText(text)) return;
      const key = text;
      if (seen.has(key)) return;
      seen.add(key);

      options.push(text);
      optionElements.push(item);
    });

    if (options.length < 2) return null;

    const hasCheckbox = optionItems.some((item) => {
      const input = item.querySelector('input[type="checkbox"]');
      return !!input;
    });

    const progress = getAkaJobQuestionProgress();
    if (progress) {
      akajobCurrentQuestionNumber = progress.current;
      akajobTotalQuestions = progress.total;
    }

    return {
      question,
      options,
      optionElements,
      questionType: hasCheckbox ? 'multiple_select' : 'multiple_choice',
      element: questionContainer.closest('.row') || questionContainer.closest('.que-wrap') || questionContainer,
      questionTextElement: questionContainer,
      visualOptions: hasVisualContent(questionContainer),
      source: 'akajob_skillup'
    };
  }

  function findLabelForInputInBlock(block, input) {
    if (!block || !input) return null;

    if (input.id) {
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(input.id) : input.id.replace(/"/g, '\\"');
      const byFor = block.querySelector(`label[for="${escapedId}"]`);
      if (byFor) return byFor;
    }

    return input.closest('label') || input.parentElement;
  }

  function parseLinkedInLearningQuestion() {
    if (!/linkedin\.com\/learning/i.test(location.href)) return null;

    const exact = parseLinkedInChapterQuizExact();
    if (exact) return exact;

    const anchors = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3'))
      .filter(el => isElementVisible(el))
      .filter(el => /question\s+\d+\s+of\s+\d+/i.test(normalizeText(el.textContent)));

    for (const anchor of anchors) {
      let node = anchor;
      for (let depth = 0; depth < 8 && node; depth += 1) {
        node = node.parentElement;
        if (!node) break;

        const candidate = parseGenericQuizContainer(node);
        if (!candidate || candidate.options.length < 2) continue;

        const linkedInText = extractLinkedInQuestionText(node, candidate.options);
        if (linkedInText) {
          candidate.question = linkedInText;
        }

        candidate.question = sanitizeQuestionFromPrompt(candidate.question, candidate.options);
        if (candidate.question && candidate.question.length >= 8) {
          return candidate;
        }
      }
    }

    return null;
  }

  function parseLinkedInChapterQuizExact() {
    if (!/linkedin\.com\/learning/i.test(location.href)) return null;

    const questionBlocks = Array.from(document.querySelectorAll('.chapter-quiz-question[data-live-test-chapter-quiz-question]'));
    if (questionBlocks.length === 0) return null;

    let activeBlock = questionBlocks.find((block) => {
      if (!isElementVisible(block)) return false;
      const rect = block.getBoundingClientRect();
      return rect.height > 120 && rect.bottom > 0;
    }) || questionBlocks[0];

    if (!activeBlock) return null;

    const questionEl = activeBlock.querySelector('.chapter-quiz-question__question-text .chapter-quiz-question__display-content-text');
    const question = normalizeText(questionEl?.textContent || '');

    const optionInputs = Array.from(activeBlock.querySelectorAll('.chapter-quiz-question__options input[type="radio"], .chapter-quiz-question__options input[type="checkbox"]'));
    const optionContainerSet = new Set();
    optionInputs.forEach((input) => {
      const container = input.closest('.exam-options__option-container, .exam-option, li, label') || input.parentElement;
      if (container) optionContainerSet.add(container);
    });

    if (optionContainerSet.size === 0) {
      activeBlock.querySelectorAll('.chapter-quiz-question__options .exam-options__option-container, .chapter-quiz-question__options .exam-option, .chapter-quiz-question__options label').forEach((el) => {
        optionContainerSet.add(el);
      });
    }

    const optionContainers = Array.from(optionContainerSet);
    const options = [];
    const optionElements = [];
    const visualHints = [];
    let usedPlaceholderOption = false;

    optionContainers.forEach((container, index) => {
      const rich = extractOptionTextFromContainerRich(container, index);
      let text = normalizeText(rich.text || '');
      if (!text || isUselessOptionText(text)) {
        text = `Image option ${optionLetter(index)}`;
        usedPlaceholderOption = true;
      }
      if (!text || isLikelyNavigationText(text) || isUselessOptionText(text)) return;
      options.push(text);
      optionElements.push(container);
      if (rich.visualHint) {
        visualHints.push(`${optionLetter(options.length - 1)}: ${rich.visualHint}`);
      }
    });

    const hasCheckbox = optionInputs.some((input) => (input.type || '').toLowerCase() === 'checkbox');

    if (!question || options.length < 2) return null;

    const visualOptions = usedPlaceholderOption || optionElements.some((el) => hasVisualContent(el));

    return {
      question,
      options,
      optionElements,
      questionType: hasCheckbox ? 'multiple_select' : 'multiple_choice',
      element: activeBlock,
      source: 'linkedin_exact',
      visualOptions,
      visualHints
    };
  }

  function optionLetter(index) {
    return String.fromCharCode(65 + index);
  }

  function hasVisualContent(element) {
    if (!element || typeof element.querySelector !== 'function') return false;
    return !!element.querySelector('img, svg, canvas, table, [style*="background"], [class*="image"], [class*="diagram"]');
  }

  function extractOptionTextFromContainerRich(container, optionIndex) {
    if (!container) {
      return { text: '', visualHint: '' };
    }

    const labelText = normalizeText(container.querySelector('.exam-option__label-text')?.textContent || '');
    if (labelText) {
      return { text: labelText, visualHint: '' };
    }

    const table = container.querySelector('table');
    if (table) {
      const description = describeTableVisual(table);
      if (description) {
        return {
          text: `Option ${optionLetter(optionIndex)}: ${description}`,
          visualHint: description
        };
      }
    }

    const altText = Array.from(container.querySelectorAll('img'))
      .map((img) => normalizeText(img.alt || img.getAttribute('aria-label') || ''))
      .filter(Boolean)
      .join(' | ');
    if (altText) {
      return { text: altText, visualHint: altText };
    }

    const generic = normalizeText(container.textContent || '');
    if (generic && !isUselessOptionText(generic)) {
      return { text: generic, visualHint: '' };
    }

    if (hasVisualContent(container)) {
      const placeholder = `Image option ${optionLetter(optionIndex)}`;
      return { text: placeholder, visualHint: placeholder };
    }

    return { text: '', visualHint: '' };
  }

  function describeTableVisual(table) {
    if (!table || !table.rows || table.rows.length === 0) return '';

    const rows = table.rows.length;
    const cols = table.rows[0].cells ? table.rows[0].cells.length : 0;
    if (cols === 0) return '';

    const highlightedRows = [];
    const highlightedCols = [];
    let highlightedCells = 0;

    const cellMatrix = [];
    for (let r = 0; r < rows; r += 1) {
      const row = table.rows[r];
      const rowStates = [];
      for (let c = 0; c < cols; c += 1) {
        const cell = row.cells[c];
        const highlighted = isCellHighlighted(cell);
        rowStates.push(highlighted);
        if (highlighted) highlightedCells += 1;
      }
      cellMatrix.push(rowStates);
    }

    for (let r = 0; r < rows; r += 1) {
      const count = cellMatrix[r].filter(Boolean).length;
      if (count >= Math.max(1, Math.floor(cols * 0.8))) {
        highlightedRows.push(r + 1);
      }
    }

    for (let c = 0; c < cols; c += 1) {
      let count = 0;
      for (let r = 0; r < rows; r += 1) {
        if (cellMatrix[r][c]) count += 1;
      }
      if (count >= Math.max(1, Math.floor(rows * 0.8))) {
        highlightedCols.push(c + 1);
      }
    }

    const totalCells = rows * cols;
    if (highlightedCells >= totalCells * 0.9) {
      return `${rows}x${cols} table with all cells highlighted`;
    }
    if (highlightedRows.length === 1 && highlightedCols.length === 0) {
      return `${rows}x${cols} table with row ${highlightedRows[0]} highlighted`;
    }
    if (highlightedCols.length === 1 && highlightedRows.length === 0) {
      return `${rows}x${cols} table with column ${highlightedCols[0]} highlighted`;
    }
    if (highlightedCells === 1) {
      return `${rows}x${cols} table with one highlighted cell`;
    }
    if (highlightedRows.length > 1) {
      return `${rows}x${cols} table with multiple highlighted rows`;
    }
    if (highlightedCols.length > 1) {
      return `${rows}x${cols} table with multiple highlighted columns`;
    }
    if (highlightedCells > 0) {
      return `${rows}x${cols} table with ${highlightedCells} highlighted cells`;
    }

    return `${rows}x${cols} table with no highlighted cells`;
  }

  function isCellHighlighted(cell) {
    if (!cell) return false;
    const style = window.getComputedStyle(cell);
    const background = (style.backgroundColor || '').toLowerCase();
    if (!background || background === 'transparent' || background === 'rgba(0, 0, 0, 0)') {
      return false;
    }

    if (background.includes('255, 255, 255') || background.includes('248, 248, 248')) {
      return false;
    }

    return true;
  }

  function isUselessOptionText(text) {
    const normalized = normalizeText(text).toLowerCase();
    return !normalized ||
      normalized === 'on' ||
      normalized === 'off' ||
      normalized === 'true' ||
      normalized === 'false' ||
      normalized === 'option' ||
      normalized === 'choice' ||
      normalized === 'answer';
  }

  function extractLinkedInQuestionText(container, optionTexts = []) {
    if (!container) return '';

    const rawText = container.innerText || container.textContent || '';
    const lines = rawText
      .split(/\n+/)
      .map(line => normalizeText(line))
      .filter(Boolean)
      .slice(0, 120);

    if (lines.length === 0) return '';

    const optionSet = new Set((optionTexts || []).map(opt => normalizeText(opt).toLowerCase()).filter(Boolean));
    const metaIdx = lines.findIndex(line => /question\s+\d+\s+of\s+\d+/i.test(line));
    const startIdx = metaIdx >= 0 ? metaIdx + 1 : 0;

    for (let i = startIdx; i < lines.length; i += 1) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (optionSet.has(lower)) break;
      if (looksLikeOptionLine(line)) break;
      if (isQuestionMetaText(line) || isNoiseText(line)) continue;
      if (line.length < 4) continue;

      return line;
    }

    return '';
  }

  function collectStructuralQuizContainers() {
    const anchors = getOptionAnchors(document).filter(isElementVisible).slice(0, 120);
    const containers = [];
    const seen = new Set();

    function addContainer(node) {
      if (!node || seen.has(node)) return;
      seen.add(node);
      containers.push(node);
    }

    anchors.forEach((anchor) => {
      let node = anchor;
      for (let depth = 0; depth < 7 && node && node !== document.body; depth += 1) {
        node = node.parentElement;
        if (!node) break;

        const optionCount = getOptionAnchors(node).length;
        if (optionCount < 2 || optionCount > 12) continue;

        const textLength = normalizeText(node.innerText || node.textContent || '').length;
        if (textLength < 20 || textLength > 5000) continue;

        addContainer(node);
        break;
      }
    });

    return containers;
  }

  function collectCandidateContainers(selectors) {
    const containers = [];
    const seen = new Set();

    function addContainer(el) {
      if (!el || seen.has(el)) return;
      seen.add(el);
      containers.push(el);
    }

    collectStructuralQuizContainers().forEach(addContainer);

    const selection = window.getSelection();
    const selectedNode = selection && selection.anchorNode
      ? (selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode)
      : null;
    if (selectedNode && selectedNode.nodeType === Node.ELEMENT_NODE) {
      let node = selectedNode;
      for (let i = 0; i < 5 && node && node !== document.body; i += 1) {
        addContainer(node);
        node = node.parentElement;
      }
    }

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        addContainer(el);
      });
    });

    return containers;
  }

  function getOptionAnchors(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];

    const nodes = Array.from(root.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], [aria-checked], .option, .choice, .answer-option, .option-item, .choice-item, [class*="option-item"], [class*="choice-item"], [class*="answer-option"], [class*="option"]'));
    const unique = [];
    const seen = new Set();

    nodes.forEach((node) => {
      if (!isOptionLikeNode(node)) return;
      if (seen.has(node)) return;
      seen.add(node);
      unique.push(node);
    });

    return unique;
  }

  function isOptionLikeNode(node) {
    if (!node) return false;

    const tag = (node.tagName || '').toLowerCase();
    if (tag === 'input') {
      const type = (node.type || '').toLowerCase();
      return type === 'radio' || type === 'checkbox';
    }

    const role = (node.getAttribute('role') || '').toLowerCase();
    if (role === 'radio' || role === 'option') return true;
    if (node.hasAttribute('aria-checked')) return true;

    const text = normalizeText(node.textContent || '');
    if (text.length < 2 || text.length > 260) return false;
    if (isQuestionMetaText(text) || isNoiseText(text)) return false;

    const classText = `${node.className || ''}`.toLowerCase();
    return classText.includes('option') || classText.includes('choice') || classText.includes('answer');
  }

  function scoreQuestionCandidate(question) {
    if (!question) return 0;

    let score = calculateQuestionConfidence(question);
    if (question.question && question.question.includes('?')) score += 0.2;
    if (Array.isArray(question.options) && question.options.length >= 3) score += 0.15;
    if (question.element && isElementVisible(question.element)) score += 0.2;
    if (isLikelyNavigationText(question.question)) score -= 0.5;

    if (Array.isArray(question.options) && question.options.length > 0) {
      const navCount = question.options.filter((opt) => isLikelyNavigationText(opt)).length;
      if (navCount > 0) {
        score -= Math.min(0.6, navCount * 0.15);
      }
    }

    return score;
  }

  function hasTrailingInlineChoices(text) {
    if (!text) return false;
    const qIndex = text.indexOf('?');
    if (qIndex < 0 || qIndex >= text.length - 2) return false;

    const trailing = normalizeText(text.slice(qIndex + 1));
    if (!trailing) return false;

    return trailing.split(' ').length >= 3;
  }

  function isWeakQuestionPayload(question) {
    if (!question || !question.question) return true;

    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    if (optionCount >= 2) return false;

    if (question.questionType === 'short_answer') return true;
    return hasTrailingInlineChoices(question.question);
  }

  function preferQuestionPayload(primary, fallback) {
    if (!primary) return fallback;
    if (!fallback) return primary;

    const primaryWeak = isWeakQuestionPayload(primary);
    const fallbackWeak = isWeakQuestionPayload(fallback);

    if (primaryWeak && !fallbackWeak) return fallback;
    if (!primaryWeak && fallbackWeak) return primary;

    const primaryScore = scoreQuestionCandidate(primary);
    const fallbackScore = scoreQuestionCandidate(fallback);

    if (fallbackScore > primaryScore + 0.1) return fallback;
    return primary;
  }

  function isElementVisible(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;

    return rect.bottom > 0 && rect.top < window.innerHeight * 1.2;
  }
  
  /**
   * Parse a generic quiz container
   */
  function parseGenericQuizContainer(container) {
    if (!container) return null;

    const root = normalizeQuizRoot(container);
    const options = [];
    const optionElements = [];
    const seenOptions = new Set();

    function pushOption(text, element) {
      const normalized = normalizeText(text);
      if (!normalized || normalized.length < 2 || normalized.length > 240) return;
      if (isQuestionMetaText(normalized)) return;
      if (isLikelyNavigationText(normalized)) return;
      if (seenOptions.has(normalized)) return;
      seenOptions.add(normalized);
      options.push(normalized);
      optionElements.push(element || container);
    }

    // Parse form inputs first (radio/checkbox based quizzes)
    root.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
      const option = extractOptionFromInput(input);
      if (option) pushOption(option.text, option.element);
    });

    // Parse aria radios that contain child labels/siblings
    root.querySelectorAll('[role="radio"]').forEach((radio) => {
      const optionText = extractOptionTextFromAriaRadio(radio);
      if (optionText) pushOption(optionText, radio);
    });

    // Fallback option patterns for custom quiz UIs
    root.querySelectorAll('input[type="radio"] + label, input[type="checkbox"] + label, .option, .choice, .answer-option, .option-item, .choice-item, [role="radio"], [role="option"], [class*="option-item"], [class*="choice-item"], [class*="answer-option"], [class*="option"]').forEach(el => {
      const optionText = normalizeText(el.textContent);
      pushOption(optionText, el);
    });

    const pruned = pruneAggregateOptions(options, optionElements);
    const cleanedOptions = pruned.options;
    const cleanedOptionElements = pruned.optionElements;

    if (cleanedOptions.length < 2) return null;

    const proximityText = extractQuestionByOptionProximity(root, cleanedOptionElements, cleanedOptions);
    const text = sanitizeQuestionFromPrompt(proximityText || extractQuestionTextFromContainer(root, cleanedOptions), cleanedOptions);
    if (!text || text.length < 5) return null;
    const hasCheckbox = root.querySelectorAll('input[type="checkbox"]').length > 1;
    
    return {
      question: text,
      options: cleanedOptions,
      optionElements: cleanedOptionElements,
      questionType: cleanedOptions.length > 0 ? (hasCheckbox ? 'multiple_select' : 'multiple_choice') : 'short_answer',
      element: root
    };
  }

  function normalizeQuizRoot(container) {
    let root = container;
    let current = container;
    for (let i = 0; i < 3 && current && current.parentElement; i += 1) {
      const parent = current.parentElement;
      const optionCount = parent.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"]').length;
      if (optionCount >= 2 && optionCount <= 20) {
        root = parent;
      }
      current = parent;
    }
    return root;
  }
  
  /**
   * Parse radio button question
   */
  function parseRadioQuestion(radioInputs) {
    const radios = Array.from(radioInputs);
    if (radios.length < 2) return null;

    const firstGroup = radios[0].name;
    let groupInputs = [];

    if (firstGroup) {
      groupInputs = radios.filter(input => input.name === firstGroup);
    } else {
      groupInputs = findLikelyRadioGroup(radios[0]);
    }

    if (groupInputs.length < 2) return null;
    
    const options = [];
    const optionElements = [];
    const seenOptions = new Set();
    
    groupInputs.forEach(input => {
      const option = extractOptionFromInput(input);
      if (option && !seenOptions.has(option.text)) {
        seenOptions.add(option.text);
        options.push(option.text);
        optionElements.push(option.element);
      }
    });
    
    if (options.length === 0) return null;

    const container = findCommonContainer(groupInputs) || groupInputs[0].parentElement;
    const questionText = extractQuestionTextFromContainer(container, options);
    
    return {
      question: questionText || 'Select the correct answer:',
      options,
      optionElements,
      questionType: 'multiple_choice',
      element: container || groupInputs[0].parentElement
    };
  }

  /**
   * Parse ARIA radio role options used by some UI frameworks.
   */
  function parseAriaRadioQuestion(ariaRadios) {
    const radios = Array.from(ariaRadios);
    if (radios.length < 2) return null;

    const options = [];
    const optionElements = [];
    const seenOptions = new Set();

    radios.forEach((radio) => {
      const text = extractOptionTextFromAriaRadio(radio);
      if (text && !seenOptions.has(text)) {
        seenOptions.add(text);
        options.push(text);
        optionElements.push(radio);
      }
    });

    if (options.length < 2) return null;

    const container = findCommonContainer(radios) || radios[0].parentElement;
    const questionText = extractQuestionTextFromContainer(container, options);

    return {
      question: questionText || 'Select the correct answer:',
      options,
      optionElements,
      questionType: 'multiple_choice',
      element: container || radios[0]
    };
  }

  function extractOptionTextFromAriaRadio(radio) {
    if (!radio) return '';

    const own = normalizeText(radio.textContent || radio.getAttribute('aria-label') || '');
    if (own && own.length > 1 && own.length < 240 && !isQuestionMetaText(own)) return own;

    const parent = radio.parentElement;
    if (!parent) return '';

    let best = '';
    parent.querySelectorAll('span, p, div, label, strong').forEach((el) => {
      const text = normalizeText(el.textContent);
      if (!text || text.length < 2 || text.length > 240) return;
      if (isQuestionMetaText(text)) return;
      if (text.length > best.length) best = text;
    });

    return best;
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeFollowUpPromptText(text) {
    return normalizeText(text || '').slice(0, 600);
  }

  function isQuestionMetaText(text) {
    return /^question\s+\d+\s+of\s+\d+/i.test(text) ||
      /^up next/i.test(text) ||
      /^(submit|next|previous|processing\.\.\.)$/i.test(text);
  }

  function findLikelyRadioGroup(seedInput) {
    if (!seedInput) return [];

    let container = seedInput.parentElement;
    while (container && container !== document.body) {
      const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
      if (radios.length >= 2 && radios.length <= 12) {
        return radios;
      }
      container = container.parentElement;
    }

    return [];
  }

  function extractOptionFromInput(input) {
    const wrappedLabel = input.closest('label');
    if (wrappedLabel) {
      const text = normalizeText(wrappedLabel.textContent);
      if (text.length > 1) return { text, element: wrappedLabel };
    }

    if (input.id) {
      const linkedLabel = document.querySelector(`label[for="${input.id}"]`);
      if (linkedLabel) {
        const text = normalizeText(linkedLabel.textContent);
        if (text.length > 1) return { text, element: linkedLabel };
      }
    }

    const ariaText = normalizeText(input.getAttribute('aria-label') || input.getAttribute('title') || input.value);
    if (ariaText.length > 1 && ariaText.length < 240) {
      return { text: ariaText, element: input.parentElement || input };
    }

    const row = input.closest('label, li, [role="radio"], [role="option"], .option, .choice, .answer-option, [class*="option-item"], [class*="choice-item"], [class*="answer-option"], [class*="option"], [class*="choice"]') || input.parentElement;
    if (!row) return null;

    let best = '';
    row.querySelectorAll('span, p, div, strong, em, label').forEach((el) => {
      const text = normalizeText(el.textContent);
      if (text.length > best.length && text.length > 1 && text.length < 240) {
        best = text;
      }
    });

    if (!best) {
      best = normalizeText(row.textContent);
    }

    if (!best || best.length < 2 || best.length > 240) return null;
    return { text: best, element: row };
  }

  function pruneAggregateOptions(options, optionElements) {
    if (!Array.isArray(options) || options.length <= 1) {
      return { options: options || [], optionElements: optionElements || [] };
    }

    const keepIndexes = [];

    options.forEach((opt, idx) => {
      const normalized = normalizeText(opt);
      if (!normalized) return;
      if (isLikelyNavigationText(normalized)) return;

      const lower = normalized.toLowerCase();
      let containsOthers = 0;

      options.forEach((other, j) => {
        if (idx === j) return;
        const otherNorm = normalizeText(other).toLowerCase();
        if (!otherNorm || otherNorm.length < 6) return;
        if (lower.includes(otherNorm)) {
          containsOthers += 1;
        }
      });

      const isAggregate = containsOthers >= 2 || (normalized.length > 120 && containsOthers >= 1);
      if (!isAggregate) {
        keepIndexes.push(idx);
      }
    });

    if (keepIndexes.length < 2) {
      return { options, optionElements };
    }

    return {
      options: keepIndexes.map(i => options[i]),
      optionElements: keepIndexes.map(i => optionElements[i])
    };
  }

  function extractQuestionByOptionProximity(container, optionElements, optionTexts = []) {
    if (!container || !Array.isArray(optionElements) || optionElements.length === 0) return '';

    const optionSet = new Set((optionTexts || []).map((text) => normalizeText(text).toLowerCase()).filter(Boolean));
    const firstOption = optionElements.find(Boolean);
    if (!firstOption || typeof firstOption.getBoundingClientRect !== 'function') return '';

    const firstRect = firstOption.getBoundingClientRect();
    const firstTop = firstRect.top;

    const candidates = Array.from(container.querySelectorAll('h1, h2, h3, h4, p, legend, div, span, [class*="question"], [data-test*="question"]'))
      .filter((el) => el && typeof el.getBoundingClientRect === 'function')
      .map((el) => ({
        el,
        text: normalizeText(el.textContent),
        rect: el.getBoundingClientRect()
      }))
      .filter((item) => item.text.length > 8 && item.text.length < 320)
      .filter((item) => !optionSet.has(item.text.toLowerCase()))
      .filter((item) => !isQuestionMetaText(item.text) && !isNoiseText(item.text) && !isLikelyNavigationText(item.text))
      .filter((item) => item.rect.bottom <= firstTop + 6)
      .filter((item) => firstTop - item.rect.bottom < 280);

    if (candidates.length === 0) return '';

    const withMark = candidates.filter((item) => item.text.includes('?'));
    const pool = withMark.length > 0 ? withMark : candidates;

    pool.sort((a, b) => {
      const gapA = firstTop - a.rect.bottom;
      const gapB = firstTop - b.rect.bottom;
      return gapA - gapB;
    });

    return pool[0]?.text || '';
  }

  function findCommonContainer(elements) {
    if (!elements || elements.length === 0) return null;

    const chains = elements.map((el) => {
      const chain = [];
      let current = el;
      while (current) {
        chain.push(current);
        current = current.parentElement;
      }
      return chain;
    });

    for (const candidate of chains[0]) {
      if (chains.every(chain => chain.includes(candidate))) {
        return candidate;
      }
    }

    return elements[0].parentElement || null;
  }

  function extractQuestionTextFromContainer(container, optionTexts = []) {
    if (!container) return 'Select the correct answer:';

    const optionSet = new Set(optionTexts.map(text => normalizeText(text).toLowerCase()));
    const candidates = Array.from(container.querySelectorAll('h1, h2, h3, h4, p, legend, span, div, [class*="question"], [data-test*="question"]'))
      .map(el => normalizeText(el.textContent))
      .filter(text => text.length > 8 && text.length < 260)
      .filter(text => !optionSet.has(text.toLowerCase()) && !isQuestionMetaText(text) && !isNoiseText(text));

    const lineCandidates = extractQuestionLines(container, optionSet);
    lineCandidates.forEach((line) => {
      if (!candidates.includes(line)) {
        candidates.push(line);
      }
    });

    if (candidates.length === 0) {
      return 'Select the correct answer:';
    }

    const withQuestionMark = candidates.find(text => text.includes('?'));
    if (withQuestionMark) return withQuestionMark;

    candidates.sort((a, b) => b.length - a.length);
    return candidates[0];
  }

  function extractQuestionLines(container, optionSet) {
    const raw = container?.innerText || container?.textContent || '';
    if (!raw) return [];

    const lines = raw
      .split(/\n+/)
      .map(line => normalizeText(line))
      .filter(Boolean)
      .slice(0, 80);

    if (lines.length === 0) return [];

    const firstOptionIndex = lines.findIndex((line) => {
      const lower = line.toLowerCase();
      return optionSet.has(lower) || looksLikeOptionLine(line);
    });

    const scanRange = firstOptionIndex > 0 ? lines.slice(0, firstOptionIndex) : lines.slice(0, Math.min(lines.length, 12));
    return scanRange
      .filter(line => line.length > 6 && line.length < 260)
      .filter(line => !optionSet.has(line.toLowerCase()))
      .filter(line => !isQuestionMetaText(line))
      .filter(line => !isNoiseText(line));
  }

  function looksLikeOptionLine(text) {
    if (!text) return false;
    return /^(?:[A-Ha-h]|\d{1,2})[\)\.:-]\s+/.test(text);
  }

  function isNoiseText(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return true;

    return normalized === 'question:' ||
      normalized === 'options:' ||
      normalized === 'incorrect' ||
      normalized === 'correct' ||
      normalized === 'submit' ||
      normalized === 'replay' ||
      normalized.startsWith('select another answer') ||
      normalized.startsWith('review this video');
  }

  function isLikelyNavigationText(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return true;

    return normalized === 'home' ||
      normalized === 'settings' ||
      normalized === 'get help' ||
      normalized === 'help' ||
      normalized === 'sign out' ||
      normalized === 'my content' ||
      normalized === 'my career plan' ||
      normalized.includes('notifications total') ||
      normalized.includes('copy course link') ||
      normalized.includes('learners') ||
      normalized.includes('popular') ||
      normalized.includes('up next') ||
      normalized.includes('chapter quiz') ||
      normalized.includes('course') ||
      normalized.startsWith('chapter ') ||
      normalized.includes('programming foundations');
  }

  function sanitizeQuestionFromPrompt(questionText, optionTexts = []) {
    const normalized = normalizeText(questionText);
    if (!normalized) return '';

    const optionSet = new Set((optionTexts || []).map(opt => normalizeText(opt).toLowerCase()).filter(Boolean));
    let text = normalized;

    const qIndex = text.indexOf('?');
    if (qIndex >= 0) {
      text = text.slice(0, qIndex + 1);
    }

    text = text
      .split(/\s{2,}/)
      .filter(chunk => {
        const low = normalizeText(chunk).toLowerCase();
        return low && !optionSet.has(low);
      })
      .join(' ')
      .trim();

    if (text.length < 8) {
      return normalized;
    }

    return text;
  }

  function ensureQuestionText(question) {
    if (!question) return null;

    let questionText = normalizeText(question.question);
    if (questionText && questionText.length >= 3) {
      question.question = questionText;
      return question;
    }

    if (question.element) {
      const linkedText = extractLinkedInQuestionText(question.element, question.options || []);
      if (linkedText) {
        question.question = linkedText;
        return question;
      }
    }

    const detected = detectQuiz();
    if (detected && detected.question && normalizeText(detected.question).length >= 3) {
      question.question = normalizeText(detected.question);
      if ((!question.options || question.options.length < 2) && detected.options && detected.options.length >= 2) {
        question.options = detected.options;
        question.optionElements = detected.optionElements;
        question.questionType = detected.questionType;
      }
      return question;
    }

    question.question = 'Could not detect question text. Try selecting the question sentence and options, then run again.';
    return question;
  }

  function postProcessQuestionPayload(question) {
    if (!question) return question;

    const normalizedQuestion = normalizeText(question.question || '');
    let cleanedQuestion = normalizedQuestion;

    if (isLikelyNavigationText(cleanedQuestion) || !cleanedQuestion || cleanedQuestion.length < 6) {
      const fromProximity = extractQuestionByOptionProximity(question.element, question.optionElements || [], question.options || []);
      if (fromProximity && !isLikelyNavigationText(fromProximity)) {
        cleanedQuestion = fromProximity;
      }
    }

    const pruned = pruneAggregateOptions(question.options || [], question.optionElements || []);
    question.options = pruned.options;
    question.optionElements = pruned.optionElements;

    question.question = cleanedQuestion || question.question;
    return question;
  }

  function isQuestionPlaceholder(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return true;
    return normalized === 'question:' ||
      normalized === 'select the correct answer:' ||
      normalized.startsWith('could not detect question text');
  }

  function shouldAttemptAIFallback(question) {
    if (!hasValidApiKey()) return false;
    if (Date.now() < aiRecoveryCooldownUntil) return false;

    if (question && question.questionType === 'coding') return false;

    if (!question) return true;

    const hasQuestion = !!normalizeText(question.question);
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    const hasChoiceUI = getOptionAnchors(document).filter(isElementVisible).length >= 2;
    const likelyMultiple = question.questionType === 'multiple_choice' || question.questionType === 'multiple_select' || hasChoiceUI;

    if (!hasQuestion || isQuestionPlaceholder(question.question)) return true;
    if (likelyMultiple && optionCount < 2) return true;
    return false;
  }

  async function recoverQuestionWithAIFallback(question) {
    if (!hasValidApiKey()) return null;
    if (extensionContextLost) return null;

    aiRecoveryCooldownUntil = Date.now() + 5000;

    const snapshot = buildDomSnapshot(question?.element || null, question?.options || []);
    if (!snapshot) return null;

    try {
      const response = await sendRuntimeMessage({
        action: 'parseQuestionFromDOM',
        snapshot,
        hintQuestion: normalizeText(question?.question || ''),
        hintOptions: Array.isArray(question?.options) ? question.options : []
      });

      if (!response || response.error) return null;

      const validated = validateRecoveredQuestion(response);
      if (!validated) return null;

      const optionElements = findOptionElementsByText(validated.options);
      const resolved = {
        question: validated.question,
        options: validated.options,
        optionElements,
        questionType: validated.questionType,
        element: question?.element || findCommonContainer(optionElements.filter(Boolean)) || null
      };

      console.log('[AI Translator] AI parser recovered question payload:', {
        question: resolved.question,
        optionsCount: resolved.options.length,
        questionType: resolved.questionType,
        confidence: validated.confidence
      });

      return resolved;
    } catch (error) {
      handleContextInvalidation(error);
      return null;
    }
  }

  function buildDomSnapshot(focusElement, knownOptions = []) {
    const blocks = collectContextBlocks(focusElement);
    const selectionText = normalizeText(getSelectedText() || '');

    const lines = [];
    lines.push(`URL: ${location.href}`);
    lines.push(`TITLE: ${normalizeText(document.title || '')}`);
    if (selectionText) {
      lines.push('SELECTION:');
      lines.push(selectionText);
    }
    if (knownOptions.length > 0) {
      lines.push('KNOWN OPTIONS:');
      knownOptions.slice(0, 8).forEach((option, index) => {
        lines.push(`${String.fromCharCode(65 + index)}. ${normalizeText(option)}`);
      });
    }

    blocks.slice(0, 4).forEach((block, index) => {
      lines.push(`BLOCK ${index + 1}:`);
      lines.push(block);
    });

    const snapshot = lines.join('\n').trim();
    if (!snapshot) return '';

    return snapshot.length > 5000 ? snapshot.slice(0, 5000) : snapshot;
  }

  function collectContextBlocks(focusElement) {
    const candidates = [];
    const seen = new Set();

    function addCandidate(node) {
      if (!node || seen.has(node)) return;
      seen.add(node);

      const compact = extractCompactText(node, 40);
      if (compact && compact.length >= 40) {
        candidates.push(compact);
      }
    }

    if (focusElement) {
      let node = focusElement;
      for (let i = 0; i < 5 && node && node !== document.body; i += 1) {
        addCandidate(node);
        node = node.parentElement;
      }
    }

    collectStructuralQuizContainers().slice(0, 8).forEach(addCandidate);

    const mainEl = document.querySelector('main, article, [role="main"]');
    if (mainEl) addCandidate(mainEl);

    return candidates;
  }

  function extractCompactText(element, maxLines = 40) {
    if (!element) return '';

    const raw = element.innerText || element.textContent || '';
    if (!raw) return '';

    const lines = raw
      .split(/\n+/)
      .map(line => normalizeText(line))
      .filter(Boolean)
      .filter(line => !isNoiseText(line))
      .slice(0, maxLines);

    const compact = lines.join('\n');
    if (compact.length > 2500) {
      return compact.slice(0, 2500);
    }

    return compact;
  }

  function validateRecoveredQuestion(parsed) {
    if (!parsed) return null;

    const question = normalizeText(parsed.question || '');
    const options = (Array.isArray(parsed.options) ? parsed.options : [])
      .map(opt => normalizeText(opt))
      .filter(Boolean)
      .filter(opt => !isNoiseText(opt));

    const uniqueOptions = [];
    const seen = new Set();
    options.forEach((option) => {
      const key = option.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      uniqueOptions.push(option);
    });

    if (!question || question.length < 5 || isQuestionPlaceholder(question)) return null;
    if (uniqueOptions.length < 2 || uniqueOptions.length > 12) return null;

    const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0.5;
    const questionType = parsed.questionType === 'multiple_select' ? 'multiple_select' : 'multiple_choice';

    return {
      question,
      options: uniqueOptions,
      questionType,
      confidence
    };
  }

  function findOptionElementsByText(options) {
    const anchors = getOptionAnchors(document).filter(isElementVisible);
    if (!Array.isArray(options) || options.length === 0 || anchors.length === 0) {
      return [];
    }

    const used = new Set();

    return options.map((optionText) => {
      const target = normalizeText(optionText).toLowerCase();
      if (!target) return null;

      let bestIndex = -1;
      let bestScore = 0;

      anchors.forEach((anchor, index) => {
        if (used.has(index)) return;

        const text = normalizeText(anchor.textContent || anchor.getAttribute('aria-label') || '').toLowerCase();
        if (!text) return;

        let score = 0;
        if (text === target) score = 1;
        else if (text.includes(target)) score = 0.88;
        else if (target.includes(text)) score = 0.78;

        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      if (bestIndex >= 0 && bestScore >= 0.78) {
        used.add(bestIndex);
        const anchor = anchors[bestIndex];
        return anchor.closest('label, li, [role="radio"], [role="option"], [class*="option"], [class*="choice"], [class*="answer"]') || anchor;
      }

      return null;
    });
  }
  
  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    createHiddenUI();

    if (!sidebarElement) {
      console.log('[AI Translator] toggleSidebar called but sidebarElement is null');
      return;
    }
    
    sidebarVisible = !sidebarVisible;
    console.log('[AI Translator] toggleSidebar, visible:', sidebarVisible);
    
    if (sidebarVisible) {
      sidebarPinned = false;
      showSidebarStealth({ ghostDelay: 1400 });
      logSidebarRect('toggle');
      console.log('[AI Translator] Sidebar shown');
      syncSidebarSettingsUIFromState();
      
      // Manual mode: only use currently selected text when opening sidebar.
      const selectedQuestion = getQuestionFromSelection();
      const detectedQuestion = detectQuiz();
      currentQuestion = preferQuestionPayload(selectedQuestion, detectedQuestion) || currentQuestion;
      currentQuestion = ensureQuestionText(currentQuestion);

      if (currentQuestion && currentQuestion.source === 'harvard_manage_mentor' && isQuestionPlaceholder(currentQuestion.question)) {
        const legendNode = currentQuestion.element?.querySelector('legend[class*="assmt_activity__question-content-entry"], legend[aria-label]');
        const hardQuestion = normalizeText(legendNode?.getAttribute('aria-label') || legendNode?.textContent || '');
        if (hardQuestion) currentQuestion.question = hardQuestion;
      }

        if (currentQuestion) {
          updateAkaJobProgressFromQuestion(currentQuestion);
          updateHarvardProgressFromQuestion(currentQuestion);
          updateSidebarWithQuestion(currentQuestion);
          if (settings?.autoDetect === true) {
            scheduleQuizProgressRefresh(200);
            scheduleHarvardPrefetch(300);
            scheduleAkaJobPrefetch(300);
          }
        }
      
      scheduleSidebarStealthCycle({ ghostDelay: 1500 });
    } else {
      sidebarPinned = false;
      hideSidebar();
    }
  }
  
  /**
   * Hide sidebar
   */
  function hideSidebar() {
    if (!sidebarElement) return;
    
    sidebarVisible = false;
    sidebarPinned = false;
    sidebarPointerInside = false;
    sidebarFocusInside = false;
    clearSidebarStealthTimers();
    hideHoverHintTooltip();
    sidebarElement.style.transform = 'translateX(20px)';
    sidebarElement.style.filter = 'none';
    Stealth.stealthHide(sidebarElement);
  }

  function forceSidebarIntoViewport() {
    if (!sidebarElement) return;

    sidebarElement.style.zIndex = '2147483647';
    sidebarElement.style.right = '0';
    sidebarElement.style.top = '0';
    sidebarElement.style.width = 'min(360px, 88vw)';
    sidebarElement.style.height = '100vh';
    sidebarElement.style.maxWidth = '100vw';
    sidebarElement.style.maxHeight = '100vh';

    const rect = sidebarElement.getBoundingClientRect();
    if (rect.width < 120 || rect.right <= 0 || rect.left >= window.innerWidth) {
      sidebarElement.style.right = '16px';
      sidebarElement.style.top = '16px';
      sidebarElement.style.height = 'calc(100vh - 32px)';
      sidebarElement.style.borderRadius = '10px';
    }
  }

  function logSidebarRect(source) {
    if (!sidebarElement) return;
    const rect = sidebarElement.getBoundingClientRect();
    console.log('[AI Translator] Sidebar rect [' + source + ']:', {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }
  
  /**
   * Hide all UI instantly
   */
  function hideAllUI() {
    hideSidebar();
  }
  
  /**
   * Update sidebar with current question
   */
  function updateSidebarWithQuestion(question) {
    const questionEl = sidebarElement?.querySelector('#sidebar-question');
    const optionsEl = sidebarElement?.querySelector('#sidebar-options');

    clearHoverHintBindings();
    
    if (questionEl && question) {
      questionEl.innerHTML = `<h4 style="font-size: 12px; color: #666; margin-bottom: 6px;">Question:</h4><p style="font-size: 14px; font-weight: 500;">${escapeHtml(question.question)}</p>`;
    }
    
    if (optionsEl && question && question.questionType === 'coding') {
      optionsEl.innerHTML = '<h4 style="font-size: 12px; color: #666; margin-bottom: 8px;">Coding Task:</h4>' +
        `<div style="padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; font-size: 13px;">Language: <strong>${escapeHtml(question.language || getAkaJobCodingLanguage())}</strong></div>` +
        '<div style="padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; font-size: 13px; color: #555;">This question requires code output, not A/B/C/D option matching.</div>';
    } else if (optionsEl && question && question.options) {
      optionsEl.innerHTML = '<h4 style="font-size: 12px; color: #666; margin-bottom: 8px;">Options:</h4>' + 
        question.options.map((opt, i) => 
          `<div style="padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; font-size: 13px;">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</div>`
        ).join('');
    }
    
    // Reset result
    const resultEl = sidebarElement?.querySelector('#sidebar-result');
    if (resultEl) resultEl.style.display = 'none';

    const solved = getLatestSolvedResultForQuestion(question);
    if (solved && !solved.error) {
      attachHoverHintsForQuestion(question);
    }

    updateProgressBadge();
  }

  function updateProgressBadge() {
    const progressEl = sidebarElement?.querySelector('#sidebar-progress');
    if (!progressEl) return;

    const isLinkedIn = /linkedin\.com\/learning/i.test(location.href);
    const isHarvard = isHarvardManageMentorPage();
    const isAkaJob = isAkaJobSkillupPage();

    if (!isLinkedIn && !isHarvard && !isAkaJob) {
      progressEl.style.display = 'none';
      return;
    }

    if (isLinkedIn) {
      const latest = getLinkedInQuestionProgress();
      if (latest) {
        sessionCurrentQuestionNumber = latest.current || sessionCurrentQuestionNumber;
        sessionTotalQuestions = latest.total || sessionTotalQuestions;
      }
    } else if (isHarvard) {
      const latest = getHarvardQuestionProgress();
      if (latest) {
        harvardCurrentQuestionNumber = latest.current;
        harvardTotalQuestions = latest.total;
      }
      sessionCurrentQuestionNumber = harvardCurrentQuestionNumber || sessionCurrentQuestionNumber;
      sessionTotalQuestions = harvardTotalQuestions || sessionTotalQuestions;
    } else if (isAkaJob) {
      const latest = getAkaJobQuestionProgress();
      if (latest) {
        akajobCurrentQuestionNumber = latest.current;
        akajobTotalQuestions = latest.total;
      }
      sessionCurrentQuestionNumber = akajobCurrentQuestionNumber || sessionCurrentQuestionNumber;
      sessionTotalQuestions = akajobTotalQuestions || sessionTotalQuestions;
    }

    const total = sessionTotalQuestions;
    const current = sessionCurrentQuestionNumber;
    const solved = sessionCachedFingerprints.size;

    if (!total && !current && solved === 0) {
      progressEl.style.display = 'none';
      return;
    }

    progressEl.style.display = 'block';
    const progressText = total > 0 ? `${current || '?'} / ${total}` : `${current || '?'} / ?`;
    const target = total > 0 ? total : '?';
    if (isHarvard) {
      const discovered = Math.max(harvardBackgroundDiscovered, solved);
      progressEl.textContent = `Quiz progress: ${progressText} - Cached: ${solved}/${target} - Prefetch discovered: ${discovered}`;
      return;
    }

    if (isAkaJob) {
      const discovered = Math.max(akajobBackgroundDiscovered, solved);
      progressEl.textContent = `Quiz progress: ${progressText} - Cached: ${solved}/${target} - Prefetch discovered: ${discovered}`;
      return;
    }

    progressEl.textContent = `Quiz progress: ${progressText} - Cached: ${solved}/${target}`;
  }
  
  /**
   * Solve the current question
   */
  async function solveCurrentQuestion(initialQuestion = null, solveOptions = {}) {
    if (extensionContextLost) {
      const reconnectMessage = 'Extension was updated/reloaded. Refresh this tab once to reconnect.';
      if (!solveOptions?.silent) {
        showError(reconnectMessage);
      }
      return { error: reconnectMessage };
    }

    const options = {
      allowSelectionOverride: true,
      silent: false,
      skipAutoHide: false,
      skipAIFallback: false,
      markFingerprint: '',
      forceRefresh: false,
      followUpPrompt: undefined,
      ...solveOptions
    };

    if (initialQuestion) {
      currentQuestion = initialQuestion;
    }

    if (options.allowSelectionOverride) {
      const selectedQuestion = getQuestionFromSelection();
      const detectedQuestion = detectQuiz();
      currentQuestion = preferQuestionPayload(selectedQuestion, detectedQuestion) || currentQuestion;
      currentQuestion = ensureQuestionText(currentQuestion);
      currentQuestion = postProcessQuestionPayload(currentQuestion);
    }

    if (!currentQuestion) {
      const detectedQuestion = detectQuiz();
      if (detectedQuestion) {
        currentQuestion = detectedQuestion;
      }
    }

    currentQuestion = ensureQuestionText(currentQuestion);
    currentQuestion = postProcessQuestionPayload(currentQuestion);

    updateAkaJobProgressFromQuestion(currentQuestion);
    updateHarvardProgressFromQuestion(currentQuestion);

    if (currentQuestion && currentQuestion.source === 'harvard_manage_mentor' && isQuestionPlaceholder(currentQuestion.question)) {
      const hardQuestion = normalizeText(currentQuestion.element?.querySelector('legend[class*="assmt_activity__question-content-entry"], legend[aria-label]')?.getAttribute('aria-label') || currentQuestion.element?.querySelector('legend[class*="assmt_activity__question-content-entry"], legend[aria-label]')?.textContent || '');
      if (hardQuestion) {
        currentQuestion.question = hardQuestion;
      }
    }

    if (!options.skipAIFallback && shouldAttemptAIFallback(currentQuestion)) {
      const recovered = await recoverQuestionWithAIFallback(currentQuestion);
      if (recovered) {
        currentQuestion = resolvedQuestionPayload(recovered);
      }
    }

    if (!currentQuestion) {
      if (options.silent) {
        return { error: 'No question content found' };
      }

      if (!sidebarVisible && sidebarElement) {
        showSidebarStealth({ ghostDelay: 1300 });
        logSidebarRect('solve-no-question');
      }
      showError('Khong tim thay noi dung da boi den. Hay boi den ca cau hoi va cac dap an, sau do thu lai.');
      return { error: 'No question content found' };
    }

    const followUpPrompt = getFollowUpPromptForSolve(options);
    if (options.followUpPrompt !== undefined) {
      followUpPromptDraft = followUpPrompt;
    }

    const fingerprint = options.markFingerprint || getQuestionFingerprint(currentQuestion);
    const cacheKey = buildQuestionCacheKey(fingerprint, followUpPrompt);
    const questionTypeSignature = currentQuestion?.questionType === 'coding' ? 'coding' : 'quiz';
    const modelSignature = getActiveModelSignature(settings, questionTypeSignature);

    if (options.forceRefresh && cacheKey) {
      questionHintCache.delete(cacheKey);
    }

    const cachedEntry = cacheKey ? questionHintCache.get(cacheKey) : null;
    const cacheMatch = !!(cachedEntry && cachedEntry.result && cachedEntry.modelSignature === modelSignature);

    if (cachedEntry && !cacheMatch && cacheKey) {
      questionHintCache.delete(cacheKey);
    }

    if (!options.forceRefresh && cacheMatch && cachedEntry && cachedEntry.result) {
      if (fingerprint) {
        markFingerprintAsCached(fingerprint);
      }
      registerSolvedResult(fingerprint, cachedEntry.result, followUpPrompt);
      if (shouldRenderHintInSidebar(options)) {
        if (!sidebarVisible && sidebarElement) {
          showSidebarStealth({ ghostDelay: 1300 });
          logSidebarRect('solve-cached');
        } else {
          applySidebarActiveState();
        }
        updateSidebarWithQuestion(currentQuestion);
        displayResult(cachedEntry.result);
        scheduleSidebarStealthCycle({ ghostDelay: 1200 });
      }
      highlightCorrectOption(cachedEntry.result.answer);
      attachHoverHintsForQuestion(currentQuestion);
      return cachedEntry.result;
    }
    
    if (shouldRenderHintInSidebar(options) && !sidebarVisible && sidebarElement) {
      showSidebarStealth({ ghostDelay: 1200 });
      logSidebarRect('solve-show');
    } else if (shouldRenderHintInSidebar(options) && sidebarVisible) {
      applySidebarActiveState();
    }

    if (shouldRenderHintInSidebar(options)) {
      updateSidebarWithQuestion(currentQuestion);
    }

    console.log('[AI Translator] Active question payload:', {
      question: currentQuestion.question,
      optionsCount: Array.isArray(currentQuestion.options) ? currentQuestion.options.length : 0,
      questionType: currentQuestion.questionType,
      source: currentQuestion.source || 'generic',
      visualOptions: !!currentQuestion.visualOptions
    });

    if ((currentQuestion.questionType === 'multiple_choice' || currentQuestion.questionType === 'multiple_select') && (!currentQuestion.options || currentQuestion.options.length < 2)) {
      const parseError = 'Cannot detect answer options reliably. Select question + options, then press solve again.';
      if (!options.silent) showError(parseError);
      return { error: parseError };
    }
    
    if (!options.silent) {
      showLoading(true);
      hideError();
    }
    
    try {
      if (currentQuestion.questionType === 'coding') {
        let starterCode = currentQuestion.starterCode || extractAkaJobStarterCode();
        
        // Try bridge for more reliable read on Akajob
        if (currentQuestion.source === 'akajob_coding') {
          const bridgeResult = await fetchCodeViaAkaJobBridge();
          if (bridgeResult.ok && bridgeResult.code) {
            starterCode = bridgeResult.code;
            currentQuestion.starterCode = starterCode;
          }
        }

        const codingResult = await sendRuntimeMessage({
          action: 'solveCodingQuestion',
          model: settings?.model || '',
          payload: {
            question: currentQuestion.question,
            language: currentQuestion.language || getAkaJobCodingLanguage(),
            starterCode: starterCode,
            followUpPrompt
          }
        });

        if (!codingResult) {
          const message = 'No response from extension background service.';
          if (!options.silent) showError(message);
          return { error: message };
        }

        if (codingResult.error) {
          if (!options.silent) showError(codingResult.error);
          return codingResult;
        }

        if (cacheKey) {
          questionHintCache.set(cacheKey, {
            result: codingResult,
            modelSignature,
            followUpPrompt,
            timestamp: Date.now()
          });
        }

        if (fingerprint) {
          markFingerprintAsCached(fingerprint);
        }
        registerSolvedResult(fingerprint, codingResult, followUpPrompt);

        if (shouldRenderHintInSidebar(options)) {
          displayResult(codingResult);
          scheduleSidebarStealthCycle({ ghostDelay: 1300 });
        }

        attachHoverHintsForQuestion(currentQuestion);

        return codingResult;
      }

      const useVision = hasVisualOnlyOptions(currentQuestion);
      const imageSources = useVision ? collectQuestionImageSources(currentQuestion) : [];
      const captureRect = useVision ? getCaptureRectForQuestion(currentQuestion) : null;

      const result = await sendRuntimeMessage(
        useVision
          ? {
              action: 'solveQuizVision',
              model: settings?.model || '',
              payload: {
                question: currentQuestion.question,
                options: currentQuestion.options,
                questionType: currentQuestion.questionType,
                visualHints: Array.isArray(currentQuestion.visualHints) ? currentQuestion.visualHints : [],
                images: imageSources,
                captureRect,
                followUpPrompt
              }
            }
            : {
              action: 'solveQuiz',
              model: settings?.model || '',
              question: currentQuestion.question,
              options: currentQuestion.options,
              questionType: currentQuestion.questionType,
              followUpPrompt
            }
      );

      console.log('[AI Translator] Solve mode:', useVision ? 'vision' : 'text');
      
      if (!result) {
        const message = 'No response from extension background service.';
        if (!options.silent) showError(message);
        return { error: message };
      }

      if (result.error) {
        if (!options.silent) showError(result.error);
        return result;
      }

      if (cacheKey) {
        questionHintCache.set(cacheKey, {
          result,
          modelSignature,
          followUpPrompt,
          timestamp: Date.now()
        });
      }

      if (fingerprint) {
        markFingerprintAsCached(fingerprint);
      }
      registerSolvedResult(fingerprint, result, followUpPrompt);

      if (shouldRenderHintInSidebar(options)) {
        displayResult(result);
        scheduleSidebarStealthCycle({ ghostDelay: 1200 });
      }

      highlightCorrectOption(result.answer);
      attachHoverHintsForQuestion(currentQuestion);
      
      if (!options.skipAutoHide && settings.stealthMode && sidebarVisible) {
        scheduleSidebarStealthCycle({ ghostDelay: 1200 });
      }

      return result;
      
    } catch (err) {
      const message = formatExtensionErrorMessage(err);
      if (!options.silent) {
        showError(message);
      }
      return { error: message };
    } finally {
      if (!options.silent) {
        showLoading(false);
      }
    }
  }

  function resolvedQuestionPayload(question) {
    if (!question) return null;

    const normalizedType = question.questionType === 'multiple_select'
      ? 'multiple_select'
      : (question.questionType === 'coding' ? 'coding' : 'multiple_choice');

    return {
      question: normalizeText(question.question || ''),
      options: Array.isArray(question.options) ? question.options.map(opt => normalizeText(opt)).filter(Boolean) : [],
      optionElements: Array.isArray(question.optionElements) ? question.optionElements : [],
      questionType: normalizedType,
      element: question.element || null,
      source: question.source || '',
      language: question.language || '',
      starterCode: question.starterCode || '',
      questionTextElement: question.questionTextElement || null,
      codingEditorElement: question.codingEditorElement || null
    };
  }

  function getFollowUpPromptForSolve(options = {}) {
    if (options && options.followUpPrompt !== undefined) {
      return normalizeFollowUpPromptText(options.followUpPrompt || '');
    }
    return normalizeFollowUpPromptText(settings?.followUpPrompt || followUpPromptDraft || '');
  }

  function buildQuestionCacheKey(fingerprint, followUpPrompt) {
    if (!fingerprint) return '';
    const suffix = normalizeFollowUpPromptText(followUpPrompt || '').toLowerCase();
    return suffix ? `${fingerprint}::fp-${suffix}` : `${fingerprint}::fp-none`;
  }

  function hasCachedResultForFingerprint(fingerprint) {
    if (!fingerprint) return false;
    if (questionHintCache.has(fingerprint)) return true;

    const prefix = `${fingerprint}::fp-`;
    for (const key of questionHintCache.keys()) {
      if (String(key).startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  function registerSolvedResult(fingerprint, result, followUpPrompt = '') {
    if (!fingerprint || !result || result.error) return;
    latestSolvedResults.set(fingerprint, {
      result,
      followUpPrompt: normalizeText(followUpPrompt || ''),
      timestamp: Date.now()
    });
  }

  function getLatestSolvedResultForQuestion(question = currentQuestion) {
    if (!question) return null;
    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return null;
    const entry = latestSolvedResults.get(fingerprint);
    return entry && entry.result ? entry.result : null;
  }

  function clearHoverHintBindings() {
    while (hoverHintBindings.length > 0) {
      const binding = hoverHintBindings.pop();
      if (!binding || !binding.el) continue;
      binding.el.removeEventListener('mouseenter', binding.onEnter, true);
      binding.el.removeEventListener('mouseleave', binding.onLeave, true);
    }

    while (hoverHintMarkers.length > 0) {
      const marker = hoverHintMarkers.pop();
      if (marker && marker.parentElement) {
        marker.parentElement.removeChild(marker);
      }
    }

    if (hoverHintTooltipEl) {
      hoverHintTooltipEl.remove();
      hoverHintTooltipEl = null;
    }
  }

  function attachHoverHintsForQuestion(question) {
    clearHoverHintBindings();
    if (!question || question.questionType === 'coding') return;

    const solved = getLatestSolvedResultForQuestion(question);
    if (!solved || !solved.answer) return;

    const answerLetter = String(solved.answer || '').trim().charAt(0).toUpperCase();
    if (!answerLetter) return;

    const questionTarget = question.questionTextElement || question.element;
    if (questionTarget) {
      bindHoverHint(questionTarget, () => {
        return `${answerLetter}`;
      });
    }

    if (Array.isArray(question.optionElements)) {
      question.optionElements.forEach((optionEl, index) => {
        if (!optionEl) return;
        const optionLetterValue = optionLetter(index);
        if (optionLetterValue === answerLetter) {
          attachStealthCorrectMarker(optionEl);
        }
      });
    }
  }

  function attachStealthCorrectMarker(optionEl) {
    if (!optionEl || typeof optionEl.appendChild !== 'function') return;

    const marker = document.createElement('span');
    marker.setAttribute('data-ai-quiz-marker', '1');
    marker.textContent = '•';
    marker.style.position = 'absolute';
    marker.style.right = '8px';
    marker.style.top = '50%';
    marker.style.transform = 'translateY(-50%)';
    marker.style.fontSize = '10px';
    marker.style.color = 'rgba(60, 90, 120, 0.55)';
    marker.style.pointerEvents = 'none';
    marker.style.userSelect = 'none';
    marker.style.opacity = '0.55';

    const currentPos = String(optionEl.style.position || '').toLowerCase();
    if (!currentPos || currentPos === 'static') {
      optionEl.style.position = 'relative';
    }

    optionEl.appendChild(marker);
    hoverHintMarkers.push(marker);
  }

  function bindHoverHint(el, textBuilder) {
    if (!el || typeof textBuilder !== 'function') return;

    const onEnter = () => {
      const text = normalizeText(textBuilder());
      if (!text) return;
      showHoverHintTooltip(text, el);
    };

    const onLeave = () => {
      hideHoverHintTooltip();
    };

    el.addEventListener('mouseenter', onEnter, true);
    el.addEventListener('mouseleave', onLeave, true);
    hoverHintBindings.push({ el, onEnter, onLeave });
  }

  function showHoverHintTooltip(text, anchorEl) {
    if (!anchorEl || typeof anchorEl.getBoundingClientRect !== 'function') return;
    if (!hoverHintTooltipEl) {
      hoverHintTooltipEl = document.createElement('div');
      hoverHintTooltipEl.style.position = 'fixed';
      hoverHintTooltipEl.style.zIndex = '2147483647';
      hoverHintTooltipEl.style.pointerEvents = 'none';
    hoverHintTooltipEl.style.maxWidth = '80px';
      hoverHintTooltipEl.style.background = 'rgba(20, 36, 56, 0.96)';
      hoverHintTooltipEl.style.color = '#fff';
      hoverHintTooltipEl.style.borderRadius = '6px';
    hoverHintTooltipEl.style.padding = '6px 8px';
    hoverHintTooltipEl.style.fontSize = '13px';
    hoverHintTooltipEl.style.fontWeight = '600';
    hoverHintTooltipEl.style.letterSpacing = '0.5px';
      hoverHintTooltipEl.style.lineHeight = '1.35';
      hoverHintTooltipEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.28)';
      hoverHintTooltipEl.style.display = 'none';
      document.documentElement.appendChild(hoverHintTooltipEl);
    }

    hoverHintTooltipEl.textContent = text;
    hoverHintTooltipEl.style.display = 'block';

    const rect = anchorEl.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 340, Math.max(8, rect.left));
    const y = Math.max(8, rect.top - 36);
    hoverHintTooltipEl.style.left = `${x}px`;
    hoverHintTooltipEl.style.top = `${y}px`;
  }

  function hideHoverHintTooltip() {
    if (hoverHintTooltipEl) {
      hoverHintTooltipEl.style.display = 'none';
    }
  }

  function shouldRenderHintInSidebar(options) {
    if (!options || !options.silent) return true;
    if (!settings || !settings.stealthMode) return true;
    return sidebarVisible;
  }
  
  /**
   * Display AI result
   */
  function displayResult(result) {
    const resultEl = sidebarElement?.querySelector('#sidebar-result');
    const answerEl = sidebarElement?.querySelector('#result-answer');
    const explanationEl = sidebarElement?.querySelector('#result-explanation');
    const codingActionsEl = sidebarElement?.querySelector('#coding-actions');
    const insertStatusEl = sidebarElement?.querySelector('#coding-insert-status');
    const insertBtn = sidebarElement?.querySelector('#insert-logic-btn');
    const copyBtn = sidebarElement?.querySelector('#copy-logic-btn');
    
    if (!resultEl || !answerEl || !explanationEl) return;

    if (currentQuestion) {
      const fingerprint = getQuestionFingerprint(currentQuestion);
      registerSolvedResult(fingerprint, result, getFollowUpPromptForSolve());
    }

    if (insertStatusEl) {
      insertStatusEl.style.display = 'none';
      insertStatusEl.textContent = '';
      insertStatusEl.style.color = '#345';
    }
    
    if (result.mode === 'coding') {
      latestCodingLogicBlock = String(result.logicBlock || '').trim();
      latestCodingFullCode = String(result.code || '').trim();
      answerEl.innerHTML = `<strong>Coding Solution Ready (${escapeHtml(currentQuestion?.language || getAkaJobCodingLanguage())})</strong>`;

      const approach = result.approach ? `<p style="margin: 0 0 8px 0;"><strong>Approach:</strong> ${escapeHtml(result.approach)}</p>` : '';
      const complexity = `<p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${escapeHtml(result.timeComplexity || 'N/A')} | <strong>Space:</strong> ${escapeHtml(result.spaceComplexity || 'N/A')}</p>`;
      const codeBlock = `<h5 style="font-size: 13px; margin: 10px 0 6px 0; color: #856404;">Code:</h5><pre style="white-space: pre-wrap; background: #fff; border: 1px solid #e6d99d; border-radius: 6px; padding: 10px; font-size: 12px; line-height: 1.4; max-height: 240px; overflow: auto;">${escapeHtml(result.code || '')}</pre>`;
      const tests = Array.isArray(result.testCases) && result.testCases.length > 0
        ? `<h5 style="font-size: 13px; margin: 10px 0 6px 0; color: #856404;">Suggested tests:</h5><ul style="padding-left: 18px; margin: 0;">${result.testCases.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
      const notes = result.notes ? `<p style="margin: 8px 0 0 0;"><strong>Notes:</strong> ${escapeHtml(result.notes)}</p>` : '';

      explanationEl.innerHTML = `${approach}${complexity}${codeBlock}${tests}${notes}`;
      explanationEl.style.display = 'block';

      if (codingActionsEl) {
        codingActionsEl.style.display = 'flex';
      }
      if (insertBtn) {
        insertBtn.disabled = !result.logicBlock;
      }
      if (copyBtn) {
        copyBtn.disabled = !result.logicBlock;
      }

      resultEl.style.display = 'block';
      return;
    }

    latestCodingLogicBlock = '';
    latestCodingFullCode = '';

    if (codingActionsEl) {
      codingActionsEl.style.display = 'none';
    }

    answerEl.innerHTML = `<strong>Answer: ${result.answer} - ${escapeHtml(result.answerText)}</strong>`;

    if (result.explanation && settings.showExplanations) {
      explanationEl.innerHTML = `<h5 style="font-size: 13px; margin-bottom: 8px; color: #856404;">Explanation:</h5><p>${escapeHtml(result.explanation)}</p>`;
      explanationEl.style.display = 'block';
    } else {
      explanationEl.style.display = 'none';
    }
    
    resultEl.style.display = 'block';
  }

  async function handleInsertLogicClick() {
    const insertBtn = sidebarElement?.querySelector('#insert-logic-btn');
    const logicBlock = String(latestCodingLogicBlock || '').trim();

    if (!logicBlock) {
      setCodingInsertStatus('No insert-safe logic block available. Try solving again.', true);
      return;
    }

    const logicCheck = validateLogicBlockForInsertion(logicBlock);
    if (!logicCheck.ok) {
      setCodingInsertStatus(logicCheck.error || 'Logic block is not safe to insert.', true);
      return;
    }

    let currentCode = '';
    const currentCodeResult = await fetchCodeViaAkaJobBridge();
    if (currentCodeResult.ok && currentCodeResult.code) {
      currentCode = currentCodeResult.code;
    } else {
      currentCode = extractAkaJobStarterCode();
    }

    if (insertBtn) {
      insertBtn.disabled = true;
      insertBtn.textContent = 'Inserting...';
    }

    try {
      let nextCode = '';
      let useCursor = false;
      
      // If editor is empty, just use the full code from AI
      if (!currentCode || !currentCode.trim()) {
        nextCode = latestCodingFullCode || logicBlock;
      } else {
        const replacement = replaceLogicRegionInCode(currentCode, logicCheck.logicBlock);
        if (!replacement.ok) {
          // Instead of full code fallback, use cursor insertion to preserve template
          nextCode = logicCheck.logicBlock;
          useCursor = true;
        } else {
          nextCode = replacement.code;
        }
      }

      const writeResult = await (useCursor ? insertCodeAtCursorViaAkaJobBridge(nextCode) : applyCodeToAkaJobEditor(nextCode));
      if (!writeResult.ok) {
        setCodingInsertStatus(writeResult.message || 'Failed to insert logic into editor.', true);
        return;
      }

      setCodingInsertStatus(useCursor ? 'Inserted logic at cursor (marker not found).' : 'Inserted logic into marker region successfully.', false);
    } catch (error) {
      setCodingInsertStatus(error?.message || 'Failed to insert logic into editor.', true);
    } finally {
      if (insertBtn) {
        insertBtn.disabled = false;
        insertBtn.textContent = 'Insert Logic';
      }
    }
  }

  async function handleCopyLogicClick() {
    const logicBlock = String(latestCodingLogicBlock || '').trim();
    if (!logicBlock) {
      setCodingInsertStatus('No logic block available to copy.', true);
      return;
    }

    try {
      await navigator.clipboard.writeText(logicBlock);
      setCodingInsertStatus('Logic block copied. If Ctrl+V is blocked by the test site, use Insert Logic.', false);
    } catch (_) {
      const fallback = document.createElement('textarea');
      fallback.value = logicBlock;
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.focus();
      fallback.select();
      const copied = document.execCommand('copy');
      fallback.remove();
      if (copied) {
        setCodingInsertStatus('Logic block copied. If Ctrl+V is blocked by the test site, use Insert Logic.', false);
      } else {
        setCodingInsertStatus('Copy failed. Select code manually from the sidebar.', true);
      }
    }
  }

  function setCodingInsertStatus(message, isError) {
    const statusEl = sidebarElement?.querySelector('#coding-insert-status');
    if (!statusEl) return;

    statusEl.textContent = String(message || '').trim();
    statusEl.style.display = statusEl.textContent ? 'block' : 'none';
    statusEl.style.color = isError ? '#b42318' : '#345';
  }

  function replaceLogicRegionInCode(sourceCode, logicBlock) {
    const source = String(sourceCode || '').replace(/\r\n/g, '\n');
    const logic = String(logicBlock || '').replace(/\r\n/g, '\n').trim();
    if (!source || !logic) {
      return { ok: false, error: 'Missing source or logic block.' };
    }

    const lines = source.split('\n');
    const startIndex = lines.findIndex((line) => isLogicStartMarker(line));
    if (startIndex < 0) {
      return {
        ok: false,
        error: 'Could not find logic marker (for example: //write your Logic here).'
      };
    }

    const endIndex = findLogicEndBoundary(lines, startIndex + 1);
    if (endIndex < 0) {
      return {
        ok: false,
        error: 'End marker not found after logic marker. Insert aborted to avoid duplicate code.'
      };
    }

    const baseIndent = String(lines[startIndex] || '').match(/^\s*/)?.[0] || '';
    const normalizedLogicLines = normalizeLogicLines(logic, baseIndent);

    const output = [];
    output.push(...lines.slice(0, startIndex + 1));
    output.push(...normalizedLogicLines);
    output.push(...lines.slice(endIndex));
    return { ok: true, code: output.join('\n'), replaced: true };
  }

  function isLogicStartMarker(line) {
    const value = String(line || '').toLowerCase();
    return /write\s*your\s*logic\s*here/.test(value) ||
      /implement\s+logic\s+here/.test(value) ||
      /your\s+logic\s+here/.test(value) ||
      /start\s+logic/.test(value) ||
      /begin\s+logic/.test(value);
  }

  function findLogicEndBoundary(lines, fromIndex) {
    for (let index = fromIndex; index < lines.length; index += 1) {
      const value = String(lines[index] || '').toLowerCase();
      if (/^\s*(\/\/|\/\*+|\*|#)\s*output\b/.test(value)) return index;
      if (/^\s*(\/\/|\/\*+|\*|#)\s*sample\s*(input|output)\b/.test(value)) return index;
      if (/^\s*(\/\/|\/\*+|\*|#)\s*expected\s*output\b/.test(value)) return index;
      if (/^\s*(\/\/|\/\*+|\*|#)\s*test\s*cases?\b/.test(value)) return index;
    }
    return -1;
  }

  function validateLogicBlockForInsertion(logicBlock) {
    const logic = String(logicBlock || '').replace(/\r\n/g, '\n').trim();
    if (!logic) {
      return { ok: false, logicBlock: '', error: 'Empty logic block.' };
    }

    const hasClassWrapper = /(^|\n)\s*(public\s+)?class\s+[A-Za-z_][\w]*/.test(logic);
    const hasMainWrapper = /(^|\n)\s*(public\s+)?static\s+void\s+main\s*\(/.test(logic);
    const hasFunctionWrapper = /(^|\n)\s*(function\s+[A-Za-z_$][\w$]*\s*\(|const\s+[A-Za-z_$][\w$]*\s*=\s*\([^)]*\)\s*=>)/.test(logic);

    if (hasClassWrapper || hasMainWrapper || hasFunctionWrapper) {
      return {
        ok: false,
        logicBlock: '',
        error: 'Model returned a full wrapper (class/function/main). Re-solve and use a logic-only block.'
      };
    }

    return { ok: true, logicBlock: logic, error: '' };
  }

  function normalizeLogicLines(logic, baseIndent) {
    const rawLines = String(logic || '').split('\n');
    const nonEmpty = rawLines.filter((line) => line.trim().length > 0);
    let commonIndent = Infinity;

    nonEmpty.forEach((line) => {
      const indentLength = (line.match(/^\s*/) || [''])[0].length;
      if (indentLength < commonIndent) {
        commonIndent = indentLength;
      }
    });

    if (!Number.isFinite(commonIndent)) {
      commonIndent = 0;
    }

    const adjusted = rawLines.map((line) => {
      if (!line.trim()) return '';
      const dedented = line.slice(Math.min(commonIndent, line.length));
      return `${baseIndent}${dedented}`;
    });

    while (adjusted.length > 0 && !adjusted[0].trim()) adjusted.shift();
    while (adjusted.length > 0 && !adjusted[adjusted.length - 1].trim()) adjusted.pop();

    return adjusted.length > 0 ? adjusted : [baseIndent + logic.trim()];
  }

  async function applyCodeToAkaJobEditor(nextCode) {
    const bridgeWrite = await applyCodeViaAkaJobBridge(nextCode, 'insertLogic');
    if (bridgeWrite.ok) {
      return bridgeWrite;
    }

    return await applyCodeViaTextarea(nextCode);
  }

  async function insertCodeAtCursorViaAkaJobBridge(nextCode) {
    return await applyCodeViaAkaJobBridge(nextCode, 'insertAtCursor');
  }

  function applyCodeViaAkaJobBridge(nextCode, type = 'insertLogic') {
    return new Promise((resolve) => {
      if (!isAkaJobSkillupPage()) {
        resolve({ ok: false, message: 'Not on Akajob coding page.' });
        return;
      }

      injectAkaJobFetchBridge();

      const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        const pending = akajobPendingInsertRequests.get(requestId);
        if (pending) {
          akajobPendingInsertRequests.delete(requestId);
          pending.resolve({ ok: false, message: 'Editor bridge timed out.' });
        }
      }, 1800);

      akajobPendingInsertRequests.set(requestId, {
        resolve,
        timer
      });

      window.postMessage({
        source: 'ai-translator-akajob-bridge-control',
        payload: {
          type: type,
          requestId,
          code: String(nextCode || '')
        }
      }, '*');
    });
  }

  async function applyCodeViaTextarea(nextCode) {
    try {
      const textarea = document.querySelector('#monaco-editor textarea.inputarea, .monaco-editor textarea.inputarea, textarea.inputarea');
      if (!textarea) {
        return { ok: false, message: 'Could not find Monaco input textarea.' };
      }

      const before = normalizeEditorCodeForCompare(extractAkaJobStarterCode());
      const value = String(nextCode || '');
      textarea.focus();
      textarea.value = value;
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: value }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.dispatchEvent(new Event('keyup', { bubbles: true }));

      let after = '';
      const afterResult = await fetchCodeViaAkaJobBridge();
      if (afterResult.ok && afterResult.code) {
        after = normalizeEditorCodeForCompare(afterResult.code);
      } else {
        after = normalizeEditorCodeForCompare(extractAkaJobStarterCode());
      }
      
      const target = normalizeEditorCodeForCompare(value);
      if (after && target && after === target && after !== before) {
        return { ok: true, message: 'Editor updated via textarea fallback.' };
      }

      return {
        ok: false,
        message: 'Editor blocked direct paste/update events. Try Insert Logic bridge path or click editor and retry.'
      };
    } catch (error) {
      return { ok: false, message: error?.message || 'Textarea fallback failed.' };
    }
  }

  function normalizeEditorCodeForCompare(code) {
    return String(code || '').replace(/\r\n/g, '\n').trim();
  }
  
  /**
   * Highlight the correct option on the page
   */
  function highlightCorrectOption(answerLetter) {
    if (!currentQuestion || !answerLetter || settings.stealthMode) return;
    if (currentQuestion.questionType === 'coding') return;
    
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
    const regenerateBtn = sidebarElement?.querySelector('#sidebar-regenerate-btn');
    
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (solveBtn) solveBtn.disabled = show;
    if (regenerateBtn) regenerateBtn.disabled = show;
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
      sendRuntimeMessage({ action: 'getSettings' })
        .then((response) => resolve(response || {}))
        .catch((error) => {
          console.warn('[AI Translator] Failed to load settings from background:', error);
          resolve({});
        });
    });
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.id || extensionContextLost) {
        const error = new Error('Extension context invalidated. Reload this page.');
        handleContextInvalidation(error);
        reject(error);
        return;
      }

      chrome.runtime.sendMessage(payload, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          const error = new Error(runtimeError.message || 'Runtime message failed');
          handleContextInvalidation(error);
          reject(error);
          return;
        }

        resolve(response);
      });
    });
  }

  function handleContextInvalidation(error) {
    if (!isExtensionContextError(error)) return;

    extensionContextLost = true;

    if (extensionContextNotified) return;
    extensionContextNotified = true;

    stopAutoDetectAndPrefetch('extension-context-lost');

    showError('Extension was updated/reloaded. Refresh this tab once to reconnect.');
  }

  function isExtensionContextError(error) {
    const message = (error && error.message ? error.message : '').toLowerCase();
    if (!message) return false;

    return message.includes('extension context invalidated') ||
      message.includes('context invalidated') ||
      message.includes('extension has been invalidated') ||
      message.includes('reload this page') ||
      message.includes('receiving end does not exist') ||
      message.includes('could not establish connection') ||
      message.includes('message port closed') ||
      message.includes('port closed before a response was received');
  }

  function formatExtensionErrorMessage(error) {
    if (isExtensionContextError(error)) {
      return 'Extension connection lost after reload/update. Refresh this tab and try again.';
    }

    const raw = (error && error.message ? error.message : '').toLowerCase();

    if (raw) {
      return `Extension communication failed: ${error.message}`;
    }

    return 'Failed to communicate with extension. Make sure the extension is loaded.';
  }

  function setupQuizProgressObserver() {
    if (settings?.autoDetect !== true) return;
    if (!/linkedin\.com\/learning/i.test(location.href)) return;
    if (!document.body) return;
    if (extensionContextLost) return;

    if (quizProgressObserver) {
      quizProgressObserver.disconnect();
      quizProgressObserver = null;
    }

    scheduleQuizProgressRefresh(700);

    quizProgressObserver = new MutationObserver(() => {
      scheduleQuizProgressRefresh(450);
    });

    quizProgressObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden', 'data-live-test-chapter-quiz-question']
    });
  }

  function setupHarvardPrefetchObserver() {
    if (settings?.autoDetect !== true) return;
    if (!isHarvardManageMentorPage()) return;
    if (!document.body) return;
    if (extensionContextLost) return;

    if (harvardPrefetchObserver) {
      harvardPrefetchObserver.disconnect();
      harvardPrefetchObserver = null;
    }

    scheduleHarvardPrefetch(1000);

    harvardPrefetchObserver = new MutationObserver(() => {
      scheduleHarvardPrefetch(500);
    });

    harvardPrefetchObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
    });
  }

  function setupHarvardBackgroundPreload() {
    if (settings?.autoDetect !== true) return;
    if (!isHarvardManageMentorPage()) return;

    if (!harvardMessageListenerAttached) {
      window.addEventListener('message', onHarvardBridgeMessage, false);
      harvardMessageListenerAttached = true;
    }

    injectHarvardFetchBridge();
  }

  function setupAkaJobPrefetchObserver() {
    if (settings?.autoDetect !== true) return;
    if (!isAkaJobSkillupPage()) return;
    if (!document.body) return;
    if (extensionContextLost) return;

    if (akajobPrefetchObserver) {
      akajobPrefetchObserver.disconnect();
      akajobPrefetchObserver = null;
    }

    scheduleAkaJobPrefetch(900);

    akajobPrefetchObserver = new MutationObserver(() => {
      scheduleAkaJobPrefetch(400);
    });

    akajobPrefetchObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
    });
  }

  function setupAkaJobBackgroundPreload() {
    if (settings?.autoDetect !== true) return;
    if (!isAkaJobSkillupPage()) return;

    if (!akajobMessageListenerAttached) {
      window.addEventListener('message', onAkaJobBridgeMessage, false);
      akajobMessageListenerAttached = true;
    }

    injectAkaJobFetchBridge();
  }

  function scheduleAkaJobPrefetch(delay = 500) {
    if (settings?.autoDetect !== true) return;
    clearTimeout(akajobPrefetchTimer);
    akajobPrefetchTimer = setTimeout(() => {
      runAkaJobPrefetch();
    }, delay);
  }

  async function runAkaJobPrefetch() {
    if (settings?.autoDetect !== true) return;
    if (!isAkaJobSkillupPage()) return;
    if (extensionContextLost) return;
    if (!hasValidApiKey()) return;
    if (akajobPrefetchRunning) return;

    const question = parseAkaJobSkillupQuestion();
    if (!question) return;

    updateAkaJobProgressFromQuestion(question);

    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return;

    if (hasCachedResultForFingerprint(fingerprint)) {
      markFingerprintAsCached(fingerprint);
      return;
    }

    akajobPrefetchRunning = true;
    try {
      await prefetchQuestionHint(question, fingerprint);
      markFingerprintAsCached(fingerprint);
    } finally {
      akajobPrefetchRunning = false;
      updateProgressBadge();
    }
  }

  function isAkaJobSkillupPage() {
    return /skillup-test\.akajob\.io/i.test(location.hostname) ||
      !!document.querySelector('#questionHeader1, .question-content-container, .ans-option-wrap .list-block');
  }

  function getAkaJobQuestionProgress() {
    const header = normalizeText(document.querySelector('#questionHeader1')?.textContent || '');
    if (!header) return null;

    const match = header.match(/question\s*:?\s*(\d+)\s+of\s+(\d+)/i);
    if (!match) return null;

    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    return {
      current: Number.isFinite(current) ? current : 0,
      total: Number.isFinite(total) ? total : 0
    };
  }

  function updateAkaJobProgressFromQuestion(question) {
    if (!question || (question.source !== 'akajob_skillup' && question.source !== 'akajob_coding')) return;

    const progress = getAkaJobQuestionProgress();
    if (!progress) return;

    akajobCurrentQuestionNumber = progress.current;
    akajobTotalQuestions = progress.total;
    sessionCurrentQuestionNumber = progress.current;
    sessionTotalQuestions = progress.total;
    updateProgressBadge();
  }

  function injectExternalPageBridge(bridgeType, bridgeSource) {
    try {
      const marker = `data-ai-translator-bridge-${bridgeType}`;
      if (document.documentElement.hasAttribute(marker)) {
        return true;
      }

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('page-bridge.js');
      script.async = false;
      script.dataset.bridgeType = bridgeType;
      script.dataset.bridgeSource = bridgeSource;

      (document.head || document.documentElement).appendChild(script);
      script.remove();

      document.documentElement.setAttribute(marker, '1');
      return true;
    } catch (error) {
      console.warn('[AI Translator] External page bridge injection failed:', error);
      return false;
    }
  }

  function injectAkaJobFetchBridge() {
    if (akajobBridgeInjected) return;
    if (!isAkaJobSkillupPage()) return;

    const ok = injectExternalPageBridge('akajob', 'ai-translator-akajob-bridge');
    if (ok) {
      akajobBridgeInjected = true;
    }
  }

  function onAkaJobBridgeMessage(event) {
    if (!event || event.source !== window) return;
    const data = event.data;
    if (!data || (data.source !== 'ai-translator-akajob-bridge' && data.source !== 'ai-translator-akajob-bridge-control')) return;

    const payload = data.payload;
    if (!payload) return;

    if (payload.type === 'insertLogicResult') {
      const requestId = String(payload.requestId || '');
      if (!requestId) return;

      const pending = akajobPendingInsertRequests.get(requestId);
      if (!pending) return;

      clearTimeout(pending.timer);
      akajobPendingInsertRequests.delete(requestId);
      pending.resolve({
        ok: payload.ok === true,
        message: String(payload.message || '')
      });
      return;
    }

    if (payload.type === 'getEditorValueResult') {
      const requestId = String(payload.requestId || '');
      if (!requestId) return;

      const pending = akajobPendingReadRequests.get(requestId);
      if (!pending) return;

      clearTimeout(pending.timer);
      akajobPendingReadRequests.delete(requestId);
      pending.resolve({
        ok: payload.ok === true,
        code: String(payload.code || ''),
        message: String(payload.message || '')
      });
      return;
    }

    if (payload.type !== 'questions') return;

    enqueueAkaJobBackgroundQuestions(payload.questions || []);
  }

  function fetchCodeViaAkaJobBridge() {
    return new Promise((resolve) => {
      if (!isAkaJobSkillupPage()) {
        resolve({ ok: false, message: 'Not on Akajob coding page.' });
        return;
      }

      injectAkaJobFetchBridge();

      const requestId = `read-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        const pending = akajobPendingReadRequests.get(requestId);
        if (pending) {
          akajobPendingReadRequests.delete(requestId);
          pending.resolve({ ok: false, message: 'Editor read bridge timed out.' });
        }
      }, 1500);

      akajobPendingReadRequests.set(requestId, {
        resolve,
        timer
      });

      window.postMessage({
        source: 'ai-translator-akajob-bridge-control',
        payload: {
          type: 'getEditorValue',
          requestId
        }
      }, '*');
    });
  }

  function enqueueAkaJobBackgroundQuestions(questions) {
    if (settings?.autoDetect !== true) return;
    if (!Array.isArray(questions) || questions.length === 0) return;
    if (!hasValidApiKey()) return;

    questions.forEach((q) => {
      const normalizedQuestion = normalizeText(q.question || '');
      const normalizedOptions = Array.isArray(q.options)
        ? q.options.map((opt) => normalizeText(opt)).filter(Boolean)
        : [];

      if (!normalizedQuestion || normalizedOptions.length < 2) return;

      const payload = {
        question: normalizedQuestion,
        options: normalizedOptions,
        optionElements: [],
        questionType: 'multiple_choice',
        element: null,
        source: 'akajob_skillup_prefetch'
      };

      const fingerprint = getQuestionFingerprint(payload);
      if (!fingerprint) return;
      if (akajobBackgroundQueued.has(fingerprint) || hasCachedResultForFingerprint(fingerprint)) return;

      akajobBackgroundQueued.add(fingerprint);
      akajobBackgroundPayloads.set(fingerprint, payload);
      akajobBackgroundDiscovered += 1;
    });

    runAkaJobBackgroundQueue();
    updateProgressBadge();
  }

  async function runAkaJobBackgroundQueue() {
    if (settings?.autoDetect !== true) return;
    if (akajobBackgroundQueueRunning) return;
    if (extensionContextLost) return;
    if (!hasValidApiKey()) return;

    akajobBackgroundQueueRunning = true;
    try {
      const payloadEntries = Array.from(akajobBackgroundPayloads.entries());
      for (const [fingerprint, payload] of payloadEntries) {
        if (hasCachedResultForFingerprint(fingerprint) || akajobBackgroundSolved.has(fingerprint)) continue;
        if (!payload) continue;

        const result = await solveCurrentQuestion(payload, {
          allowSelectionOverride: false,
          silent: true,
          skipAutoHide: true,
          skipAIFallback: true,
          markFingerprint: fingerprint
        });

        if (result && !result.error) {
          akajobBackgroundSolved.add(fingerprint);
          markFingerprintAsCached(fingerprint);
        }

        akajobBackgroundPayloads.delete(fingerprint);
      }
    } finally {
      akajobBackgroundQueueRunning = false;
      updateProgressBadge();
    }
  }

  function injectHarvardFetchBridge() {
    if (harvardBridgeInjected) return;
    if (!isHarvardManageMentorPage()) return;

    const ok = injectExternalPageBridge('harvard', 'ai-translator-hmm-bridge');
    if (ok) {
      harvardBridgeInjected = true;
    }
  }

  function onHarvardBridgeMessage(event) {
    if (!event || event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'ai-translator-hmm-bridge') return;

    const payload = data.payload;
    if (!payload || payload.type !== 'questions') return;

    enqueueHarvardBackgroundQuestions(payload.questions || []);
  }

  function enqueueHarvardBackgroundQuestions(questions) {
    if (settings?.autoDetect !== true) return;
    if (!Array.isArray(questions) || questions.length === 0) return;
    if (!hasValidApiKey()) return;

    questions.forEach((q) => {
      const normalizedQuestion = normalizeText(q.question || '');
      const normalizedOptions = Array.isArray(q.options)
        ? q.options.map((opt) => normalizeText(opt)).filter(Boolean)
        : [];

      if (!normalizedQuestion || normalizedOptions.length < 2) return;

      const payload = {
        question: normalizedQuestion,
        options: normalizedOptions,
        optionElements: [],
        questionType: 'multiple_choice',
        element: null,
        source: 'harvard_manage_mentor_prefetch'
      };

      const fingerprint = getQuestionFingerprint(payload);
      if (!fingerprint) return;
      if (harvardBackgroundQueued.has(fingerprint) || hasCachedResultForFingerprint(fingerprint)) return;

      harvardBackgroundQueued.add(fingerprint);
      harvardBackgroundDiscovered += 1;
      harvardBackgroundPayloads.set(fingerprint, payload);
    });

    runHarvardBackgroundQueue();
    updateProgressBadge();
  }

  async function runHarvardBackgroundQueue() {
    if (settings?.autoDetect !== true) return;
    if (harvardBackgroundQueueRunning) return;
    if (extensionContextLost) return;
    if (!hasValidApiKey()) return;

    harvardBackgroundQueueRunning = true;
    try {
      const payloadEntries = Array.from(harvardBackgroundPayloads.entries());

      for (const [fingerprint, payload] of payloadEntries) {
        if (hasCachedResultForFingerprint(fingerprint) || harvardBackgroundSolved.has(fingerprint)) continue;
        if (!payload) continue;

        const result = await solveCurrentQuestion(payload, {
          allowSelectionOverride: false,
          silent: true,
          skipAutoHide: true,
          skipAIFallback: true,
          markFingerprint: fingerprint
        });

        if (result && !result.error) {
          harvardBackgroundSolved.add(fingerprint);
          markFingerprintAsCached(fingerprint);
        }

        harvardBackgroundPayloads.delete(fingerprint);
      }
    } finally {
      harvardBackgroundQueueRunning = false;
      updateProgressBadge();
    }
  }

  function scheduleHarvardPrefetch(delay = 600) {
    if (settings?.autoDetect !== true) return;
    clearTimeout(harvardPrefetchTimer);
    harvardPrefetchTimer = setTimeout(() => {
      runHarvardPrefetch();
    }, delay);
  }

  async function runHarvardPrefetch() {
    if (settings?.autoDetect !== true) return;
    if (!isHarvardManageMentorPage()) return;
    if (extensionContextLost) return;
    if (!hasValidApiKey()) return;
    if (harvardPrefetchRunning) return;

    const question = parseHarvardManageMentorQuestion();
    if (!question) return;

    const progress = getHarvardQuestionProgress(question.element);
    if (progress) {
      harvardCurrentQuestionNumber = progress.current;
      harvardTotalQuestions = progress.total;
      sessionCurrentQuestionNumber = progress.current;
      sessionTotalQuestions = progress.total;
      updateProgressBadge();
    }

    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return;

    if (hasCachedResultForFingerprint(fingerprint)) {
      markFingerprintAsCached(fingerprint);
      return;
    }

    harvardPrefetchRunning = true;
    try {
      await prefetchQuestionHint(question, fingerprint);
      harvardSeenQuestionFingerprints.add(fingerprint);
      markFingerprintAsCached(fingerprint);
    } finally {
      harvardPrefetchRunning = false;
      updateProgressBadge();
    }
  }

  function isHarvardManageMentorPage() {
    return !!document.querySelector('section[class*="assmt_activity__question-block"]');
  }

  function getHarvardQuestionProgress(activeBlock = null) {
    const block = activeBlock || document.querySelector('section[class*="assmt_activity__question-block"]');
    if (!block) return null;

    const header = normalizeText(block.querySelector('[class*="question-header-text"]')?.textContent || '');
    if (!header) return null;

    const match = header.match(/question\s+(\d+)\s+of\s+(\d+)/i);
    if (!match) return null;

    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    return {
      current: Number.isFinite(current) ? current : 0,
      total: Number.isFinite(total) ? total : 0
    };
  }

  function scheduleQuizProgressRefresh(delay = 500) {
    if (settings?.autoDetect !== true) return;
    clearTimeout(quizProgressTimer);
    quizProgressTimer = setTimeout(() => {
      refreshQuizProgressAndPrefetch();
    }, delay);
  }

  async function refreshQuizProgressAndPrefetch() {
    if (settings?.autoDetect !== true) return;
    if (extensionContextLost) return;

    if (!/linkedin\.com\/learning/i.test(location.href)) {
      return;
    }

    const info = getLinkedInQuestionProgress();
    if (!info) return;

    sessionCurrentQuestionNumber = info.current || sessionCurrentQuestionNumber;
    sessionTotalQuestions = info.total || sessionTotalQuestions;
    updateProgressBadge();

    const question = detectQuiz();
    if (!question) return;

    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return;

    if (fingerprint === lastObservedQuestionFingerprint) return;
    lastObservedQuestionFingerprint = fingerprint;

    if (hasCachedResultForFingerprint(fingerprint)) {
      markFingerprintAsCached(fingerprint);
      return;
    }

    if (!hasValidApiKey()) return;

    await prefetchQuestionHint(question, fingerprint);
  }

  async function refreshAkaJobProgressAndPrefetch() {
    if (settings?.autoDetect !== true) return;
    if (extensionContextLost) return;
    if (!isAkaJobSkillupPage()) return;

    const info = getAkaJobQuestionProgress();
    if (info) {
      akajobCurrentQuestionNumber = info.current;
      akajobTotalQuestions = info.total;
      sessionCurrentQuestionNumber = info.current;
      sessionTotalQuestions = info.total;
      updateProgressBadge();
    }

    const question = parseAkaJobCodingQuestion() || parseAkaJobSkillupQuestion();
    if (!question) return;

    const fingerprint = getQuestionFingerprint(question);
    if (!fingerprint) return;

    if (hasCachedResultForFingerprint(fingerprint)) {
      markFingerprintAsCached(fingerprint);
      return;
    }

    if (!hasValidApiKey()) return;
    await prefetchQuestionHint(question, fingerprint);
  }

  function updateHarvardProgressFromQuestion(question) {
    if (!question || question.source !== 'harvard_manage_mentor') return;

    const progress = getHarvardQuestionProgress(question.element);
    if (!progress) return;

    harvardCurrentQuestionNumber = progress.current;
    harvardTotalQuestions = progress.total;
    sessionCurrentQuestionNumber = progress.current;
    sessionTotalQuestions = progress.total;
    updateProgressBadge();
  }

  function getLinkedInQuestionProgress() {
    if (!/linkedin\.com\/learning/i.test(location.href)) return null;

    const numberEl = document.querySelector('.chapter-quiz-question__question-number');
    const text = normalizeText(numberEl?.textContent || '');
    if (!text) return null;

    const match = text.match(/question\s+(\d+)\s+of\s+(\d+)/i);
    if (!match) return null;

    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    return {
      current: Number.isFinite(current) ? current : 0,
      total: Number.isFinite(total) ? total : 0
    };
  }

  async function prefetchQuestionHint(question, fingerprint) {
    if (settings?.autoDetect !== true) return;
    if (!question || !fingerprint) return;
    if (hasCachedResultForFingerprint(fingerprint)) return;
    if (prefetchInFlight.has(fingerprint)) return;

    if (question.source === 'harvard_manage_mentor' && !sidebarVisible) {
      createHiddenUI();
    }

    if (question.source === 'akajob_skillup' && !sidebarVisible) {
      createHiddenUI();
    }

    const task = solveCurrentQuestion(question, {
      allowSelectionOverride: false,
      silent: true,
      skipAutoHide: true,
      skipAIFallback: true,
      markFingerprint: fingerprint
    }).then((result) => {
      if (result && !result.error) {
        markFingerprintAsCached(fingerprint);
      }
      return result;
    }).finally(() => {
      prefetchInFlight.delete(fingerprint);
    });

    prefetchInFlight.set(fingerprint, task);
    await task;
  }

  function markFingerprintAsCached(fingerprint) {
    if (!fingerprint) return;
    sessionCachedFingerprints.add(fingerprint);
    const latestResult = latestSolvedResults.get(fingerprint);
    if (latestResult && latestResult.timestamp && Date.now() - latestResult.timestamp > 30 * 60 * 1000) {
      latestSolvedResults.delete(fingerprint);
    }
    if (isAkaJobSkillupPage()) {
      akajobBackgroundSolved.add(fingerprint);
    }
    if (isHarvardManageMentorPage()) {
      harvardSeenQuestionFingerprints.add(fingerprint);
    }
    updateProgressBadge();
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
          extensionContextLost = false;
          extensionContextNotified = false;
          lastObservedQuestionFingerprint = '';
          sessionCachedFingerprints.clear();
          harvardSeenQuestionFingerprints.clear();
          harvardBackgroundQueued.clear();
          harvardBackgroundSolved.clear();
          harvardBackgroundPayloads.clear();
          harvardBackgroundDiscovered = 0;
          harvardCurrentQuestionNumber = 0;
          harvardTotalQuestions = 0;
          harvardPrefetchRunning = false;
          harvardBackgroundQueueRunning = false;
          akajobBackgroundQueued.clear();
          akajobBackgroundSolved.clear();
          akajobBackgroundPayloads.clear();
          akajobBackgroundDiscovered = 0;
          akajobCurrentQuestionNumber = 0;
          akajobTotalQuestions = 0;
          akajobPrefetchRunning = false;
          akajobBackgroundQueueRunning = false;
          sessionCurrentQuestionNumber = 0;
          sessionTotalQuestions = 0;
          pendingAutoSolveFingerprints.clear();
          questionHintCache.clear();
          latestSolvedResults.clear();
          clearHoverHintBindings();
          processedQuestionFingerprints.clear();
          prefetchInFlight.clear();
          autoSolveCooldownUntil = 0;

          if (settings?.autoDetect === true) {
            scheduleAutoDetectScan(900);
            scheduleQuizProgressRefresh(900);
            scheduleHarvardPrefetch(900);
            scheduleAkaJobPrefetch(900);
            refreshAkaJobProgressAndPrefetch();
          } else {
            stopAutoDetectAndPrefetch('spa-navigation-auto-detect-off');
          }
        }, 500);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  /**
   * Build question payload from selected text in page.
   */
  function getQuestionFromSelection() {
    const selectedText = getSelectedText();
    if (!selectedText) return null;
    return parseSelectedQuizText(selectedText);
  }

  function getSelectedText() {
    const selection = window.getSelection();
    const selected = normalizeText(selection ? selection.toString() : '');
    if (selected) return selected;

    const active = document.activeElement;
    if (!active) return '';

    const isTextInput = active.tagName === 'TEXTAREA' ||
      (active.tagName === 'INPUT' && /^(text|search|url|tel|password)$/i.test(active.type || 'text'));

    if (!isTextInput) return '';

    const start = active.selectionStart;
    const end = active.selectionEnd;
    if (typeof start !== 'number' || typeof end !== 'number' || end <= start) return '';

    return normalizeText(active.value.slice(start, end));
  }

  function parseSelectedQuizText(rawText) {
    const lines = (rawText || '')
      .split(/\r?\n/)
      .map(line => normalizeText(line))
      .filter(Boolean)
      .filter(line => !isLikelyNavigationText(line));

    if (lines.length === 0) return null;

    if (lines.length === 1) {
      const singleLine = lines[0];
      const singleQuestion = parseSingleLineSelection(singleLine);
      if (singleQuestion) return singleQuestion;

      return {
        question: singleLine,
        options: [],
        optionElements: [],
        questionType: 'short_answer',
        element: null
      };
    }

    const optionPrefixRegex = /^(?:[A-Ha-h]|\d{1,2})[\)\.:-]\s*(.+)$/;
    const bulletRegex = /^(?:[-*•])\s+(.+)$/;
    let firstOptionIndex = -1;

    for (let i = 1; i < lines.length; i++) {
      if (optionPrefixRegex.test(lines[i]) || bulletRegex.test(lines[i])) {
        firstOptionIndex = i;
        break;
      }
    }

    let question = '';
    let optionLines = [];

    if (firstOptionIndex > 0) {
      question = normalizeText(lines.slice(0, firstOptionIndex).join(' '));
      optionLines = lines.slice(firstOptionIndex);
    } else {
      question = lines[0];
      optionLines = lines.slice(1);
    }

    const options = optionLines
      .map(line => {
        const prefixMatch = line.match(optionPrefixRegex);
        if (prefixMatch) return normalizeText(prefixMatch[1]);
        const bulletMatch = line.match(bulletRegex);
        if (bulletMatch) return normalizeText(bulletMatch[1]);
        return normalizeText(line);
      })
      .filter(text => text.length > 0)
      .filter(text => !isLikelyNavigationText(text));

    let parsed = {
      question: question || lines[0],
      options,
      optionElements: [],
      questionType: options.length >= 2 ? 'multiple_choice' : 'short_answer',
      element: null
    };

    parsed = mergeWithDetectedQuestionIfNeeded(parsed);
    return parsed;
  }

  function parseSingleLineSelection(singleLine) {
    const text = normalizeText(singleLine);
    if (!text) return null;

    const qIndex = text.indexOf('?');
    if (qIndex < 0) return null;

    const question = normalizeText(text.slice(0, qIndex + 1));
    const tail = normalizeText(text.slice(qIndex + 1));
    const options = inferInlineOptions(tail);

    let parsed = {
      question: question || text,
      options,
      optionElements: [],
      questionType: options.length >= 2 ? 'multiple_choice' : 'short_answer',
      element: null
    };

    parsed = mergeWithDetectedQuestionIfNeeded(parsed);
    return parsed;
  }

  function inferInlineOptions(tailText) {
    const tail = normalizeText(tailText);
    if (!tail) return [];

    // Strong separators first
    const strongParts = tail
      .split(/(?:\s[|]\s|\s*\/\s*|\s*;\s*|\s*,\s*)/)
      .map(part => normalizeText(part))
      .filter(Boolean)
      .filter(part => !isLikelyNavigationText(part));

    if (strongParts.length >= 2) return strongParts.slice(0, 8);

    // Prefix patterns: A) / A. / 1) / 1.
    const prefixed = tail
      .split(/(?:\s+(?=(?:[A-Ha-h]|\d{1,2})[\)\.:-]\s*))/)
      .map(part => normalizeText(part.replace(/^(?:[A-Ha-h]|\d{1,2})[\)\.:-]\s*/, '')))
      .filter(Boolean)
      .filter(part => !isLikelyNavigationText(part));

    if (prefixed.length >= 2) return prefixed.slice(0, 8);

    return [];
  }

  function mergeWithDetectedQuestionIfNeeded(parsed) {
    if (!parsed) return parsed;

    const detected = detectQuiz();
    if (!detected) return parsed;

    const parsedQuestion = normalizeText(parsed.question || '');
    const detectedQuestion = normalizeText(detected.question || '');

    const parsedLooksNav = isLikelyNavigationText(parsedQuestion) || isQuestionPlaceholder(parsedQuestion);
    const parsedHasFewOptions = !parsed.options || parsed.options.length < 2;
    const detectedIsBetter = detectedQuestion && !isLikelyNavigationText(detectedQuestion) && detected.options && detected.options.length >= 2;

    if ((parsedLooksNav || parsedHasFewOptions) && detectedIsBetter) {
      return {
        question: detectedQuestion,
        options: detected.options,
        optionElements: detected.optionElements,
        questionType: detected.questionType || 'multiple_choice',
        element: detected.element || null
      };
    }

    const parsedPruned = pruneAggregateOptions(parsed.options || [], parsed.optionElements || []);
    if (parsedPruned.options.length >= 2) {
      parsed.options = parsedPruned.options;
      parsed.optionElements = parsedPruned.optionElements;
    }

    return parsed;
  }

  function buildQuestionFromRequest(request) {
    if (!request) return null;

    if (request.options && request.options.length > 0) {
      return {
        question: normalizeText(request.question || ''),
        options: request.options.map(option => normalizeText(option)).filter(Boolean),
        optionElements: [],
        questionType: request.questionType || 'multiple_choice',
        element: null
      };
    }

    return parseSelectedQuizText(request.question || '');
  }

  function collectQuestionImageSources(question) {
    if (!question || !question.element) return [];

    const images = [];
    const seen = new Set();

    function addUrl(url) {
      const normalized = normalizeText(url);
      if (!normalized || seen.has(normalized)) return;
      if (shouldSkipLikelyIconUrl(normalized)) return;
      seen.add(normalized);
      images.push({ url: normalized });
    }

    const questionTextElement = question.questionTextElement;
    if (questionTextElement && typeof questionTextElement.querySelectorAll === 'function') {
      questionTextElement.querySelectorAll('img').forEach((img) => {
        const src = img.currentSrc || img.src || img.getAttribute('src') || '';
        addUrl(src);
      });
    }

    question.optionElements.forEach((el) => {
      if (!el || typeof el.querySelectorAll !== 'function') return;
      el.querySelectorAll('img').forEach((img) => {
        const src = img.currentSrc || img.src || img.getAttribute('src') || '';
        addUrl(src);
      });

      el.querySelectorAll('svg, canvas, table').forEach((node) => {
        if (node && typeof node.getBoundingClientRect === 'function') {
          const rect = node.getBoundingClientRect();
          if (rect.width > 20 && rect.height > 20) {
            images.push({
              kind: 'visual-node',
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }
      });
    });

    return images.slice(0, 6);
  }

  function shouldSkipLikelyIconUrl(url) {
    const normalized = String(url || '').toLowerCase();
    if (!normalized) return true;

    return normalized.includes('/assets/images/test-started/') ||
      normalized.includes('/assets/images/q-menu/') ||
      normalized.includes('/assets/images/timer/') ||
      normalized.includes('/assets/images/webcam/') ||
      normalized.includes('report-problem') ||
      normalized.includes('mark-for-review') ||
      normalized.includes('filter.svg') ||
      normalized.includes('icon_') ||
      normalized.includes('icon-') ||
      normalized.includes('logo') ||
      normalized.endsWith('.svg');
  }

  function hasVisualOnlyOptions(question) {
    if (!question || !Array.isArray(question.options)) return false;

    if (question.questionType === 'coding') return false;
    if (question.options.length < 2) return false;

    if (question.source === 'akajob_skillup') {
      const hasVisualInQuestion = !!(question.questionTextElement && hasVisualContent(question.questionTextElement));
      const hasVisualInOptions = Array.isArray(question.optionElements) && question.optionElements.some((el) => {
        if (!el || typeof el.querySelector !== 'function') return false;
        return !!el.querySelector('img, svg, canvas, table');
      });
      return hasVisualInQuestion || hasVisualInOptions;
    }

    if (question.visualOptions) return true;

    const shortOrCodeLike = question.options.filter((opt) => {
      const text = normalizeText(opt);
      if (!text) return true;
      if (text.length <= 3) return true;
      if (/^[A-Za-z0-9_\-]+$/.test(text) && text.length <= 8) return true;
      return false;
    }).length;

    if (shortOrCodeLike < Math.ceil(question.options.length * 0.75)) {
      return false;
    }

    const images = collectQuestionImageSources(question);
    if (images.length >= 2) return true;

    const hasTableOrSvg = Array.isArray(question.optionElements) && question.optionElements.some((el) => {
      if (!el || typeof el.querySelector !== 'function') return false;
      return !!el.querySelector('table, svg, canvas');
    });

    return hasTableOrSvg;
  }

  function getCaptureRectForQuestion(question) {
    if (!question || !question.element || typeof question.element.getBoundingClientRect !== 'function') {
      return null;
    }

    const rect = question.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!viewportWidth || !viewportHeight) return null;

    const margin = 16;
    const left = Math.max(0, Math.floor(rect.left - margin));
    const top = Math.max(0, Math.floor(rect.top - margin));
    const right = Math.min(viewportWidth, Math.ceil(rect.right + margin));
    const bottom = Math.min(viewportHeight, Math.ceil(rect.bottom + margin));

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    return {
      left,
      top,
      width,
      height,
      devicePixelRatio: window.devicePixelRatio || 1
    };
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
