(function() {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const bridgeType = (currentScript.dataset.bridgeType || '').toLowerCase();
  const bridgeSource = (currentScript.dataset.bridgeSource || '').trim();
  if (!bridgeType || !bridgeSource) return;

  const marker = '__AI_TRANSLATOR_' + bridgeType.toUpperCase() + '_BRIDGE__';
  if (window[marker]) return;
  window[marker] = true;

  const controlSource = bridgeSource + '-control';

  const emit = function(payload) {
    try {
      window.postMessage({ source: bridgeSource, payload: payload }, '*');
    } catch (e) {}
  };

  const normalize = function(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  };

  const readOptionText = function(opt) {
    if (typeof opt === 'string') return normalize(opt);
    if (!opt || typeof opt !== 'object') return '';
    return normalize(opt.text || opt.label || opt.optionText || opt.answerText || opt.content || opt.value);
  };

  const isQuestionLike = function(node) {
    if (!node || typeof node !== 'object') return false;
    const q = normalize(node.question || node.prompt || node.stem || node.questionText || node.text || node.questionContent);
    if (q.length < 12) return false;
    const rawOpts = node.options || node.choices || node.answers || node.answerOptions || node.responses;
    if (!Array.isArray(rawOpts) || rawOpts.length < 2) return false;
    return true;
  };

  const tryExtractQuestions = function(obj) {
    const out = [];
    const visited = new WeakSet();

    const walk = function(node) {
      if (!node || typeof node !== 'object') return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (isQuestionLike(node)) {
        const q = normalize(node.question || node.prompt || node.stem || node.questionText || node.text || node.questionContent);
        const rawOpts = node.options || node.choices || node.answers || node.answerOptions || node.responses || [];
        const options = rawOpts.map(readOptionText).filter(Boolean);
        if (q.length >= 12 && options.length >= 2) {
          out.push({ question: q, options: options });
        }
      }

      for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        const value = node[key];
        if (value && typeof value === 'object') walk(value);
      }
    };

    walk(obj);
    return out;
  };

  const inspectJsonResponse = async function(response) {
    try {
      const clone = response.clone();
      const contentType = String(clone.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) return;

      const data = await clone.json();
      const questions = tryExtractQuestions(data);
      if (questions.length > 0) {
        emit({ type: 'questions', questions: questions });
      }
    } catch (e) {}
  };

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      inspectJsonResponse(response);
      return response;
    };
  }

  const XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const originalSend = XHR.prototype.send;
    XHR.prototype.send = function(...args) {
      this.addEventListener('load', function() {
        try {
          const type = String(this.getResponseHeader('content-type') || '').toLowerCase();
          if (!type.includes('application/json')) return;
          const data = JSON.parse(this.responseText || '{}');
          const questions = tryExtractQuestions(data);
          if (questions.length > 0) {
            emit({ type: 'questions', questions: questions });
          }
        } catch (e) {}
      });

      return originalSend.apply(this, args);
    };
  }

  const setCodeInMonacoEditor = function(nextCode) {
    try {
      const code = String(nextCode || '');
      if (!code) {
        return { ok: false, message: 'No code provided.' };
      }

      const normalizeCode = function(text) {
        return String(text || '').replace(/\r\n/g, '\n').trim();
      };

      const readEditorValue = function() {
        const monacoApi = window.monaco;
        if (monacoApi && monacoApi.editor && typeof monacoApi.editor.getEditors === 'function') {
          const editors = monacoApi.editor.getEditors();
          if (Array.isArray(editors) && editors.length > 0) {
            const editor = editors[0];
            const model = typeof editor.getModel === 'function' ? editor.getModel() : null;
            if (model && typeof model.getValue === 'function') {
              return String(model.getValue() || '');
            }
          }
        }

        const textarea = document.querySelector('#monaco-editor textarea.inputarea, .monaco-editor textarea.inputarea, textarea.inputarea');
        return textarea ? String(textarea.value || '') : '';
      };

      const monacoApi = window.monaco;
      if (monacoApi && monacoApi.editor && typeof monacoApi.editor.getEditors === 'function') {
        const editors = monacoApi.editor.getEditors();
        if (Array.isArray(editors) && editors.length > 0) {
          const editor = editors[0];
          const model = typeof editor.getModel === 'function' ? editor.getModel() : null;
          if (model && typeof model.setValue === 'function') {
            model.setValue(code);
            if (typeof editor.focus === 'function') editor.focus();
            const after = normalizeCode(readEditorValue());
            const target = normalizeCode(code);
            if (after === target) {
              return { ok: true, message: 'Updated via Monaco API.' };
            }
            return { ok: false, message: 'Monaco API write did not persist.' };
          }
        }
      }

      const textarea = document.querySelector('#monaco-editor textarea.inputarea, .monaco-editor textarea.inputarea, textarea.inputarea');
      if (!textarea) {
        return { ok: false, message: 'Monaco editor input area not found.' };
      }

      textarea.focus();
      textarea.value = code;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.dispatchEvent(new Event('keyup', { bubbles: true }));

      const after = normalizeCode(readEditorValue());
      const target = normalizeCode(code);
      if (after === target) {
        return { ok: true, message: 'Updated via Monaco textarea fallback.' };
      }

      return { ok: false, message: 'Textarea update did not persist (likely blocked by page handlers).' };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : 'Failed to update editor.'
      };
    }
  };

  const readCodeFromMonacoEditor = function() {
    try {
      const monacoApi = window.monaco;
      if (monacoApi && monacoApi.editor && typeof monacoApi.editor.getEditors === 'function') {
        const editors = monacoApi.editor.getEditors();
        if (Array.isArray(editors) && editors.length > 0) {
          const editor = editors[0];
          const model = typeof editor.getModel === 'function' ? editor.getModel() : null;
          if (model && typeof model.getValue === 'function') {
            return { ok: true, code: String(model.getValue() || '') };
          }
        }
      }

      const textarea = document.querySelector('#monaco-editor textarea.inputarea, .monaco-editor textarea.inputarea, textarea.inputarea');
      if (textarea && textarea.value) {
        return { ok: true, code: String(textarea.value) };
      }

      return { ok: false, message: 'Could not read from Monaco API or textarea.' };
    } catch (error) {
      return { ok: false, message: error && error.message ? error.message : 'Failed to read editor.' };
    }
  };

  window.addEventListener('message', function(event) {
    if (!event || event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== controlSource) return;

    const payload = data.payload || {};
    
    if (payload.type === 'getEditorValue') {
      const requestId = String(payload.requestId || '');
      const result = readCodeFromMonacoEditor();
      emit({
        type: 'getEditorValueResult',
        requestId: requestId,
        ok: result.ok === true,
        code: result.code || '',
        message: result.message || ''
      });
      return;
    }

    if (payload.type === 'insertLogic') {
      const requestId = String(payload.requestId || '');
      const result = setCodeInMonacoEditor(payload.code);
      emit({
        type: 'insertLogicResult',
        requestId: requestId,
        ok: result.ok === true,
        message: result.message || ''
      });
      return;
    }
  }, false);
})();
