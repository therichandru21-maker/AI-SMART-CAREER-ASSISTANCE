import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  extractCareerFile,
  extractProjectEvidence,
} from "./careerAssistant.js";

dotenv.config();

const app = express();

const PORT = 8080;
const HOSTNAME = "smartassistai";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

type GroqMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: any;
};

type JsonSchema = Record<string, any>;

function hasGroqKey(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY &&
      process.env.GROQ_API_KEY.trim().length > 5
  );
}

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add your Groq API key to the .env file."
    );
  }

  return key;
}

async function groqRequest(
  messages: GroqMessage[],
  options: {
    model?: string;
    jsonSchema?: {
      name: string;
      schema: JsonSchema;
      strict?: boolean;
    };
    temperature?: number;
    maxCompletionTokens?: number;
  } = {}
): Promise<{ text: string; raw: any }> {
  const body: any = {
    model: options.model || GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.2,
    max_completion_tokens:
      options.maxCompletionTokens ?? 4096,
  };

  if (options.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: options.jsonSchema.name,
        strict: options.jsonSchema.strict ?? true,
        schema: options.jsonSchema.schema,
      },
    };
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Groq API request failed with status ${response.status}.`;

    const error = new Error(message) as Error & {
      status?: number;
      code?: string;
    };

    error.status = response.status;
    error.code = data?.error?.code;

    throw error;
  }

  return {
    text:
      data?.choices?.[0]?.message?.content || "",
    raw: data,
  };
}

function parseJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned);
}

function countWords(str: string): number {
  return str.trim()
    ? str.trim().split(/\s+/).length
    : 0;
}

function dataUrl(
  mimeType: string,
  base64Data: string
): string {
  return `data:${mimeType};base64,${base64Data}`;
}

function errorMessage(
  error: any,
  fallback: string
): string {
  return error?.message || fallback;
}

function jsonSchemaResponse(
  name: string,
  schema: JsonSchema,
  strict = true
) {
  return {
    name,
    schema,
    strict,
  };
}

/* ==========================================
   HEALTH CHECK
========================================== */

app.get(
  "/api/health",
  (req: Request, res: Response) => {
    res.json({
      status: "ok",
      provider: "Groq",
      model: GROQ_MODEL,
      visionModel: GROQ_VISION_MODEL,
      hasApiKey: hasGroqKey(),
      timestamp: new Date().toISOString(),
    });
  }
);

/* ==========================================
   1. SUMMARIZE
========================================== */

app.post(
  "/api/groq/summarize",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text,
        format = "executive",
        length = "medium",
        targetAudience = "general",
        imagePart,
      } = req.body;

      if (!text && !imagePart) {
        res.status(400).json({
          error:
            "Please provide text or an attachment to summarize.",
        });
        return;
      }

      const originalWords = countWords(text || "");

      const prompt = `
You are a world-class executive research assistant and productivity analyst.

Summarize and extract key intelligence from the following content.

Format requested: ${format}
Length level: ${length}
Target audience: ${targetAudience}

INPUT TEXT:
"""
${text || "(See attached image)"}
"""

Return only valid JSON.

