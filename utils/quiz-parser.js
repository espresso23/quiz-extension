// utils/quiz-parser.js - Utility for parsing different quiz formats

/**
 * QuizParser - Handles extraction of quiz questions from various HTML structures
 */
class QuizParser {
  constructor() {
    this.strategies = [];
    this.registerDefaultStrategies();
  }
  
  /**
   * Register default parsing strategies
   */
  registerDefaultStrategies() {
    this.addStrategy('radio-group', (container) => this.parseRadioGroup(container));
    this.addStrategy('checkbox-group', (container) => this.parseCheckboxGroup(container));
    this.addStrategy('list-options', (container) => this.parseListOptions(container));
    this.addStrategy('div-options', (container) => this.parseDivOptions(container));
    this.addStrategy('table-quiz', (container) => this.parseTableQuiz(container));
  }
  
  /**
   * Add a parsing strategy
   */
  addStrategy(name, parserFn) {
    this.strategies.push({ name, parserFn });
  }
  
  /**
   * Main parse function - tries all strategies
   */
  parseQuiz(element) {
    if (!element) return null;
    
    for (const strategy of this.strategies) {
      try {
        const result = strategy.parserFn(element);
        if (result && result.question && result.options && result.options.length > 0) {
          return {
            ...result,
            parsedBy: strategy.name
          };
        }
      } catch (err) {
        // Strategy failed, try next one
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Parse radio button group
   */
  parseRadioGroup(container) {
    const radios = container.querySelectorAll('input[type="radio"]');
    if (radios.length < 2) return null;
    
    const options = [];
    const optionElements = [];
    
    radios.forEach(radio => {
      const label = this.findLabelForInput(radio);
      if (label) {
        options.push(label.textContent.trim());
        optionElements.push(label);
      }
    });
    
    if (options.length === 0) return null;
    
    const question = this.extractQuestionText(container, radios[0]);
    
    return {
      question,
      options,
      optionElements,
      questionType: 'multiple_choice',
      allowMultiple: false
    };
  }
  
  /**
   * Parse checkbox group (multiple correct answers possible)
   */
  parseCheckboxGroup(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length < 2) return null;
    
    const options = [];
    const optionElements = [];
    
    checkboxes.forEach(checkbox => {
      const label = this.findLabelForInput(checkbox);
      if (label) {
        options.push(label.textContent.trim());
        optionElements.push(label);
      }
    });
    
    if (options.length === 0) return null;
    
    const question = this.extractQuestionText(container, checkboxes[0]);
    
    return {
      question,
      options,
      optionElements,
      questionType: 'multiple_select',
      allowMultiple: true
    };
  }
  
  /**
   * Parse list-based options
   */
  parseListOptions(container) {
    const lists = container.querySelectorAll('ul, ol');
    if (lists.length === 0) return null;
    
    for (const list of lists) {
      const items = list.querySelectorAll('li');
      if (items.length >= 2) {
        const options = Array.from(items).map(item => item.textContent.trim());
        const question = this.findQuestionBeforeElement(list);
        
        return {
          question: question || 'Select the correct answer:',
          options,
          optionElements: Array.from(items),
          questionType: 'multiple_choice',
          allowMultiple: false
        };
      }
    }
    
    return null;
  }
  
  /**
   * Parse div-based option containers
   */
  parseDivOptions(container) {
    const optionSelectors = [
      '.option',
      '.choice',
      '.answer-option',
      '.quiz-option',
      '[class*="option"]',
      '[class*="answer"]'
    ];
    
    for (const selector of optionSelectors) {
      const options = container.querySelectorAll(selector);
      if (options.length >= 2) {
        const optionTexts = Array.from(options).map(el => el.textContent.trim());
        const question = container.querySelector('h3, h4, .question-text, p:first-child');
        
        return {
          question: question ? question.textContent.trim() : 'Select the correct answer:',
          options: optionTexts,
          optionElements: Array.from(options),
          questionType: 'multiple_choice',
          allowMultiple: false
        };
      }
    }
    
    return null;
  }
  
  /**
   * Parse table-based quizzes
   */
  parseTableQuiz(container) {
    const tables = container.querySelectorAll('table');
    if (tables.length === 0) return null;
    
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      if (rows.length >= 3) {
        const options = [];
        const optionElements = [];
        
        rows.forEach((row, index) => {
          if (index > 0) { // Skip header row
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              options.push(cells[0].textContent.trim());
              optionElements.push(cells[0]);
            }
          }
        });
        
        if (options.length >= 2) {
          const headerRow = rows[0];
          const question = headerRow.textContent.trim();
          
          return {
            question,
            options,
            optionElements,
            questionType: 'multiple_choice',
            allowMultiple: false
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find label associated with an input
   */
  findLabelForInput(input) {
    // Check if input is wrapped in a label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel;
    
    // Check for label with for attribute
    if (input.id) {
      return document.querySelector(`label[for="${input.id}"]`);
    }
    
    // Check next sibling
    const nextSibling = input.nextElementSibling;
    if (nextSibling && nextSibling.tagName === 'LABEL') {
      return nextSibling;
    }
    
    return null;
  }
  
  /**
   * Extract question text from container
   */
  extractQuestionText(container, firstOption) {
    const questionSelectors = [
      '.question-text',
      '.question-title',
      '.quiz-question',
      'h3',
      'h4',
      'p:first-child',
      'label.question'
    ];
    
    for (const selector of questionSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text.length > 5) return text;
      }
    }
    
    // Try to find text before the first option
    return this.findQuestionBeforeElement(container, firstOption);
  }
  
  /**
   * Find question text before an element
   */
  findQuestionBeforeElement(container, element) {
    let current = element;
    
    while (current && current !== container) {
      const prev = current.previousElementSibling;
      if (prev) {
        const text = prev.textContent.trim();
        if (text.length > 5) return text;
      }
      current = current.parentElement;
    }
    
    return 'Select the correct answer:';
  }
  
  /**
   * Detect if a page contains quiz content
   */
  isQuizPage() {
    const quizIndicators = [
      'input[type="radio"]',
      'input[type="checkbox"]',
      '.quiz',
      '.question',
      '.assessment',
      '[class*="quiz"]',
      '[class*="question"]',
      'form[action*="quiz"], form[action*="question"]'
    ];
    
    for (const selector of quizIndicators) {
      if (document.querySelectorAll(selector).length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Find all quiz containers on a page
   */
  findQuizContainers() {
    const containers = [];
    const selectors = [
      '.question-container',
      '.quiz-item',
      '[class*="question-block"]',
      'form.quiz',
      '.quiz-question'
    ];
    
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(el => {
        const parsed = this.parseQuiz(el);
        if (parsed) {
          containers.push({
            element: el,
            ...parsed
          });
        }
      });
    }
    
    return containers;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizParser;
}
