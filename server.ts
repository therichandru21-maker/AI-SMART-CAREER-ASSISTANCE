import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";
import { extractCareerFile, extractProjectEvidence } from "./careerAssistant.js";

dotenv.config();

const app = express();
const PORT = 8080;
const HOSTNAME = "smartassistai";
const OPENAI_MODEL = "gpt-5.4-mini";

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

let aiClient: OpenAI | null = null;

function getAI(): OpenAI {
  if (!aiClient) {
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return aiClient;
}

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 5);
}

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    model: OPENAI_MODEL,
    hasApiKey: hasOpenAIKey(),
    timestamp: new Date().toISOString(),
  });
});

function countWords(str: string): number {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

function dataUrl(mimeType: string, base64Data: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}

// ==========================================
// 1. Text & Document Summarizer API
// ==========================================
app.post("/api/OpenAi/summarize", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      text,
      format = "executive",
      length = "medium",
      targetAudience = "general",
      imagePart,
    } = req.body;

    if (!text && !imagePart) {
      res.status(400).json({ error: "Please provide text or an attachment to summarize." });
      return;
    }

    const ai = getAI();
    const originalWords = countWords(text || "");

    const prompt = `You are a world-class executive research assistant and productivity analyst.
Summarize and extract key intelligence from the following content.

Format requested: ${format}
Length level: ${length}
Target audience: ${targetAudience}

INPUT TEXT:
"""
${text || "(See attached image/document)"}
"""

Return a structured JSON response.
- tldr: A concise 1-2 sentence high-impact summary.
- executiveSummary: A well-written, coherent summary (1 to 3 paragraphs depending on length parameter).
- keyPoints: An array of 4-7 the most critical insights/findings.
- actionItems: An array of concrete next steps, ownerships, or action items extracted from the text (or recommended actions if not explicit).
- suggestedQuestions: 3-4 insightful follow-up questions the user might ask about this text.`;

    const content: any[] = [{ type: "input_text", text: prompt }];

    if (imagePart?.data && imagePart?.mimeType) {
      content.push({
        type: "input_image",
        image_url: dataUrl(imagePart.mimeType, imagePart.data),
      });
    }

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "document_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tldr: { type: "string" },
              executiveSummary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              actionItems: { type: "array", items: { type: "string" } },
              suggestedQuestions: { type: "array", items: { type: "string" } },
            },
            required: [
              "tldr",
              "executiveSummary",
              "keyPoints",
              "actionItems",
              "suggestedQuestions",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const summaryWords = countWords(
      (parsed.executiveSummary || "") + " " + (parsed.tldr || "")
    );
    const reductionPct =
      originalWords > 0
        ? Math.max(0, Math.round(((originalWords - summaryWords) / originalWords) * 100))
        : 0;
    const readingTime = Math.max(1, Math.ceil(summaryWords / 200));

    res.json({
      tldr: parsed.tldr || "Summary generated successfully.",
      executiveSummary: parsed.executiveSummary || "",
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      suggestedQuestions: parsed.suggestedQuestions || [],
      readingTimeMinutes: readingTime,
      wordCount: summaryWords,
      originalWordCount: originalWords,
      reductionPercentage: reductionPct,
    });
  } catch (error: any) {
    console.error("Summarize API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate summary." });
  }
});

