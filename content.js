/* =========================================================================
   CONTENT.JS - Form Scraping, Advanced Auto-filling & UI Feedback
   ========================================================================= */

window.__AEROX_AI_FILL_CONTENT_LOADED = true;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormContext') {
    sendResponse({ fields: scrapeFormContext() });
  } else if (message.action === 'fillForm') {
    fillFormFields(message.data);
    sendResponse({ success: true });
  }
});

function scrapeFormContext() {
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
  const fields = [];

  inputs.forEach(el => {
    let labelText = '';
    if (el.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) labelText = label.innerText;
      } catch (e) {}
    }
    if (!labelText && el.closest('label')) labelText = el.closest('label').innerText;

    fields.push({
      id: el.id || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      labelText: labelText.trim(),
      type: el.type
    });
  });

  return fields.filter(f => f.id || f.name || f.placeholder || f.ariaLabel || f.labelText);
}

function fillFormFields(data) {
  if (!data || typeof data !== 'object') return;
  const elementsFilled = new Set();

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') continue;

    let targetElement = document.getElementById(key);
    if (!targetElement) {
      try { targetElement = document.querySelector(`[name="${CSS.escape(key)}"]`); } catch (e) {}
    }

    if (targetElement && !elementsFilled.has(targetElement)) {
      setNativeValue(targetElement, value);
      triggerBlueGlow(targetElement);
      elementsFilled.add(targetElement);
    }
  }
}

/**
 * Native Setter Injection (React/Vue/Angular bypass)
 */
function setNativeValue(element, value) {
  const lastValue = element.value;
  element.value = value;

  const tracker = element._valueTracker;
  if (tracker) tracker.setValue(lastValue);
  
  let prototype = Object.getPrototypeOf(element);
  let descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  while (!descriptor && prototype !== null) {
    prototype = Object.getPrototypeOf(prototype);
    if (prototype) descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  }

  const setter = descriptor ? descriptor.set : null;
  if (setter && element.tagName.toLowerCase() !== 'select') {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Visual feedback for the filled fields
 */
function triggerBlueGlow(element) {
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;
  
  element.style.transition = 'box-shadow 0.3s ease-in-out';
  element.style.boxShadow = '0 0 0 4px rgba(0, 113, 227, 0.5)';
  
  setTimeout(() => {
    element.style.boxShadow = originalBoxShadow || '';
    setTimeout(() => { element.style.transition = originalTransition || ''; }, 300);
  }, 1000);
}
