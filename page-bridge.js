(() => {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const bridgeType = String(currentScript.dataset.bridgeType || '').toLowerCase();
  const bridgeSource = String(currentScript.dataset.bridgeSource || '').trim();
  if (!bridgeType || !bridgeSource) return;

  const marker = `__AI_TRANSLATOR_${bridgeType.toUpperCase()}_BRIDGE__`;
  if (window[marker]) return;
  window[marker] = true;

  const emit = (payload) => {
    try {
      window.postMessage({ source: bridgeSource, payload }, '*');
    } catch (_) {}
  };

  const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();

  const readOptionText = (opt) => {
    if (typeof opt === 'string') return normalize(opt);
    if (!opt || typeof opt !== 'object') return '';
    return normalize(opt.text || opt.label || opt.optionText || opt.answerText || opt.content || opt.value);
  };

  const isQuestionLike = (node) => {
    if (!node || typeof node !== 'object') return false;
    const q = normalize(node.question || node.prompt || node.stem || node.questionText || node.text || node.questionContent);
    if (q.length < 12) return false;
    const rawOpts = node.options || node.choices || node.answers || node.answerOptions || node.responses;
    if (!Array.isArray(rawOpts) || rawOpts.length < 2) return false;
    return true;
  };

  const tryExtractQuestions = (obj) => {
    const out = [];
    const visited = new WeakSet();

    const walk = (node) => {
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
          out.push({ question: q, options });
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

  const inspectJsonResponse = async (response) => {
    try {
      const clone = response.clone();
      const contentType = String(clone.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) return;

      const data = await clone.json();
      const questions = tryExtractQuestions(data);
      if (questions.length > 0) {
        emit({ type: 'questions', questions });
      }
    } catch (_) {}
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
            emit({ type: 'questions', questions });
          }
        } catch (_) {}
      });

      return originalSend.apply(this, args);
    };
  }
})();