// ==========================================
// 2. Document & Text Analyzer API
// ==========================================
app.post("/api/OpenAi/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, imagePart } = req.body;

    if (!text && !imagePart) {
      res.status(400).json({ error: "Please provide text or an attachment to analyze." });
      return;
    }

    const ai = getAI();
    const words = countWords(text || "");

    const prompt = `You are an expert linguistic analyst, strategic editor, and productivity coach.
Perform a comprehensive deep analysis of the following content.

INPUT CONTENT:
"""
${text || "(See attached image/document)"}
"""

Analyze and evaluate:
1. Overall Tone
2. Sentiment: choose positive, neutral, negative, or mixed
3. Sentiment Score: integer 0 to 100
4. Readability Level
5. Key Topics: 3-6 core themes
6. Named Entities: objects with name, type, and description
7. Action Items: objects with task, priority, and optional owner
8. Strengths: 2-4 points
9. Suggestions: 2-4 concrete improvements with original, suggested, explanation, and type
10. Insights: strategic insights, assumptions, risks, or opportunities.`;

    const content: any[] = [{ type: "input_text", text: prompt }];

    if (imagePart?.data && imagePart?.mimeType) {
      content.push({
        type: "input_image",
        image_url: dataUrl(imagePart.mimeType, imagePart.data),
      });
    }

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "document_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallTone: { type: "string" },
              sentiment: { type: "string" },
              sentimentScore: { type: "integer" },
              readabilityLevel: { type: "string" },
              keyTopics: { type: "array", items: { type: "string" } },
              entities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["name", "type", "description"],
                  additionalProperties: false,
                },
              },
              actionItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task: { type: "string" },
                    priority: { type: "string" },
                    owner: { type: "string" },
                  },
                  required: ["task", "priority", "owner"],
                  additionalProperties: false,
                },
              },
              strengths: { type: "array", items: { type: "string" } },
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    original: { type: "string" },
                    suggested: { type: "string" },
                    explanation: { type: "string" },
                    type: { type: "string" },
                  },
                  required: ["original", "suggested", "explanation", "type"],
                  additionalProperties: false,
                },
              },
              insights: { type: "string" },
            },
            required: [
              "overallTone",
              "sentiment",
              "sentimentScore",
              "readabilityLevel",
              "keyTopics",
              "entities",
              "actionItems",
              "strengths",
              "suggestions",
              "insights",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const readingTime = Math.max(1, Math.ceil(words / 200));

    res.json({
      overallTone: parsed.overallTone || "Neutral",
      sentiment: parsed.sentiment || "neutral",
      sentimentScore:
        typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 50,
      readabilityLevel: parsed.readabilityLevel || "Standard",
      readingTimeMinutes: readingTime,
      keyTopics: parsed.keyTopics || [],
      entities: parsed.entities || [],
      actionItems: parsed.actionItems || [],
      strengths: parsed.strengths || [],
      suggestions: parsed.suggestions || [],
      insights: parsed.insights || "",
    });
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze document." });
  }
});

// ==========================================
// 3. Content Generation & Writing Studio API
// ==========================================
app.post("/api/OpenAi/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      template = "email",
      topic,
      keyPoints = "",
      tone = "professional",
      length = "standard",
      audience = "General",
    } = req.body;

    if (!topic) {
      res.status(400).json({ error: "Please provide a topic or prompt for content generation." });
      return;
    }

    const ai = getAI();

    const templateInstructions: Record<string, string> = {
      email: "Draft a high-impact, polished email with subject line, clear greeting, organized body, and professional sign-off.",
      article: "Write a well-structured article with markdown headings (#, ##, ###), compelling introduction, insightful sub-sections, and conclusion.",
      agenda: "Create a crisp meeting agenda with objectives, timed discussion topics, required preparation, and expected deliverables.",
      bug_report: "Create a developer-ready bug report with Summary, Steps to Reproduce, Expected Behavior, Actual Behavior, System Environment, and Severity.",
      pitch: "Draft an executive elevator pitch / deck outline with Problem Statement, Solution, Market Opportunity, Business Model, and Call to Action.",
      social_post: "Craft an engaging social media post (LinkedIn / Twitter style) with catchy hook, clear value bullet points, relevant hashtags, and engaging CTA.",
      code: "Provide a clean, robust, well-commented code solution with technical explanation, time complexity, and usage example.",
      freeform: "Generate thoughtful, high-quality, formatted content tailored to the instructions.",
    };

    const instruction =
      templateInstructions[template] || templateInstructions.freeform;

    const prompt = `You are an elite productivity copywriter and subject matter expert.
Task: ${instruction}

PARAMETERS:
- Primary Topic / Directive: ${topic}
- Key Points / Requirements: ${keyPoints || "None specified, use best industry practices"}
- Desired Tone: ${tone}
- Desired Length: ${length}
- Target Audience: ${audience}

OUTPUT REQUIREMENTS:
- title: A catchy, professional title or subject line.
- content: The complete generated content in pristine Markdown formatting.
- tags: 3-5 relevant thematic tags.
- tips: 2-3 expert delivery/writing tips to maximize impact.
- estimatedReadingTime: e.g. "2 min read"`;

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "generated_content",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              tips: { type: "array", items: { type: "string" } },
              estimatedReadingTime: { type: "string" },
            },
            required: [
              "title",
              "content",
              "tags",
              "tips",
              "estimatedReadingTime",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content." });
  }
});