Requirements:
- tldr: concise 1-2 sentence summary
- executiveSummary: clear summary
- keyPoints: 4-7 critical insights
- actionItems: concrete next steps
- suggestedQuestions: 3-4 useful follow-up questions
`;

      const content: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ];

      let model = GROQ_MODEL;
      let strict = true;

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        model = GROQ_VISION_MODEL;
        strict = false;

        content.push({
          type: "image_url",
          image_url: {
            url: dataUrl(
              imagePart.mimeType,
              imagePart.data
            ),
          },
        });
      }

      const response = await groqRequest(
        [
          {
            role: "system",
            content:
              "You are a precise document intelligence assistant. Return only valid JSON.",
          },
          {
            role: "user",
            content,
          },
        ],
        {
          model,
          jsonSchema: jsonSchemaResponse(
            "document_summary",
            {
              type: "object",
              properties: {
                tldr: {
                  type: "string",
                },
                executiveSummary: {
                  type: "string",
                },
                keyPoints: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                actionItems: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                suggestedQuestions: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
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
            strict
          ),
          temperature: 0.2,
          maxCompletionTokens: 4096,
        }
      );

      const parsed = parseJson(response.text);

      const summaryWords = countWords(
        `${parsed.executiveSummary || ""} ${
          parsed.tldr || ""
        }`
      );

      const reductionPct =
        originalWords > 0
          ? Math.max(
              0,
              Math.round(
                ((originalWords - summaryWords) /
                  originalWords) *
                  100
              )
            )
          : 0;

      const readingTime = Math.max(
        1,
        Math.ceil(summaryWords / 200)
      );

      res.json({
        tldr:
          parsed.tldr ||
          "Summary generated successfully.",
        executiveSummary:
          parsed.executiveSummary || "",
        keyPoints:
          parsed.keyPoints || [],
        actionItems:
          parsed.actionItems || [],
        suggestedQuestions:
          parsed.suggestedQuestions || [],
        readingTimeMinutes: readingTime,
        wordCount: summaryWords,
        originalWordCount: originalWords,
        reductionPercentage: reductionPct,
      });
    } catch (error: any) {
      console.error(
        "Groq Summarize API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to generate summary."
        ),
      });
    }
  }
);

/* ==========================================
   2. ANALYZE
========================================== */

app.post(
  "/api/groq/analyze",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text,
        imagePart,
      } = req.body;

      if (!text && !imagePart) {
        res.status(400).json({
          error:
            "Please provide text or an attachment to analyze.",
        });
        return;
      }

      const words = countWords(text || "");

      const prompt = `
You are an expert linguistic analyst, strategic editor, and productivity coach.

Perform a comprehensive analysis of the following content.

INPUT CONTENT:
"""
${text || "(See attached image)"}
"""

Analyze:

1. Overall tone
2. Sentiment
3. Sentiment score from 0 to 100
4. Readability level
5. Key topics
6. Named entities
7. Action items
8. Strengths
9. Suggestions
10. Strategic insights

