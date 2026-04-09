# Third-Party Notices and Credits

Aerox AI Fill is grateful for the open-source software and foundational models that make this application possible. This document contains licenses and notices for third-party software components incorporated into this extension.

### Core Libraries

1. **PDF.js**
   - **Copyright**: Mozilla and individual contributors
   - **License**: Apache-2.0
   - **Source**: [https://github.com/mozilla/pdf.js](https://github.com/mozilla/pdf.js)
   - Aerox AI leverages `pdf.min.js` and `pdf.worker.min.js` to securely analyze and extract texts from client-side PDFs directly inside the Web Worker.

### APIs / Foundational Models

This extension acts as a client wrapper. Users provide their own keys to connect with these systems:
- **OpenAI (GPT-4o)**: For cutting-edge contextual reasoning. ([docs](https://platform.openai.com/docs))
- **Anthropic (Claude 3.5, Haiku)**: Specialized long-context extraction. ([docs](https://docs.anthropic.com/en/docs/welcome))
- **Google Gemini**: Rapid integration with the Google ecosystem. ([docs](https://ai.google.dev/docs))
- **Groq (Llama-3)**: Blazing fast edge inference. ([docs](https://console.groq.com/docs/quickstart))

Aerox AI Fill claims no ownership over the intellectual property, model weights, or specific APIs belonging to the respective companies listed above.