// ==========================================
// 4. Intelligent Conversational Q&A API
// ==========================================
app.post("/api/openai/qa", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      question,
      history = [],
      contextDocument = "",
      persona = "smart_assistant",
    } = req.body;

    if (!question) {
      res.status(400).json({ error: "Please provide a question or message." });
      return;
    }

    const ai = getAI();

    const personaInstructions: Record<string, string> = {
      smart_assistant:
        "You are the AI Smart Assistant: concise, deeply knowledgeable, highly actionable, and polite.",
      tech_lead:
        "You are a Senior Principal Software Architect: provide technical depth, system design best practices, trade-offs, and clean code.",
      executive_coach:
        "You are a C-level Executive Strategist: focus on business value, ROI, high-level clarity, and decision frameworks.",
      research_analyst:
        "You are a meticulous Senior Research Analyst: provide citations, structured breakdowns, logical reasoning, and evidence-based analysis.",
      copy_editor:
        "You are a Master Copy Editor: focus on impeccable grammar, clarity, persuasive rhetoric, and stylistic precision.",
    };

    const systemInstruction =
      (personaInstructions[persona] || personaInstructions.smart_assistant) +
      `
Always format responses in clean, beautiful Markdown with appropriate bullet points, bold key terms, and code blocks if applicable.
At the very end of your response, provide a distinct section labeled "### Suggested Follow-ups" with 2-3 brief, relevant follow-up questions the user might want to explore next.`;

    let userPromptWithContext = "";
    if (contextDocument && contextDocument.trim().length > 0) {
      userPromptWithContext += `REFERENCE CONTEXT DOCUMENT:\n"""\n${contextDocument}\n"""\n\n`;
    }
    userPromptWithContext += `USER QUESTION:\n${question}`;

    const input: any[] = [
      {
        role: "developer",
        content: [{ type: "input_text", text: systemInstruction }],
      },
    ];

    for (const msg of history.slice(-6)) {
      input.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: [
          {
            type: msg.role === "assistant" ? "output_text" : "input_text",
            text: msg.content,
          },
        ],
      });
    }

    input.push({
      role: "user",
      content: [{ type: "input_text", text: userPromptWithContext }],
    });

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input,
    });

    const fullText = response.output_text || "";

    let cleanedContent = fullText;
    const followUps: string[] = [];

    const followUpMarker = fullText.lastIndexOf("### Suggested Follow-ups");
    if (followUpMarker !== -1) {
      cleanedContent = fullText.substring(0, followUpMarker).trim();
      const followUpSection = fullText.substring(followUpMarker);
      const lines = followUpSection.split("\n");

      for (const line of lines) {
        const trimmed = line.replace(/^[-*•\d.]+\s*/, "").trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.length > 5) {
          followUps.push(trimmed);
        }
      }
    }

    if (followUps.length === 0) {
      followUps.push(
        "Can you elaborate on the key points?",
        "What are the practical next steps?",
        "Can you simplify this for a non-technical audience?"
      );
    }

    res.json({
      content: cleanedContent,
      suggestedFollowUps: followUps.slice(0, 3),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  } catch (error: any) {
    console.error("Q&A API Error:", error);
    res.status(500).json({ error: error.message || "Failed to process question." });
  }
});

// ==========================================
// 5. Quick Productivity Transform Tools API
// ==========================================
app.post("/api/OpenAi/transform", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, action } = req.body;

    if (!text) {
      res.status(400).json({ error: "Please provide text to transform." });
      return;
    }

    const ai = getAI();

    const actionPrompts: Record<string, string> = {
      fix_grammar:
        "Fix all grammatical, spelling, and punctuation errors while maintaining the original tone and meaning. Highlight changes.",
      bulletify:
        "Convert this prose into crisp, well-structured bullet points organized by importance.",
      make_formal:
        "Rewrite this in an elegant, polished, professional executive tone suitable for corporate leadership.",
      simplify_eli5:
        "Explain and rewrite this in extremely simple, friendly terms as if explaining to a 10-year-old.",
      translate_es: "Translate this accurately into natural, fluent Spanish.",
      translate_fr: "Translate this accurately into natural, fluent French.",
      translate_de: "Translate this accurately into natural, fluent German.",
      translate_ja: "Translate this accurately into natural, polite Japanese.",
      to_table:
        "Analyze the structured data, comparisons, or items in this text and present it as a clean Markdown table with headers.",
      extract_checklist:
        "Extract all actionable tasks from this text into a clear markdown checklist format with '- [ ] Task (Owner/Deadline if mentioned)'.",
    };

    const instruction =
      actionPrompts[action] || "Improve and polish this text.";

    const prompt = `Directive: ${instruction}

ORIGINAL TEXT:
"""
${text}
"""

Provide the output in clean, formatted Markdown. Keep explanations minimal and deliver the transformed text directly.`;

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
    });

    res.json({
      transformedText: response.output_text || "",
      action,
      originalWordCount: countWords(text),
      transformedWordCount: countWords(response.output_text || ""),
    });
  } catch (error: any) {
    console.error("Transform API Error:", error);
    res.status(500).json({ error: error.message || "Failed to transform text." });
  }
});