Return only valid JSON matching the schema.
`;

      const content: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ];

      let model = GROQ_MODEL;
      let strict = true;

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        model = GROQ_VISION_MODEL;
        strict = false;

        content.push({
          type: "image_url",
          image_url: {
            url: dataUrl(
              imagePart.mimeType,
              imagePart.data
            ),
          },
        });
      }

      const response = await groqRequest(
        [
          {
            role: "system",
            content:
              "You are a precise document analysis assistant. Return only JSON.",
          },
          {
            role: "user",
            content,
          },
        ],
        {
          model,
          jsonSchema: jsonSchemaResponse(
            "document_analysis",
            {
              type: "object",
              properties: {
                overallTone: {
                  type: "string",
                },
                sentiment: {
                  type: "string",
                },
                sentimentScore: {
                  type: "integer",
                },
                readabilityLevel: {
                  type: "string",
                },
                keyTopics: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                      },
                      type: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: [
                      "name",
                      "type",
                      "description",
                    ],
                    additionalProperties: false,
                  },
                },
                actionItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task: {
                        type: "string",
                      },
                      priority: {
                        type: "string",
                      },
                      owner: {
                        type: "string",
                      },
                    },
                    required: [
                      "task",
                      "priority",
                      "owner",
                    ],
                    additionalProperties: false,
                  },
                },
                strengths: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      original: {
                        type: "string",
                      },
                      suggested: {
                        type: "string",
                      },
                      explanation: {
                        type: "string",
                      },
                      type: {
                        type: "string",
                      },
                    },
                    required: [
                      "original",
                      "suggested",
                      "explanation",
                      "type",
                    ],
                    additionalProperties: false,
                  },
                },
                insights: {
                  type: "string",
                },
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
            strict
          ),
          temperature: 0.2,
          maxCompletionTokens: 5000,
        }
      );

      const parsed = parseJson(
        response.text
      );

      res.json({
        overallTone:
          parsed.overallTone || "Neutral",

        sentiment:
          parsed.sentiment || "neutral",

        sentimentScore:
          typeof parsed.sentimentScore ===
          "number"
            ? parsed.sentimentScore
            : 50,

        readabilityLevel:
          parsed.readabilityLevel ||
          "Standard",

        readingTimeMinutes: Math.max(
          1,
          Math.ceil(words / 200)
        ),

        keyTopics:
          parsed.keyTopics || [],

        entities:
          parsed.entities || [],

        actionItems:
          parsed.actionItems || [],

        strengths:
          parsed.strengths || [],

        suggestions:
          parsed.suggestions || [],

        insights:
          parsed.insights || "",
      });
    } catch (error: any) {
      console.error(
        "Groq Analyze API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to analyze document."
        ),
      });
    }
  }
);

/* ==========================================
   3. CONTENT GENERATION
========================================== */

app.post(
  "/api/groq/generate",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
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
        res.status(400).json({
          error:
            "Please provide a topic or prompt for content generation.",
        });
        return;
      }

      const templateInstructions: Record<
        string,
        string
      > = {
        email:
          "Draft a polished professional email with subject, greeting, body and sign-off.",

        article:
          "Write a well-structured article with Markdown headings and conclusion.",

        agenda:
          "Create a professional meeting agenda with objectives and discussion topics.",

        bug_report:
          "Create a developer-ready bug report with summary, reproduction steps, expected behavior, actual behavior and severity.",

        pitch:
          "Create an executive pitch covering problem, solution, market opportunity, business model and CTA.",

        social_post:
          "Create an engaging professional social media post with hook, value points, hashtags and CTA.",

        code:
          "Provide clean robust code with explanation and usage example.",

        freeform:
          "Generate high-quality formatted content according to the instructions.",
      };

      const instruction =
        templateInstructions[template] ||
        templateInstructions.freeform;

      const prompt = `
You are an elite productivity copywriter and subject matter expert.

Task:
${instruction}

PARAMETERS:

Primary Topic:
${topic}

Key Points:
${keyPoints || "Use best industry practices"}

Tone:
${tone}

Length:
${length}

Target Audience:
${audience}

Return JSON containing:

- title
- content
- tags
- tips
- estimatedReadingTime
`;

      const response = await groqRequest(
        [
          {
            role: "system",
            content:
              "You are a precise content generation assistant. Return only JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          jsonSchema:
            jsonSchemaResponse(
              "generated_content",
              {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                  },
                  content: {
                    type: "string",
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  tips: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  estimatedReadingTime: {
                    type: "string",
                  },
                },
                required: [
                  "title",
                  "content",
                  "tags",
                  "tips",
                  "estimatedReadingTime",
                ],
                additionalProperties: false,
              }
            ),
          temperature: 0.5,
          maxCompletionTokens: 5000,
        }
      );

      res.json(
        parseJson(response.text)
      );
    } catch (error: any) {
      console.error(
        "Groq Generate API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to generate content."
        ),
      });
    }
  }
);

/* ==========================================
   4. Q&A
========================================== */

app.post(
  "/api/groq/qa",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        question,
        history = [],
        contextDocument = "",
        persona = "smart_assistant",
      } = req.body;

      if (!question) {
        res.status(400).json({
          error:
            "Please provide a question or message.",
        });
        return;
      }

      const personaInstructions: Record<
        string,
        string
      > = {
        smart_assistant:
          "You are the AI Smart Assistant: concise, knowledgeable, actionable and polite.",

        tech_lead:
          "You are a Senior Principal Software Architect. Give technical depth, trade-offs and best practices.",

        executive_coach:
          "You are a C-level Executive Strategist. Focus on business value, ROI and decision frameworks.",

        research_analyst:
          "You are a meticulous Senior Research Analyst. Give structured evidence-based analysis.",

        copy_editor:
          "You are a Master Copy Editor. Focus on grammar, clarity and persuasive writing.",
      };

      const systemInstruction =
        (personaInstructions[persona] ||
          personaInstructions.smart_assistant) +
        `

