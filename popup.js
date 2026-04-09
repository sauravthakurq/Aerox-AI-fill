import * as loadedPdfjsLib from './pdf.min.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabHome = document.getElementById('tab-home');
  const tabSettings = document.getElementById('tab-settings');
  const viewHome = document.getElementById('view-home');
  const viewSettings = document.getElementById('view-settings');
  
  const dropZone = document.getElementById('drop-zone');
  const pdfUpload = document.getElementById('pdf-upload');
  const fileStatus = document.getElementById('file-status');
  const fileStatusIcon = fileStatus.querySelector('.status-icon');
  const fileStatusText = fileStatus.querySelector('.status-text');
  const fillFormBtn = document.getElementById('fill-form-btn');
  
  const aiProvider = document.getElementById('ai-provider');
  const modelSelect = document.getElementById('model-select');
  const customModelGroup = document.getElementById('custom-model-group');
  const customModel = document.getElementById('custom-model');
  const apiKey = document.getElementById('api-key');
  const baseUrlGroup = document.getElementById('base-url-group');
  const baseUrl = document.getElementById('base-url');
  
  const testConnBtn = document.getElementById('test-conn-btn');
  const testModelBtn = document.getElementById('test-model-btn');
  const saveStatus = document.getElementById('save-status');
  
  const recentFilesContainer = document.getElementById('recent-files-container');
  const recentFilesList = document.getElementById('recent-files-list');

  // Input view toggles
  const pdfView = document.getElementById('pdf-view');
  const textView = document.getElementById('text-view');
  const switchToText = document.getElementById('switch-to-text');
  const switchToPdf = document.getElementById('switch-to-pdf');
  const manualTextInput = document.getElementById('manual-text-input');

  let extractedPdfText = '';
  let autoSaveTimeout = null;
  let isTextMode = false;
  let fallbackKeys = [];

  const ICONS = {
    check: '<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>',
    error: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>'
  };

  function switchTab(tab) {
    if (tab === 'home') {
      tabHome.classList.add('active'); tabSettings.classList.remove('active');
      viewHome.classList.add('active'); viewSettings.classList.remove('active');
    } else {
      tabHome.classList.remove('active'); tabSettings.classList.add('active');
      viewHome.classList.remove('active'); viewSettings.classList.add('active');
    }
  }
  tabHome.addEventListener('click', () => switchTab('home'));
  tabSettings.addEventListener('click', () => switchTab('settings'));

  switchToText.addEventListener('click', () => {
    isTextMode = true;
    pdfView.classList.add('hidden');
    textView.classList.remove('hidden');
    recentFilesContainer.classList.add('hidden');
    fileStatus.classList.add('hidden');
    updateFillButtonState();
  });

  switchToPdf.addEventListener('click', () => {
    isTextMode = false;
    textView.classList.add('hidden');
    pdfView.classList.remove('hidden');
    if (extractedPdfText) {
      fileStatus.classList.remove('hidden');
    }
    loadRecentFiles(); // Restore recent files visibility
    updateFillButtonState();
  });

  manualTextInput.addEventListener('input', updateFillButtonState);

  function updateFillButtonState() {
    if (isTextMode) {
      fillFormBtn.disabled = manualTextInput.value.trim().length === 0;
    } else {
      fillFormBtn.disabled = !extractedPdfText;
    }
  }

  if (typeof loadedPdfjsLib !== 'undefined') {
    window.pdfjsLib = loadedPdfjsLib;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  } else {
    setTimeout(() => showToast('Failed to load PDF framework.', 'error'), 100);
  }

  // --- Auto-Save Settings ---
  function loadSettings() {
    chrome.storage.local.get(['aiProvider', 'apiKey', 'baseUrl', 'modelSelect', 'customModel', 'fallbackApiKeys'], (res) => {
      if (res.aiProvider) aiProvider.value = res.aiProvider;
      if (res.modelSelect) modelSelect.value = res.modelSelect;
      if (res.customModel) customModel.value = res.customModel;
      if (res.apiKey) apiKey.value = res.apiKey;
      if (res.baseUrl) baseUrl.value = res.baseUrl;
      if (res.fallbackApiKeys) fallbackKeys = res.fallbackApiKeys;
      toggleBaseUrl(); toggleCustomModel();
    });
  }

  function saveSettings() {
    saveStatus.innerHTML = 'Saving...';
    saveStatus.className = 'save-status visible';
    
    chrome.storage.local.set({
      aiProvider: aiProvider.value,
      modelSelect: modelSelect.value,
      customModel: customModel.value.trim(),
      apiKey: apiKey.value.trim(),
      baseUrl: baseUrl.value.trim()
    }, () => {
      saveStatus.className = 'save-status visible success';
      saveStatus.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.check}</svg> Saved`;
      setTimeout(() => { if (saveStatus.innerHTML.includes('Saved')) saveStatus.classList.remove('visible'); }, 2000);
    });
  }

  document.querySelectorAll('.auto-save').forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(autoSaveTimeout);
      saveStatus.innerHTML = 'Saving...';
      saveStatus.className = 'save-status visible';
      autoSaveTimeout = setTimeout(saveSettings, 600);
    });
    input.addEventListener('change', () => {
      if (input.id === 'ai-provider') toggleBaseUrl();
      if (input.id === 'model-select') toggleCustomModel();
      saveSettings(); 
    });
  });

  function toggleBaseUrl() { baseUrlGroup.classList.toggle('hidden', aiProvider.value !== 'custom'); }
  function toggleCustomModel() { customModelGroup.classList.toggle('hidden', modelSelect.value !== 'custom'); }

  loadSettings();

  // --- Fallback API Modal ---
  const fallbackModal = document.getElementById('fallback-modal');
  const openFallbackModal = document.getElementById('open-fallback-modal');
  const closeModal = document.getElementById('close-modal');
  const fallbackList = document.getElementById('fallback-list');
  const addFallbackBtn = document.getElementById('add-fallback-btn');
  const saveFallbackBtn = document.getElementById('save-fallback-btn');

  function renderFallbackInputs() {
    fallbackList.innerHTML = '';
    if (fallbackKeys.length === 0) fallbackKeys = ['']; // minimum 1 input field when opened
    
    fallbackKeys.forEach((k, index) => {
      const div = document.createElement('div');
      div.className = 'fallback-item';
      div.innerHTML = `
        <input type="password" class="fallback-input" value="${k}" placeholder="Enter Secondary API Key ${index + 1}">
        <button class="remove-btn" title="Remove Key">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      div.querySelector('.fallback-input').addEventListener('input', (e) => fallbackKeys[index] = e.target.value);
      div.querySelector('.remove-btn').addEventListener('click', () => {
        fallbackKeys.splice(index, 1);
        renderFallbackInputs();
      });
      fallbackList.appendChild(div);
    });

    addFallbackBtn.disabled = fallbackKeys.length >= 7;
    addFallbackBtn.textContent = fallbackKeys.length >= 7 ? 'Max 7 Keys Reached' : '+ Add Secondary Key';
  }

  openFallbackModal.addEventListener('click', () => {
    // Refresh UI from fallbackKeys on memory
    renderFallbackInputs();
    fallbackModal.classList.remove('hidden');
    setTimeout(() => fallbackModal.classList.add('visible'), 10);
  });

  function closeFallback() {
    fallbackModal.classList.remove('visible');
    setTimeout(() => fallbackModal.classList.add('hidden'), 350);
  }

  closeModal.addEventListener('click', closeFallback);

  addFallbackBtn.addEventListener('click', () => {
    if (fallbackKeys.length < 7) {
      fallbackKeys.push('');
      renderFallbackInputs();
      // Scroll to bottom
      fallbackList.scrollTop = fallbackList.scrollHeight;
    }
  });

  saveFallbackBtn.addEventListener('click', () => {
    // Filter out empties and clean
    fallbackKeys = fallbackKeys.map(k => k.trim()).filter(k => k.length > 0);
    chrome.storage.local.set({ fallbackApiKeys: fallbackKeys }, () => {
      showToast('Fallback API keys active!', 'success');
      closeFallback();
    });
  });

  // --- Recent Files (IndexedDB) ---
  const dbName = 'AIFormFillerDB';
  let db;

  function initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = e => {
        let db = e.target.result;
        if (!db.objectStoreNames.contains('pdfs')) db.createObjectStore('pdfs', { keyPath: 'id' });
      };
      req.onsuccess = e => resolve((db = e.target.result));
      req.onerror = e => reject(e.target.error);
    });
  }

  async function saveRecentFile(name, text) {
    if (!db) await initDB();
    const tx = db.transaction('pdfs', 'readwrite');
    const store = tx.objectStore('pdfs');
    const id = Date.now();
    store.add({ id, name, text, date: id });
    tx.oncomplete = () => loadRecentFiles();
  }

  const viewMoreRecent = document.getElementById('view-more-recent');
  let showingAllRecent = false;

  async function loadRecentFiles() {
    if (!db) await initDB();
    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const req = store.getAll();
    req.onsuccess = () => {
      let files = req.result.sort((a,b) => b.date - a.date);
      let listToRender = files;
      if (!showingAllRecent && files.length > 1) {
        listToRender = files.slice(0, 1);
        viewMoreRecent.classList.remove('hidden');
        viewMoreRecent.textContent = 'View all';
      } else if (showingAllRecent && files.length > 1) {
        viewMoreRecent.classList.remove('hidden');
        viewMoreRecent.textContent = 'Show less';
      } else {
        viewMoreRecent.classList.add('hidden');
      }

      if (files.length > 0) {
        recentFilesList.innerHTML = '';
        listToRender.forEach(f => {
          const li = document.createElement('li');
          li.className = 'recent-item';
          li.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.file}</svg><span>${f.name}</span>`;
          li.onclick = () => selectRecentFile(f);
          recentFilesList.appendChild(li);
        });
        recentFilesContainer.classList.remove('hidden');
      } else {
        recentFilesContainer.classList.add('hidden');
      }
    };
  }

  if(viewMoreRecent) {
    viewMoreRecent.addEventListener('click', () => {
      showingAllRecent = !showingAllRecent;
      loadRecentFiles();
    });
  }

  function selectRecentFile(file) {
    extractedPdfText = file.text;
    showFileStatus(`Loaded: ${file.name}`, 'success', true);
    updateFillButtonState();
    fillFormBtn.click(); // Auto click fill button when recent file is selected
  }

  initDB().then(loadRecentFiles).catch(e => console.error('DB Error:', e));

  // --- Common Helpers ---
  function getBaseUrl() {
    if (aiProvider.value === 'custom') return baseUrl.value.trim();
    if (aiProvider.value === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/models';
    if (aiProvider.value === 'anthropic') return 'https://api.anthropic.com/v1';
    if (aiProvider.value === 'groq') return 'https://api.groq.com/openai/v1';
    return 'https://api.openai.com/v1';
  }
  function getActiveModel() { return modelSelect.value === 'custom' ? customModel.value.trim() : modelSelect.value; }

  // --- Testing Connections ---
  function triggerErrorAnimation(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('input-error');
    void inputEl.offsetWidth;
    inputEl.classList.add('input-error');
    setTimeout(() => inputEl.classList.remove('input-error'), 400);
  }

  async function toggleTestButton(btn, text, isTesting, success = false, error = false) {
    btn.disabled = isTesting;
    if (isTesting) {
      btn.innerHTML = `<svg viewBox="0 0 50 50" style="width:14px;height:14px;animation:spin 1s linear infinite"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="1,200"/></svg> ${text}`;
      btn.classList.add('btn-pulse');
    } else {
      btn.classList.remove('btn-pulse');
      if (success) { btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.check}</svg> ${text}`; btn.style.color = '#34C759'; }
      else if (error) { btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.error}</svg> ${text}`; btn.style.color = '#FF3B30'; }
      setTimeout(() => { if (!btn.disabled) { btn.innerHTML = text; btn.style.color = ''; } }, 2000);
    }
  }

  testConnBtn.addEventListener('click', async () => {
    const url = getBaseUrl();
    if (!url) { triggerErrorAnimation(baseUrl); showToast('Base URL is required constraints.', 'error'); return; }
    toggleTestButton(testConnBtn, 'Testing', true);
    try {
      const match = url.match(/^https?:\/\/[^/]+/);
      await fetch(match ? match[0] : url, { method: 'GET', mode: 'no-cors' });
      toggleTestButton(testConnBtn, 'Connected', false, true);
      showToast('Connection Successful', 'success');
    } catch {
      toggleTestButton(testConnBtn, 'Failed', false, false, true);
      triggerErrorAnimation(baseUrl); showToast('Connection failed. Check URL.', 'error');
    }
  });

  testModelBtn.addEventListener('click', async () => {
    const key = apiKey.value.trim(), model = getActiveModel(), provider = aiProvider.value;
    let url = getBaseUrl();
    if (!key) { triggerErrorAnimation(apiKey); showToast('API Key is empty.', 'error'); return; }
    if (!model) { triggerErrorAnimation(customModel); showToast('Model empty.', 'error'); return; }
    
    toggleTestButton(testModelBtn, 'Pinging...', true);
    try {
      let endpoint = url, headers = { 'Content-Type': 'application/json' }, body = {};
      const isGem = provider === 'gemini' || endpoint.includes('generativelanguage');
      
      if (isGem) {
        if (!endpoint.includes(':generateContent')) endpoint = `${endpoint.replace(/\/$/, '')}/${model}:generateContent`;
        endpoint += `?key=${key}`;
        body = { contents: [{ parts: [{ text: "Hi" }] }], generationConfig: { maxOutputTokens: 10 } };
      } else if (provider === 'anthropic' || endpoint.includes('anthropic')) {
        endpoint = `${endpoint.replace(/\/$/, '')}/messages`;
        headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerously-allow-custom-urls'] = 'true';
        body = { model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] };
      } else {
        endpoint = `${endpoint.replace(/\/$/, '')}/chat/completions`;
        headers['Authorization'] = `Bearer ${key}`;
        body = { model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] };
      }

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toggleTestButton(testModelBtn, 'Verified', false, true);
      showToast(`Model ready!`, 'success');
    } catch (e) {
      toggleTestButton(testModelBtn, 'Failed', false, false, true);
      triggerErrorAnimation(apiKey); showToast('Test failed.', 'error');
    }
  });

  // --- PDF Handling ---
  dropZone.addEventListener('click', () => pdfUpload.click());

  // Global Drop Listener allows dropping anywhere on the container window
  const dragContainer = document.body;
  dragContainer.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    if (!isTextMode) dropZone.classList.add('dragover'); 
  });
  dragContainer.addEventListener('dragleave', (e) => { 
    if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
      dropZone.classList.remove('dragover'); 
    }
  });
  dragContainer.addEventListener('drop', (e) => {
    e.preventDefault(); 
    dropZone.classList.remove('dragover');
    if (isTextMode) return; // ignore drop if in text mode
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  pdfUpload.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  function showFileStatus(text, type, animateIcon = false) {
    fileStatus.className = `status-message visible ${type}`;
    fileStatusText.textContent = text;
    
    if (type === 'success') fileStatusIcon.innerHTML = ICONS.check;
    else if (type === 'error') fileStatusIcon.innerHTML = ICONS.error;
    else fileStatusIcon.innerHTML = ICONS.info;

    if (animateIcon) {
      fileStatusIcon.classList.remove('checkmark-animate');
      void fileStatusIcon.offsetWidth;
      fileStatusIcon.classList.add('checkmark-animate');
    }
  }

  async function handleFile(file) {
    if (file.type !== 'application/pdf') return showToast('Please upload a valid PDF.', 'error');
    if (typeof window.pdfjsLib === 'undefined') return showToast('PDF core unavailable.', 'error');
    
    showFileStatus('Reading PDF...', 'info');
    fillFormBtn.disabled = true;

    // Show Apple-style loader instead of info icon while extracting
    fileStatusIcon.innerHTML = `<div class="ai-loader" style="margin:0;"><span></span><span></span><span></span></div>`;

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(' ') + '\n';
      }
      extractedPdfText = text;
      showFileStatus(`Analysis complete (${pdf.numPages} pages).`, 'success', true);
      updateFillButtonState();
      await saveRecentFile(file.name, text);
      fillFormBtn.click(); // Auto click fill button after upload success
    } catch {
      showFileStatus('Extraction failed', 'error');
      showToast('Error parsing PDF.', 'error');
    }
  }

  // --- Action ---
  async function ensureContentScriptInjected(tabId) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => Boolean(window.__AEROX_AI_FILL_CONTENT_LOADED)
      });
      if (res && res[0] && res[0].result === true) return true;

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      // Delay explicitly for script init on new pages
      await new Promise(r => setTimeout(r, 250));
      return true;
    } catch (e) {
      return false;
    }
  }

  fillFormBtn.addEventListener('click', async () => {
    let finalPayloadText = isTextMode ? manualTextInput.value.trim() : extractedPdfText;
    
    if (!finalPayloadText) return;
    const config = await new Promise(res => chrome.storage.local.get(['apiKey'], res));
    if (!config.apiKey) { showToast('Please setup API Key', 'info'); switchTab('settings'); return; }

    fillFormBtn.disabled = true;
    const oldBtnContent = fillFormBtn.innerHTML;
    fileStatus.classList.remove('hidden');
    fileStatusText.textContent = 'Processing with AI...';
    fileStatus.className = 'status-message visible info';
    fileStatusIcon.innerHTML = `<div class="ai-loader"><span></span><span></span><span></span></div>`;

    fillFormBtn.innerHTML = `<span style="display:flex;align-items:center;gap:6px;"><div class="ai-loader" style="margin:0;"><span></span><span></span><span></span></div></span> Processing`;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab.');

      let injected = await ensureContentScriptInjected(tab.id);
      if (!injected) throw new Error('Cannot run on this page.');

      const formContext = await new Promise((res, rej) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getFormContext' }, response => {
          if (chrome.runtime.lastError) rej(new Error('Could not read page.'));
          else res(response);
        });
      });

      if (!formContext?.fields.length) throw new Error('No form fields found.');
      showFileStatus('AI mapping data to form...', 'info');
      fileStatusIcon.innerHTML = `<div class="ai-loader" style="margin:0;"><span></span><span></span><span></span></div>`;

      const aiResponse = await new Promise((res, rej) => {
        chrome.runtime.sendMessage({
          action: 'processFormWithAI',
          pdfText: finalPayloadText,
          formContext: formContext.fields
        }, r => {
          if (r.error) rej(new Error(r.error)); else res(r.result);
        });
      });

      let cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
      const parsedData = JSON.parse(cleaned.substring(start, end + 1));
      
      showFileStatus('Injecting data...', 'info');
      await chrome.tabs.sendMessage(tab.id, { action: 'fillForm', data: parsedData });
      
      showFileStatus('Form Autofilled!', 'success', true);
      showToast('Form filled successfully', 'success');
    } catch (e) {
      showFileStatus(e.message === 'Could not read page.' ? 'Page connection failed' : 'Error filling form', 'error');
      showToast(e.message, 'error');
    } finally {
      updateFillButtonState();
      fillFormBtn.innerHTML = oldBtnContent;
    }
  });

  // --- Premium Toast ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success' ? ICONS.check : (type === 'error' ? ICONS.error : ICONS.info);
    
    toast.className = `toast ${type}-toast`;
    toast.innerHTML = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${icon}
      </svg>
      <div class="toast-content">${message}</div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100px) scale(0.9)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
