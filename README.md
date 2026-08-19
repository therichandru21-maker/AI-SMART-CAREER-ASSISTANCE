# AI Smart Career Assistant

Unified version of the original **AI Smart Assistant** and **AI Career Assistant**.

## What was merged

### Smart Assistant capabilities
- Text summarization
- Document analysis
- Content generation
- Question answering / chat
- Quick transformation tools
- File/document workflows

### Career Assistant capabilities
- Job/internship description analysis
- Candidate profile analysis
- Resume/project upload support
- ZIP project evidence extraction
- Technology/framework detection from code
- Evidence-based career match score
- Matching and missing skill analysis
- Actionable recommendations
- Preparation roadmap

## Architecture

`React/Vite UI -> Express API -> Gemini`

The Career Assistant is now a native tab in the same Smart Assistant application. The career workflow does **not** launch a separate Streamlit app.

Uploaded career files are handled server-side. TXT, DOCX and ZIP files are extracted locally; PDF files are sent to Gemini as native document input. API keys remain server-side through `GEMINI_API_KEY`.

## Run

1. Create `.env` from `.env.example` and add a newly generated Gemini API key.
2. Install dependencies:

```bash
npm install
```

3. Start development mode:

```bash
npm run dev
```

4. Open the local URL printed by the server.

## Security

- Never commit `.env`.
- Never paste an API key into source code or chat.
- If an API key was exposed, revoke it and generate a new one.