Always format responses using clean Markdown.

At the end provide:

### Suggested Follow-ups

with 2-3 useful follow-up questions.`;

      const messages: GroqMessage[] = [
        {
          role: "system",
          content: systemInstruction,
        },
      ];

      for (
        const msg of Array.isArray(history)
          ? history.slice(-6)
          : []
      ) {
        if (!msg?.content) continue;

        messages.push({
          role:
            msg.role === "assistant"
              ? "assistant"
              : "user",
          content: String(msg.content),
        });
      }

      let userPrompt = "";

      if (
        contextDocument &&
        contextDocument.trim()
      ) {
        userPrompt += `
REFERENCE CONTEXT DOCUMENT:

"""
${contextDocument}
"""

`;
      }

      userPrompt += `
USER QUESTION:
${question}
`;

      messages.push({
        role: "user",
        content: userPrompt,
      });

      const response =
        await groqRequest(messages, {
          temperature: 0.4,
          maxCompletionTokens: 5000,
        });

      const fullText =
        response.text || "";

      let cleanedContent =
        fullText;

      const followUps: string[] = [];

      const followUpMarker =
        fullText.lastIndexOf(
          "### Suggested Follow-ups"
        );

      if (followUpMarker !== -1) {
        cleanedContent =
          fullText
            .substring(
              0,
              followUpMarker
            )
            .trim();

        const followUpSection =
          fullText.substring(
            followUpMarker
          );

        const lines =
          followUpSection.split("\n");

        for (const line of lines) {
          const trimmed = line
            .replace(
              /^[-*•\d.]+\s*/,
              ""
            )
            .trim();

          if (
            trimmed &&
            !trimmed.startsWith("#") &&
            trimmed.length > 5
          ) {
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
        suggestedFollowUps:
          followUps.slice(0, 3),
        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      });
    } catch (error: any) {
      console.error(
        "Groq Q&A API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to process question."
        ),
      });
    }
  }
);

/* ==========================================
   5. QUICK TRANSFORM
========================================== */

app.post(
  "/api/groq/transform",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text,
        action,
      } = req.body;

      if (!text) {
        res.status(400).json({
          error:
            "Please provide text to transform.",
        });
        return;
      }

      const actionPrompts: Record<
        string,
        string
      > = {
        fix_grammar:
          "Fix grammatical, spelling and punctuation errors while maintaining the original meaning.",

        bulletify:
          "Convert this into clear structured bullet points.",

        make_formal:
          "Rewrite this in an elegant professional executive tone.",

        simplify_eli5:
          "Rewrite this in extremely simple language suitable for a 10-year-old.",

        translate_es:
          "Translate accurately into natural Spanish.",

        translate_fr:
          "Translate accurately into natural French.",

        translate_de:
          "Translate accurately into natural German.",

        translate_ja:
          "Translate accurately into natural polite Japanese.",

        to_table:
          "Convert the structured information into a clean Markdown table.",

        extract_checklist:
          "Extract all actionable tasks into a Markdown checklist.",
      };

      const instruction =
        actionPrompts[action] ||
        "Improve and polish this text.";

      const prompt = `
Directive:
${instruction}

ORIGINAL TEXT:

"""
${text}
"""

