import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  extractCareerFile,
  extractProjectEvidence,
} from "./careerAssistant.js";

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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return aiClient;
}

function hasOpenAIKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.length > 5
  );
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

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req: Request, res: Response) => {
    res.json({
      status: "ok",
      model: OPENAI_MODEL,
      hasApiKey: hasOpenAIKey(),
      timestamp: new Date().toISOString(),
    });
  }
);

// ==========================================
// 1. TEXT & DOCUMENT SUMMARIZER
// ==========================================

app.post(
  "/api/gemini/summarize",
  async (req: Request, res: Response): Promise<void> => {
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
- executiveSummary: A coherent summary.
- keyPoints: An array of 4-7 critical insights.
- actionItems: An array of concrete next steps.
- suggestedQuestions: 3-4 useful follow-up questions.`;

      const content: any[] = [
        {
          type: "input_text",
          text: prompt,
        },
      ];

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        content.push({
          type: "input_image",
          image_url: dataUrl(
            imagePart.mimeType,
            imagePart.data
          ),
        });
      }

      const response =
        await ai.responses.create({
          model: OPENAI_MODEL,
          input: [
            {
              role: "user",
              content,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "document_summary",
              strict: true,
              schema: {
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
            },
          },
        });

      const parsed = JSON.parse(
        response.output_text || "{}"
      );

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
                ((originalWords -
                  summaryWords) /
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
        "Summarize API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to generate summary.",
      });
    }
  }
);

// ==========================================
// 2. DOCUMENT ANALYZER
// ==========================================

app.post(
  "/api/gemini/analyze",
  async (req: Request, res: Response): Promise<void> => {
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

      const ai = getAI();

      const words = countWords(text || "");

      const prompt = `You are an expert linguistic analyst, strategic editor, and productivity coach.

Perform a comprehensive analysis of the following content.

INPUT CONTENT:
"""
${text || "(See attached image/document)"}
"""

Analyze:

1. Overall Tone
2. Sentiment
3. Sentiment Score from 0 to 100
4. Readability Level
5. Key Topics
6. Named Entities
7. Action Items
8. Strengths
9. Suggestions
10. Strategic Insights`;

      const content: any[] = [
        {
          type: "input_text",
          text: prompt,
        },
      ];

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        content.push({
          type: "input_image",
          image_url: dataUrl(
            imagePart.mimeType,
            imagePart.data
          ),
        });
      }

      const response =
        await ai.responses.create({
          model: OPENAI_MODEL,
          input: [
            {
              role: "user",
              content,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "document_analysis",
              strict: true,
              schema: {
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
            },
          },
        });

      const parsed = JSON.parse(
        response.output_text || "{}"
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
        "Analyze API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to analyze document.",
      });
    }
  }
);

// ==========================================
// 3. CONTENT GENERATION
// ==========================================

app.post(
  "/api/gemini/generate",
  async (req: Request, res: Response): Promise<void> => {
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

      const ai = getAI();

      const templateInstructions: Record<
        string,
        string
      > = {
        email:
          "Draft a high-impact polished email with subject line, greeting, organized body, and professional sign-off.",

        article:
          "Write a well-structured article with markdown headings, introduction, sections, and conclusion.",

        agenda:
          "Create a crisp meeting agenda with objectives, discussion topics, preparation, and deliverables.",

        bug_report:
          "Create a developer-ready bug report with Summary, Steps to Reproduce, Expected Behavior, Actual Behavior, Environment, and Severity.",

        pitch:
          "Draft an executive pitch with Problem, Solution, Market Opportunity, Business Model, and Call to Action.",

        social_post:
          "Craft an engaging social media post with hook, value points, hashtags, and CTA.",

        code:
          "Provide a clean robust code solution with explanation and usage example.",

        freeform:
          "Generate thoughtful high-quality formatted content.",
      };

      const instruction =
        templateInstructions[template] ||
        templateInstructions.freeform;

      const prompt = `You are an elite productivity copywriter and subject matter expert.

Task:
${instruction}

PARAMETERS:

Primary Topic:
${topic}

Key Points:
${keyPoints || "None specified"}

Tone:
${tone}

Length:
${length}

Audience:
${audience}

OUTPUT:

- title
- content
- tags
- tips
- estimatedReadingTime`;

      const response =
        await ai.responses.create({
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
              },
            },
          },
        });

      res.json(
        JSON.parse(
          response.output_text || "{}"
        )
      );
    } catch (error: any) {
      console.error(
        "Generate API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to generate content.",
      });
    }
  }
);

// ==========================================
// 4. Q&A
// ==========================================

app.post(
  "/api/gemini/qa",
  async (req: Request, res: Response): Promise<void> => {
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

      const ai = getAI();

      const personaInstructions: Record<
        string,
        string
      > = {
        smart_assistant:
          "You are the AI Smart Assistant: concise, knowledgeable, actionable, and polite.",

        tech_lead:
          "You are a Senior Principal Software Architect providing technical depth and system design best practices.",

        executive_coach:
          "You are a C-level Executive Strategist focused on business value and ROI.",

        research_analyst:
          "You are a meticulous Senior Research Analyst providing structured evidence-based analysis.",

        copy_editor:
          "You are a Master Copy Editor focused on grammar, clarity, and style.",
      };

      const systemInstruction =
        (personaInstructions[persona] ||
          personaInstructions.smart_assistant) +
        `

Always format responses in clean Markdown.

At the end provide:

### Suggested Follow-ups

with 2-3 useful questions.`;

      const input: any[] = [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: systemInstruction,
            },
          ],
        },
      ];

      for (const msg of history.slice(-6)) {
        input.push({
          role:
            msg.role === "assistant"
              ? "assistant"
              : "user",

          content: [
            {
              type: "input_text",
              text: msg.content,
            },
          ],
        });
      }

      let userPrompt = "";

      if (
        contextDocument &&
        contextDocument.trim()
      ) {
        userPrompt += `REFERENCE CONTEXT DOCUMENT:

"""
${contextDocument}
"""

`;
      }

      userPrompt += `USER QUESTION:
${question}`;

      input.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: userPrompt,
          },
        ],
      });

      const response =
        await ai.responses.create({
          model: OPENAI_MODEL,
          input,
        });

      const fullText =
        response.output_text || "";

      let cleanedContent = fullText;

      const followUps: string[] = [];

      const marker =
        fullText.lastIndexOf(
          "### Suggested Follow-ups"
        );

      if (marker !== -1) {
        cleanedContent =
          fullText
            .substring(0, marker)
            .trim();

        const section =
          fullText.substring(marker);

        for (const line of section.split("\n")) {
          const trimmed = line
            .replace(/^[-*•\d.]+\s*/, "")
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
          "Can you simplify this?"
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
        "Q&A API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to process question.",
      });
    }
  }
);

// ==========================================
// 5. TRANSFORM
// ==========================================

app.post(
  "/api/gemini/transform",
  async (req: Request, res: Response): Promise<void> => {
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

      const ai = getAI();

      const actionPrompts: Record<
        string,
        string
      > = {
        fix_grammar:
          "Fix grammar spelling and punctuation while preserving meaning.",

        bulletify:
          "Convert this prose into crisp structured bullet points.",

        make_formal:
          "Rewrite in polished professional executive tone.",

        simplify_eli5:
          "Explain this in extremely simple friendly language.",

        translate_es:
          "Translate accurately into natural Spanish.",

        translate_fr:
          "Translate accurately into natural French.",

        translate_de:
          "Translate accurately into natural German.",

        translate_ja:
          "Translate accurately into natural polite Japanese.",

        to_table:
          "Convert structured information into a clean Markdown table.",

        extract_checklist:
          "Extract actionable tasks into a Markdown checklist.",
      };

      const instruction =
        actionPrompts[action] ||
        "Improve and polish this text.";

      const prompt = `Directive:
${instruction}

ORIGINAL TEXT:

"""
${text}
"""

Provide clean formatted Markdown.`;

      const response =
        await ai.responses.create({
          model: OPENAI_MODEL,
          input: prompt,
        });

      const transformedText =
        response.output_text || "";

      res.json({
        transformedText,
        action,
        originalWordCount:
          countWords(text),
        transformedWordCount:
          countWords(transformedText),
      });
    } catch (error: any) {
      console.error(
        "Transform API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to transform text.",
      });
    }
  }
);

// ==========================================
// 6. AI CAREER ASSISTANT
// ==========================================
//
// IMPORTANT:
// Frontend must call:
//
// POST /api/gemini/career-match
//
// Request body:
//
// {
//   jobDescription: "...",
//   profile: "...",
//   file: {
//     name: "project.zip",
//     data: "<base64>",
//     mimeType: "application/zip"
//   }
// }
//
// ==========================================

app.post(
  "/api/gemini/career-match",
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

      // --------------------------------------
      // Validate job description
      // --------------------------------------

      if (
        !jobDescription ||
        !jobDescription.trim()
      ) {
        res.status(400).json({
          error:
            "Please provide a job or internship description.",
        });
        return;
      }

      // --------------------------------------
      // Validate candidate information
      // --------------------------------------

      if (
        !profile.trim() &&
        !file
      ) {
        res.status(400).json({
          error:
            "Please provide a candidate profile or upload a file.",
        });
        return;
      }

      const ai = getAI();

      let extractedText = "";
      let projectEvidence = "";

      // --------------------------------------
      // Extract uploaded file
      // --------------------------------------

      if (
        file &&
        file.data &&
        file.name
      ) {
        console.log(
          `Processing career file: ${file.name}`
        );

        extractedText =
          await extractCareerFile(file);

        console.log(
          `Extracted career text length: ${extractedText.length}`
        );

        // ------------------------------------
        // ZIP PROJECT EVIDENCE
        // ------------------------------------

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

          console.log(
            "ZIP project evidence:\n",
            projectEvidence
          );
        }
      }

      // --------------------------------------
      // Combine candidate profile
      // --------------------------------------

      const candidateProfile = [
        profile.trim(),
        extractedText.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      // --------------------------------------
      // Validate extracted content
      // --------------------------------------

      if (
        !candidateProfile
      ) {
        res.status(400).json({
          error:
            "The uploaded file appears to be empty or invalid.",
        });
        return;
      }

      // --------------------------------------
      // Career analysis prompt
      // --------------------------------------

      const prompt = `You are an AI Career Assistant and hiring analyst.

JOB / INTERNSHIP DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE:
${candidateProfile}

PROJECT EVIDENCE DETECTED FROM UPLOADED CODE:
${projectEvidence || "No code-project evidence was detected."}

RULES:

1. Never invent skills, experience, education, projects, or achievements.

2. Count a skill as matching only when it is explicitly present in the candidate information or supported by uploaded project evidence.

3. Keep the match percentage realistic.

4. A score above 90% requires most essential requirements to be satisfied.

5. Identify critical gaps and explain their impact.

6. Recommendations must be specific and actionable.

7. Build a practical roadmap with timeframes.

8. Uploaded project evidence is supporting evidence only and must not be treated as professional experience.

9. Clearly distinguish between:
   - explicitly stated skills
   - skills detected from project code
   - missing skills

10. Do not assume a technology merely because another related technology is present.`;

      const content: any[] = [
        {
          type: "input_text",
          text: prompt,
        },
      ];

      // --------------------------------------
      // PDF support
      // --------------------------------------

      if (
        file?.name
          ?.toLowerCase()
          .endsWith(".pdf") &&
        file?.data
      ) {
        content.push({
          type: "input_file",
          filename: file.name,
          file_data: dataUrl(
            file.mimeType ||
              "application/pdf",
            file.data
          ),
        });
      }

      // --------------------------------------
      // IMPORTANT:
      // ZIP is NOT sent as input_file.
      //
      // ZIP has already been extracted above.
      // --------------------------------------

      const response =
        await ai.responses.create({
          model: OPENAI_MODEL,

          input: [
            {
              role: "user",
              content,
            },
          ],

          text: {
            format: {
              type: "json_schema",

              name: "career_analysis",

              strict: true,

              schema: {
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
              },
            },
          },
        });

      // --------------------------------------
      // Parse AI response
      // --------------------------------------

      let result: any;

      try {
        result = JSON.parse(
          response.output_text || "{}"
        );
      } catch {
        res.status(500).json({
          error:
            "The AI returned an invalid career analysis. Please try again.",
        });
        return;
      }

      // --------------------------------------
      // Clamp match percentage
      // --------------------------------------

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

      // --------------------------------------
      // Send result
      // --------------------------------------

      res.json(result);
    } catch (error: any) {
      console.error(
        "Career Match API Error:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to generate career analysis.",
      });
    }
  }
);

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================

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

    app.use(vite.middlewares);
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
        `\n✨ AI Smart Assistant Server is running!`
      );

      console.log(
        `📍 Access it at: http://${HOSTNAME}:${PORT}\n`
      );
    }
  );
}

startServer();