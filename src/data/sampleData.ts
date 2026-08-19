import { SampleDocument } from '../types';

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'sample-quarterly-review',
    title: 'Q3 Enterprise Product Strategy & Performance Memo',
    category: 'Business & Strategy',
    description: 'Executive overview with quarterly metrics, key headwinds, growth milestones, and strategic priorities.',
    targetTab: 'summarizer',
    text: `CONFIDENTIAL: EXECUTIVE LEADERSHIP BRIEFING
Subject: Q3 Enterprise Performance, Product Milestones, and Q4 Strategic Directives
Date: August 14, 2026
From: Strategic Operations & Product Analytics Directorate

1. Executive Overview & Financial Highlights
During Q3, our cloud productivity suite achieved $48.6M in Net Recurring Revenue (NRR), reflecting an 18.4% year-over-year expansion. Enterprise gross margins strengthened to 78.2%, driven by infrastructure optimizations across multi-tenant GPU clusters and dynamic cache scaling. Customer acquisition cost (CAC) decreased by 12% following targeted developer ecosystem initiatives.

2. Product Milestones & Deployment Velocity
- Smart Document Pipeline 2.0: Successfully transitioned 65,000 active tier-1 enterprise organizations to the real-time contextual intelligence engine. Observed latency dropped by 34% (mean response time: 240ms).
- Collaboration Workspaces: Shipped automated meeting synthesis and unified action-item extraction, driving daily active user (DAU) retention from 61% to 74%.
- Security & Compliance: Attained SOC 2 Type II recertification and ISO 27001 compliance for all regional datacenter clusters.

3. Key Challenges & Headwinds
- Asia-Pacific Enterprise Sales Cycle: Extended from an average of 42 days to 68 days due to heightened procurement scrutiny and data sovereignty regulations in Japan and Singapore.
- Mobile Client Battery Consumption: Client telemetry revealed unoptimized background socket reconnects on iOS v19 builds, elevating background power drain by 8%. Patch 4.2.1 is currently in staging.

4. Immediate Action Directives & Ownership:
- Sarah Jenkins (VP Product): Finalize the unified workflow automation SDK beta release by September 15.
- David Chen (Head of Infrastructure): Scale backup inference failover nodes across Central Europe to guarantee 99.995% SLA.
- Elena Rostova (VP Customer Success): Launch enterprise onboarding sprint targeting the 120 delayed accounts in APAC before the end of the fiscal month.
- Budget Allocation: $1.8M reallocated toward automated stress-testing pipelines and localized compliance tooling.`,
  },
  {
    id: 'sample-meeting-transcript',
    title: 'Engineering & Product Sync: AI Feature Launch',
    category: 'Team Meetings',
    description: 'Meeting notes detailing frontend architecture, API latency targets, UI redesign tasks, and launch timeline.',
    targetTab: 'analyzer',
    text: `Meeting Transcript: Cross-Functional AI Assistant Core Launch
Participants: Marcus (Tech Lead), Priya (Product Manager), Liam (Senior Frontend Engineer), Aisha (QA Lead)
Date: Yesterday at 2:00 PM EST

Priya: Thanks everyone for joining. We have 10 days until our public beta rollout for the AI Smart Assistant dashboard. Marcus, can you give us an update on the backend API latency?

Marcus: Sure. We migrated our inference proxy to the Gemini 3.7 Flash model via Google GenAI SDK. Response times for the document summarizer endpoint are hovering around 320ms, and structured JSON entity extraction is taking under 500ms. We set up user-agent telemetry headers and wrapped error handling with exponential backoff.

Liam: On the client side, I've implemented the tabbed workspace with Framer Motion transitions. The markdown renderer handles tables, syntax highlighting, and copy-to-clipboard actions cleanly. I still need to wire up the drag-and-drop file upload zone and the sentiment visualization gauge.

Aisha: From QA, we noticed that when users paste extremely long text (over 30,000 words), the UI doesn't freeze, but we should show a progress indicator or word counter badge so the user knows analysis is running. Also, error boundaries must catch missing API keys gracefully without crashing the whole viewport.

Priya: Great call, Aisha. Liam, please add the visual loading skeleton and character counter today. Marcus, double check that CORS and JSON payload limits allow up to 10MB document payloads for PDFs and text files.

Marcus: Will do. I'll increase the Express body parser limit to 15MB and push the commit by 4 PM.

Liam: I'll wrap the file uploader and sample loaders by tomorrow morning.

Priya: Let's do a live sanity test on Friday at 11 AM before freezing code for release candidate 1.`,
  },
  {
    id: 'sample-customer-feedback',
    title: 'Customer Feedback & Escalation Email',
    category: 'Customer Experience',
    description: 'Detailed customer review highlighting praise, friction points, feature requests, and support responsiveness.',
    targetTab: 'analyzer',
    text: `From: Eleanor Vance <e.vance@vanguard-logistics.io>
To: Support & Product Team <support@ai-smart-assistant.app>
Subject: Feedback on Enterprise Tier Trial & Urgent Feature Request

Hello Team,

Our 150-person operations team has been testing your Smart Assistant platform for the past three weeks to summarize our daily logistics memos and dispatch reports.

First, I want to commend the summarization quality. The bulleted key takeaways and automated action item checklists have saved our logistics managers roughly 45 minutes every morning. The speed is remarkable compared to the previous legacy tool we used.

However, we encountered a few pain points that are currently blocking our full annual contract sign-off:
1. Export Formats: We need one-click export directly to Markdown and clean plain text, rather than just copying to clipboard.
2. Tone Adjustment: Some of our team members generate client-facing emails using the Content Studio. While the "Professional" tone is great, having a dedicated "Urgent/Dispatch" or "Executive" tone preset would be extremely helpful.
3. Multi-file batch support: In the future, being able to analyze 2 or 3 shift logs at once would be phenomenal.

Our renewal discussion with our CFO is scheduled for next Tuesday. If the export options and customized tone presets are accessible, we are ready to move forward with the 3-year Enterprise contract ($72,000 ARR).

Looking forward to your guidance!

Best regards,
Eleanor Vance
Director of Logistics Operations
Vanguard Global Logistics`,
  },
  {
    id: 'sample-tech-spec',
    title: 'Distributed System Architecture & Security Spec',
    category: 'Technical Documentation',
    description: 'Technical document on microservice architecture, token security, caching strategies, and telemetry.',
    targetTab: 'generator',
    text: `SYSTEM ARCHITECTURE SPECIFICATION: AI SMART ASSISTANT ENTERPRISE GATEWAY

1. System Architecture Overview
The system employs a high-concurrency Node.js / Express reverse proxy architecture integrated with Vite client rendering and Google's Gemini generative intelligence backbone. 

2. Security & Credential Isolation
- API Token Protection: All generative AI credentials are securely encapsulated within server-side environment parameters (process.env.GEMINI_API_KEY). No API secrets or model headers are ever exposed to the client bundle.
- Request Validation: Inbound payloads undergo schema validation using TypeScript typing. Malformed JSON or oversized multipart payloads (>10MB) are rejected with HTTP 413 Payload Too Large.
- Sanitization: All AI-generated markdown strings pass through safe HTML parsers with script-injection safeguards.

3. Performance Optimization & Caching
- Prompt Engineering: Structured JSON schemas enforce deterministic output formatting for sentiment analysis and entity extraction, eliminating regex parsing overhead.
- Telemetry: Built-in User-Agent telemetry tagging provides request tracking without storing personally identifiable information.`,
  },
];
