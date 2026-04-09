/* =========================================================================
   BACKGROUND.JS - Secure API calls and LLM Prompting
   ========================================================================= */

const SYSTEM_PROMPT = `
You are an expert data extraction assistant. Your job is to extract information from a provided document and map it to a specific HTML form structure.

INSTRUCTIONS:
1. Review the provided PDF TEXT.
2. Review the provided FORM MAP (listing form field identifiers like 'id', 'name', 'placeholder', and 'aria-label').
3. Find the matching information in the PDF for each form field.
4. Output ONLY a valid JSON object. 
5. The keys of the JSON MUST perfectly match either the 'id' or 'name' from the FORM MAP.
6. The values MUST be the extracted strings. If data for a field is not found in the PDF, omit the key or set it to an empty string.
7. DO NOT wrap your response in markdown formatting or return any text other than the JSON object.
`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processFormWithAI') {
    handleAIRequest(message.pdfText, message.formContext)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // async
  }
});

async function handleAIRequest(pdfText, formContext) {
  const config = await new Promise(res => chrome.storage.local.get(['aiProvider', 'apiKey', 'baseUrl', 'modelSelect', 'customModel', 'fallbackApiKeys'], res));
  if (!config.apiKey) throw new Error('API Key is missing.');

  const prompt = `
=== FORM MAP ===
${JSON.stringify(formContext, null, 2)}

=== PDF TEXT ===
${pdfText}`;

  const modelName = config.modelSelect === 'custom' ? config.customModel : config.modelSelect;
  const fallbackKeys = config.fallbackApiKeys || [];
  
  let currentKeyIndex = -1; // -1 means primary
  let success = false;
  let result = null;
  let fallbackText = '';

  while (!success && currentKeyIndex < fallbackKeys.length) {
    const isFallback = (currentKeyIndex >= 0);
    const activeKey = isFallback ? fallbackKeys[currentKeyIndex] : config.apiKey;
    
    if (!activeKey) {
      currentKeyIndex++;
      continue;
    }

    if (isFallback) {
      console.log(`[Resilience] Primary key failed. Trying Fallback Key #${currentKeyIndex + 1}/${fallbackKeys.length}.`);
    }

    try {
      if (config.aiProvider === 'openai') {
        result = await callUniversalAI('https://api.openai.com/v1', activeKey, prompt, modelName, 'openai');
      } else if (config.aiProvider === 'anthropic') {
        result = await callUniversalAI('https://api.anthropic.com/v1', activeKey, prompt, modelName, 'anthropic');
      } else if (config.aiProvider === 'gemini') {
        result = await callUniversalAI('https://generativelanguage.googleapis.com/v1beta/models', activeKey, prompt, modelName, 'gemini');
      } else if (config.aiProvider === 'groq') {
        result = await callUniversalAI('https://api.groq.com/openai/v1', activeKey, prompt, modelName, 'openai');
      } else if (config.aiProvider === 'custom') {
        result = await callUniversalAI(config.baseUrl, activeKey, prompt, modelName, 'custom');
      } else {
        throw new Error('Invalid AI Provider selected.');
      }
      success = true; // if we get here, the call worked.
    } catch (err) {
      console.error(`Attempt failed with key index ${currentKeyIndex}`, err);
      fallbackText += `Attempt ${currentKeyIndex === -1 ? 'Primary' : `Fallback ${currentKeyIndex + 1}`} failed: ${err.message}\n`;
      currentKeyIndex++;
    }
  }

  if (!success) {
    throw new Error(`All keys failed. \n\nDetails:\n${fallbackText}`);
  }

  return result;
}

async function callUniversalAI(baseUrl, apiKey, userPrompt, modelName, provider) {
  if (!baseUrl) throw new Error('Base URL is required.');

  const isGemini = provider === 'gemini' || baseUrl.includes('generativelanguage.googleapis.com') || baseUrl.includes('gemini');
  const isAnthropic = provider === 'anthropic' || baseUrl.includes('anthropic.com');

  let finalUrl = baseUrl;
  let headers = { 'Content-Type': 'application/json' };
  let body = {};
  
  if (isGemini) {
    if (!finalUrl.includes(':generateContent')) {
      finalUrl = finalUrl.endsWith('/') ? `${finalUrl}${modelName}:generateContent` : `${finalUrl}/${modelName}:generateContent`;
    }
    if (!finalUrl.includes('key=')) {
      finalUrl = finalUrl.includes('?') ? `${finalUrl}&key=${apiKey}` : `${finalUrl}?key=${apiKey}`;
    }
    
    headers['x-goog-api-key'] = apiKey;
    body = {
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: { response_mime_type: "application/json" }
    };
  } else if (isAnthropic) {
    finalUrl = finalUrl.endsWith('/') ? finalUrl + 'messages' : finalUrl + '/messages';
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerously-allow-browser'] = 'true';
    body = {
      model: modelName || 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    };
  } else {
    // OpenAI/Custom Standard Format
    finalUrl = finalUrl.endsWith('/') ? finalUrl + 'chat/completions' : finalUrl + '/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    body = {
      model: modelName || 'default',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    };
  }

  const res = await fetch(finalUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI API Error Response:", errText);
    try {
      const err = JSON.parse(errText);
      const msg = err.error?.message || errText;
      throw new Error(msg);
    } catch {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
  }

  const dataPrefixText = await res.text();
  try {
    const data = JSON.parse(dataPrefixText);
    if (isGemini) {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      return text;
    } else if (isAnthropic) {
      return data.content[0].text;
    }
    return data.choices[0].message.content;
  } catch (e) {
    console.error("Failed to parse JSON response. Raw Response:", dataPrefixText);
    throw new Error("Invalid response from API. Check extension console.");
  }
}