// ==========================================
// 6. AI Career Assistant
// ==========================================
app.post("/api/OpenAi/career-match", async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobDescription, profile = "", file } = req.body;

    if (!jobDescription?.trim()) {
      res.status(400).json({ error: "Please provide a job or internship description." });
      return;
    }

    if (!profile?.trim() && !file) {
      res.status(400).json({ error: "Please provide a candidate profile or upload a file." });
      return;
    }

    const ai = getAI();
    let extractedText = "";
    let projectEvidence = "";

    if (file?.data && file?.name) {
      extractedText = await extractCareerFile(file);

      if (file.name.toLowerCase().endsWith(".zip")) {
        const evidence = extractProjectEvidence(extractedText);
        projectEvidence = [
          `Languages: ${[...evidence.languages].join(", ") || "None detected"}`,
          `Frameworks/Libraries: ${[...evidence.frameworks].join(", ") || "None detected"}`,
          `Technologies: ${[...evidence.technologies].join(", ") || "None detected"}`,
        ].join("\n");
      }
    }

    const candidateProfile = [profile.trim(), extractedText.trim()]
      .filter(Boolean)
      .join("\n\n");

    if (!candidateProfile && !file?.name?.toLowerCase().endsWith(".pdf")) {
      res.status(400).json({ error: "The uploaded file appears to be empty or invalid." });
      return;
    }

    const prompt = `You are an AI Career Assistant and hiring analyst.

JOB / INTERNSHIP DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE:
${candidateProfile || "(Candidate information is in the attached PDF document.)"}

PROJECT EVIDENCE DETECTED FROM UPLOADED CODE:
${projectEvidence || "No code-project evidence was detected."}

RULES:
1. Never invent skills, experience, education, projects, or achievements.
2. Count a skill as matching only when it is explicitly present in the candidate information or supported by uploaded project evidence.
3. Keep the match percentage realistic. 90%+ requires most essential requirements to be satisfied.
4. Identify critical gaps and explain their impact.
5. Recommendations must be specific and actionable.
6. Build a practical roadmap with timeframes.
7. Treat uploaded project evidence as supporting evidence, not as proof of professional experience.`;

    const content: any[] = [{ type: "input_text", text: prompt }];

    if (file?.name?.toLowerCase().endsWith(".pdf") && file?.data) {
      content.push({
        type: "input_file",
        filename: file.name,
        file_data: dataUrl(file.mimeType || "application/pdf", file.data),
      });
    }

    const response = await ai.responses.create({
      model: OPENAI_MODEL,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "career_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              jobSummary: { type: "string" },
              requiredSkills: { type: "array", items: { type: "string" } },
              matchingSkills: { type: "array", items: { type: "string" } },
              missingSkills: { type: "array", items: { type: "string" } },
              matchPercentage: { type: "integer" },
              matchReason: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
              roadmap: { type: "array", items: { type: "string" } },
            },
            required: [
              "jobSummary",
              "requiredSkills",
              "matchingSkills",
              "missingSkills",
              "matchPercentage",
              "matchReason",
              "recommendations",
              "roadmap",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    let result: any;
    try {
      result = JSON.parse(response.output_text || "{}");
    } catch {
      res.status(500).json({
        error: "The AI returned an invalid career analysis. Please try again.",
      });
      return;
    }

    result.matchPercentage = Math.max(
      0,
      Math.min(100, Number(result.matchPercentage) || 0)
    );

    res.json(result);
  } catch (error: any) {
    console.error("Career Match API Error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate career analysis.",
    });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `\n✨ AI Smart Assistant Server is running!\n📍 Access it at: http://${HOSTNAME}:${PORT}\n`
    );
  });
}

startServer();