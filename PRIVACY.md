# Privacy Policy

**Effective Date:** April 2026

At Aerox AI Fill, privacy is fundamentally engineered into our architecture. This extension is designed to process your sensitive documents directly in your browser. 

## No Data Storage
### 1. Local Processing
Any document parsing, text extraction, and caching happen 100% locally. 
- We use a browser-native implementation of `pdf.js` inside an extension Web Worker.
- Your raw PDF files **never** leave your device.
- Recent parses are temporarily cached locally on your device via IndexedDB (a browser API) and can be cleared instantly. 

### 2. Zero Telemetry
- No product usage tracking.
- No analytics.
- We do not collect, monitor, nor sell any identifiable information. 

## API Usage Clarity
Aerox AI Fill explicitly acts as a pass-through layer between your local text and the Large Language Models (LLM) you choose (such as OpenAI, Anthropic, Gemini, Groq, or localized endpoints).
- When you use "Auto-Fill," only the visible names of the webpage's form fields (like `id` or `class`) and your extracted file text are securely transmitted directly to your configured API endpoint.
- We do **not** run an intermediate server. Your interactions are between your browser and the underlying AI provider.
- We utilize Chrome’s `chrome.storage.local` to securely persist your API keys directly down to the local file system level for rapid fail-overs.

For questions, please refer to the documentation of the specific artificial intelligence endpoint providers whose API keys you configure.