Provide the transformed result in clean Markdown.
`;

      const response =
        await groqRequest(
          [
            {
              role: "system",
              content:
                "You are a precise text transformation assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          {
            temperature: 0.3,
            maxCompletionTokens: 5000,
          }
        );

      res.json({
        transformedText:
          response.text,

        action,

        originalWordCount:
          countWords(text),

        transformedWordCount:
          countWords(response.text),
      });
    } catch (error: any) {
      console.error(
        "Groq Transform API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to transform text."
        ),
      });
    }
  }
);

/* ==========================================
   6. CAREER MATCH
========================================== */

app.post(
  "/api/groq/career-match",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        jobDescription,
        profile = "",
        file,
      } = req.body;

      if (!jobDescription?.trim()) {
        res.status(400).json({
          error:
            "Please provide a job or internship description.",
        });
        return;
      }

      if (
        !profile?.trim() &&
        !file
      ) {
        res.status(400).json({
          error:
            "Please provide a candidate profile or upload a file.",
        });
        return;
      }

      let extractedText = "";
      let projectEvidence = "";

      if (
        file?.data &&
        file?.name
      ) {
        extractedText =
          await extractCareerFile(file);

        if (
          file.name
            .toLowerCase()
            .endsWith(".zip")
        ) {
          const evidence =
            extractProjectEvidence(
              extractedText
            );

          projectEvidence = [
            `Languages: ${
              [...evidence.languages]
                .join(", ") ||
              "None detected"
            }`,

            `Frameworks/Libraries: ${
              [...evidence.frameworks]
                .join(", ") ||
              "None detected"
            }`,

            `Technologies: ${
              [...evidence.technologies]
                .join(", ") ||
              "None detected"
            }`,
          ].join("\n");
        }
      }

      const candidateProfile = [
        profile.trim(),
        extractedText.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!candidateProfile) {
        res.status(400).json({
          error:
            "The uploaded file could not be read. Please upload a text-based PDF, DOCX, TXT, or ZIP file.",
        });
        return;
      }

      const prompt = `
You are an AI Career Assistant and hiring analyst.

JOB / INTERNSHIP DESCRIPTION:

${jobDescription}

CANDIDATE PROFILE:

${candidateProfile}

PROJECT EVIDENCE DETECTED FROM UPLOADED CODE:

${
  projectEvidence ||
  "No code-project evidence was detected."
}

RULES:

1. Never invent skills, experience, education, projects or achievements.
2. Count a skill as matching only when explicitly present.
3. Keep match percentage realistic.
4. Identify important skill gaps.
5. Give specific actionable recommendations.
6. Create a practical roadmap.
7. Treat uploaded project evidence as supporting evidence only.
`;

      const response =
        await groqRequest(
          [
            {
              role: "system",
              content:
                "You are a rigorous career matching engine. Return only JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          {
            jsonSchema:
              jsonSchemaResponse(
                "career_analysis",
                {
                  type: "object",

                  properties: {
                    jobSummary: {
                      type: "string",
                    },

                    requiredSkills: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    matchingSkills: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    missingSkills: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    matchPercentage: {
                      type: "integer",
                    },

                    matchReason: {
                      type: "string",
                    },

                    recommendations: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    roadmap: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
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
                }
              ),

            temperature: 0.2,
            maxCompletionTokens: 5000,
          }
        );

      const result =
        parseJson(response.text);

      result.matchPercentage =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              result.matchPercentage
            ) || 0
          )
        );

      res.json(result);
    } catch (error: any) {
      console.error(
        "Groq Career Match API Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error: errorMessage(
          error,
          "Failed to generate career analysis."
        ),
      });
    }
  }
);

/* ==========================================
   VITE / PRODUCTION
========================================== */

async function startServer() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });

    app.use(
      vite.middlewares
    );
  } else {
    const distPath = path.join(
      process.cwd(),
      "dist"
    );

    app.use(
      express.static(distPath)
    );

    app.get("*", (req, res) => {
      res.sendFile(
        path.join(
          distPath,
          "index.html"
        )
      );
    });
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `\n✨ AI Smart Assistant Server is running with Groq!`
      );

      console.log(
        `📍 Access it at: http://${HOSTNAME}:${PORT}\n`
      );
    }
  );
}

startServer();