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

/* =========================================================
   SERVER CONFIG
========================================================= */

const PORT = Number(process.env.PORT) || 8080;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

/* =========================================================
   CORS
========================================================= */

app.use((req: Request, res: Response, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",

    "https://ai-smart-career-assistance.onrender.com",

    "https://ai-smart-career-assistance-1kug.vercel.app",
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(
  express.json({
    limit: "25mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb",
  })
);

/* =========================================================
   TYPES
========================================================= */

type GroqMessage = {
  role:
    | "system"
    | "developer"
    | "user"
    | "assistant";

  content: any;
};

/* =========================================================
   GROQ API KEY
========================================================= */

function hasGroqKey(): boolean {
  const key = process.env.GROQ_API_KEY;

  return Boolean(
    key &&
      key.trim().length > 5
  );
}

function getGroqKey(): string {
  const key =
    process.env.GROQ_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not configured on the server."
    );
  }

  return key;
}

/* =========================================================
   GROQ REQUEST
========================================================= */

async function groqRequest(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxCompletionTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<{
  text: string;
  raw: any;
}> {
  const body: any = {
    model:
      options.model || GROQ_MODEL,

    messages,

    temperature:
      options.temperature ?? 0.2,

    max_completion_tokens:
      options.maxCompletionTokens ?? 4096,
  };

  /*
   * Use simple JSON mode instead of json_schema.
   * This is more compatible with Groq models.
   */

  if (options.jsonMode) {
    body.response_format = {
      type: "json_object",
    };
  }

  const response = await fetch(
    GROQ_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${getGroqKey()}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(body),
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Groq API request failed with status ${response.status}.`;

    const error =
      new Error(message) as Error & {
        status?: number;
        code?: string;
      };

    error.status =
      response.status;

    error.code =
      data?.error?.code;

    throw error;
  }

  const text =
    data?.choices?.[0]?.message
      ?.content || "";

  return {
    text,
    raw: data,
  };
}

/* =========================================================
   JSON PARSER
========================================================= */

function parseJson(
  text: string
): any {
  let cleaned =
    String(text || "")
      .trim();

  cleaned =
    cleaned
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start =
      cleaned.indexOf("{");

    const end =
      cleaned.lastIndexOf("}");

    if (
      start !== -1 &&
      end !== -1 &&
      end > start
    ) {
      return JSON.parse(
        cleaned.substring(
          start,
          end + 1
        )
      );
    }

    throw new Error(
      "Groq returned an invalid JSON response."
    );
  }
}

/* =========================================================
   HELPERS
========================================================= */

function countWords(
  value: string
): number {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    return 0;
  }

  return text.split(/\s+/).length;
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
  return (
    error?.message ||
    fallback
  );
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  (req: Request, res: Response) => {
    res.json({
      status: "ok",

      provider: "Groq",

      model: GROQ_MODEL,

      visionModel:
        GROQ_VISION_MODEL,

      hasApiKey:
        hasGroqKey(),

      timestamp:
        new Date().toISOString(),
    });
  }
);

/* =========================================================
   1. SUMMARIZATION
========================================================= */

app.post(
  "/api/groq/summarize",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text = "",

        format =
          "executive",

        length =
          "medium",

        targetAudience =
          "general",

        imagePart,
      } = req.body;

      if (
        !text &&
        !imagePart
      ) {
        res.status(400).json({
          error:
            "Please provide text or an attachment to summarize.",
        });

        return;
      }

      const originalWords =
        countWords(text);

      const prompt = `
You are an expert executive research assistant.

Summarize the provided content.

Format:
${format}

Length:
${length}

Target audience:
${targetAudience}

INPUT:
"""
${text || "(See attached image)"}
"""

Return ONLY valid JSON.

Required JSON structure:

{
  "tldr": "short summary",
  "executiveSummary": "detailed summary",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"],
  "suggestedQuestions": ["question 1", "question 2"]
}
`;

      const content: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ];

      let model =
        GROQ_MODEL;

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        model =
          GROQ_VISION_MODEL;

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

      const response =
        await groqRequest(
          [
            {
              role: "system",

              content:
                "You are a precise document summarization assistant. Return valid JSON only.",
            },

            {
              role: "user",

              content,
            },
          ],
          {
            model,

            temperature:
              0.2,

            maxCompletionTokens:
              4096,

            jsonMode:
              !imagePart,
          }
        );

      let parsed: any;

      try {
        parsed =
          parseJson(
            response.text
          );
      } catch {
        parsed = {
          tldr:
            response.text,

          executiveSummary:
            response.text,

          keyPoints: [],

          actionItems: [],

          suggestedQuestions: [],
        };
      }

      const summaryWords =
        countWords(
          `${parsed.tldr || ""} ${
            parsed.executiveSummary || ""
          }`
        );

      const reductionPercentage =
        originalWords > 0
          ? Math.max(
              0,
              Math.round(
                (
                  (originalWords -
                    summaryWords) /
                  originalWords
                ) * 100
              )
            )
          : 0;

      res.json({
        tldr:
          parsed.tldr ||
          "Summary generated successfully.",

        executiveSummary:
          parsed.executiveSummary ||
          "",

        keyPoints:
          Array.isArray(
            parsed.keyPoints
          )
            ? parsed.keyPoints
            : [],

        actionItems:
          Array.isArray(
            parsed.actionItems
          )
            ? parsed.actionItems
            : [],

        suggestedQuestions:
          Array.isArray(
            parsed.suggestedQuestions
          )
            ? parsed.suggestedQuestions
            : [],

        readingTimeMinutes:
          Math.max(
            1,
            Math.ceil(
              summaryWords / 200
            )
          ),

        wordCount:
          summaryWords,

        originalWordCount:
          originalWords,

        reductionPercentage,
      });
    } catch (error: any) {
      console.error(
        "Groq Summarize Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to generate summary."
          ),
      });
    }
  }
);

/* =========================================================
   2. DOCUMENT ANALYSIS
========================================================= */

app.post(
  "/api/groq/analyze",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text = "",
        imagePart,
      } = req.body;

      if (
        !text &&
        !imagePart
      ) {
        res.status(400).json({
          error:
            "Please provide text or an attachment to analyze.",
        });

        return;
      }

      const prompt = `
You are an expert document analyst.

Analyze this content carefully.

INPUT:
"""
${text || "(See attached image)"}
"""

Return ONLY valid JSON using this structure:

{
  "overallTone": "string",
  "sentiment": "positive/negative/neutral",
  "sentimentScore": 0,
  "readabilityLevel": "string",
  "keyTopics": [],
  "entities": [
    {
      "name": "string",
      "type": "string",
      "description": "string"
    }
  ],
  "actionItems": [
    {
      "task": "string",
      "priority": "high/medium/low",
      "owner": "string"
    }
  ],
  "strengths": [],
  "suggestions": [
    {
      "original": "string",
      "suggested": "string",
      "explanation": "string",
      "type": "string"
    }
  ],
  "insights": "string"
}
`;

      const content: any[] = [
        {
          type: "text",
          text: prompt,
        },
      ];

      let model =
        GROQ_MODEL;

      let jsonMode =
        true;

      if (
        imagePart?.data &&
        imagePart?.mimeType
      ) {
        model =
          GROQ_VISION_MODEL;

        jsonMode =
          false;

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

      const response =
        await groqRequest(
          [
            {
              role: "system",

              content:
                "You are a professional document analysis assistant. Return valid JSON only.",
            },

            {
              role: "user",

              content,
            },
          ],
          {
            model,

            temperature:
              0.2,

            maxCompletionTokens:
              5000,

            jsonMode,
          }
        );

      const parsed =
        parseJson(
          response.text
        );

      const words =
        countWords(text);

      res.json({
        overallTone:
          parsed.overallTone ||
          "Neutral",

        sentiment:
          parsed.sentiment ||
          "neutral",

        sentimentScore:
          typeof parsed.sentimentScore ===
          "number"
            ? parsed.sentimentScore
            : 50,

        readabilityLevel:
          parsed.readabilityLevel ||
          "Standard",

        readingTimeMinutes:
          Math.max(
            1,
            Math.ceil(
              words / 200
            )
          ),

        keyTopics:
          parsed.keyTopics || [],

        entities:
          parsed.entities || [],

        actionItems:
          parsed.actionItems ||
          [],

        strengths:
          parsed.strengths ||
          [],

        suggestions:
          parsed.suggestions ||
          [],

        insights:
          parsed.insights ||
          "",
      });
    } catch (error: any) {
      console.error(
        "Groq Analyze Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to analyze document."
          ),
      });
    }
  }
);

/* =========================================================
   3. CONTENT GENERATION
========================================================= */

app.post(
  "/api/groq/generate",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        template =
          "email",

        topic = "",

        keyPoints = "",

        tone =
          "professional",

        length =
          "standard",

        audience =
          "General",
      } = req.body;

      if (!topic?.trim()) {
        res.status(400).json({
          error:
            "Please provide a topic or prompt for content generation.",
        });

        return;
      }

      const instructions: Record<
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
          "Generate high-quality content according to the provided instructions.",
      };

      const instruction =
        instructions[
          template
        ] ||
        instructions.freeform;

      const prompt = `
You are an elite professional content generation assistant.

TASK:
${instruction}

PRIMARY TOPIC:
${topic}

KEY POINTS:
${keyPoints || "Use appropriate industry best practices."}

TONE:
${tone}

LENGTH:
${length}

TARGET AUDIENCE:
${audience}

Return ONLY valid JSON:

{
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "tips": ["string"],
  "estimatedReadingTime": "string"
}
`;

      const response =
        await groqRequest(
          [
            {
              role: "system",

              content:
                "You are a precise professional content generator. Return valid JSON only.",
            },

            {
              role: "user",

              content: prompt,
            },
          ],
          {
            temperature:
              0.5,

            maxCompletionTokens:
              5000,

            jsonMode:
              true,
          }
        );

      const result =
        parseJson(
          response.text
        );

      res.json({
        title:
          result.title ||
          "Generated Content",

        content:
          result.content ||
          "",

        tags:
          result.tags || [],

        tips:
          result.tips || [],

        estimatedReadingTime:
          result.estimatedReadingTime ||
          "2 minutes",
      });
    } catch (error: any) {
      console.error(
        "Groq Generate Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to generate content."
          ),
      });
    }
  }
);

/* =========================================================
   4. QUESTION ANSWERING
========================================================= */

app.post(
  "/api/groq/qa",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        question = "",

        history = [],

        contextDocument = "",

        persona =
          "smart_assistant",
      } = req.body;

      if (!question?.trim()) {
        res.status(400).json({
          error:
            "Please provide a question or message.",
        });

        return;
      }

      const personas: Record<
        string,
        string
      > = {
        smart_assistant:
          "You are the AI Smart Assistant. Be concise, knowledgeable, actionable and polite.",

        tech_lead:
          "You are a Senior Principal Software Architect. Give technical depth, trade-offs and best practices.",

        executive_coach:
          "You are a C-level Executive Strategist. Focus on business value, ROI and decision frameworks.",

        research_analyst:
          "You are a meticulous Senior Research Analyst. Give structured evidence-based analysis.",

        copy_editor:
          "You are a Master Copy Editor. Focus on grammar, clarity and persuasive writing.",
      };

      const messages: GroqMessage[] =
        [
          {
            role: "system",

            content: `
${
  personas[
    persona
  ] ||
  personas.smart_assistant
}

Always answer using clean Markdown.

At the end provide:

### Suggested Follow-ups

Give 2-3 useful follow-up questions.
`,
          },
        ];

      if (
        Array.isArray(history)
      ) {
        for (
          const message of history.slice(
            -8
          )
        ) {
          if (
            !message?.content
          ) {
            continue;
          }

          messages.push({
            role:
              message.role ===
              "assistant"
                ? "assistant"
                : "user",

            content:
              String(
                message.content
              ),
          });
        }
      }

      let userPrompt = "";

      if (
        contextDocument?.trim()
      ) {
        userPrompt += `
REFERENCE DOCUMENT:

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

        content:
          userPrompt,
      });

      const response =
        await groqRequest(
          messages,
          {
            temperature:
              0.4,

            maxCompletionTokens:
              5000,
          }
        );

      const fullText =
        response.text || "";

      const marker =
        fullText.lastIndexOf(
          "### Suggested Follow-ups"
        );

      let content =
        fullText;

      const followUps: string[] =
        [];

      if (marker !== -1) {
        content =
          fullText
            .substring(
              0,
              marker
            )
            .trim();

        const followUpText =
          fullText.substring(
            marker
          );

        for (
          const line of followUpText.split(
            "\n"
          )
        ) {
          const clean =
            line
              .replace(
                /^[-*•\d.]+\s*/,
                ""
              )
              .trim();

          if (
            clean &&
            !clean.startsWith(
              "#"
            ) &&
            clean.length > 5
          ) {
            followUps.push(
              clean
            );
          }
        }
      }

      if (
        followUps.length === 0
      ) {
        followUps.push(
          "Can you explain the key points further?",
          "What are the practical next steps?",
          "Can you simplify this?"
        );
      }

      res.json({
        content,

        suggestedFollowUps:
          followUps.slice(
            0,
            3
          ),

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour:
                "2-digit",

              minute:
                "2-digit",
            }
          ),
      });
    } catch (error: any) {
      console.error(
        "Groq Q&A Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to process question."
          ),
      });
    }
  }
);

/* =========================================================
   5. QUICK TRANSFORM
========================================================= */

app.post(
  "/api/groq/transform",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        text = "",
        action = "",
      } = req.body;

      if (!text?.trim()) {
        res.status(400).json({
          error:
            "Please provide text to transform.",
        });

        return;
      }

      const actions: Record<
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
        actions[action] ||
        "Improve and polish this text.";

      const prompt = `
Directive:
${instruction}

ORIGINAL TEXT:

"""
${text}
"""

Return only the transformed result in clean Markdown.
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

              content:
                prompt,
            },
          ],
          {
            temperature:
              0.3,

            maxCompletionTokens:
              5000,
          }
        );

      res.json({
        transformedText:
          response.text,

        action,

        originalWordCount:
          countWords(
            text
          ),

        transformedWordCount:
          countWords(
            response.text
          ),
      });
    } catch (error: any) {
      console.error(
        "Groq Transform Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to transform text."
          ),
      });
    }
  }
);

/* =========================================================
   6. CAREER MATCH
========================================================= */

app.post(
  "/api/groq/career-match",
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        jobDescription = "",

        profile = "",

        file,
      } = req.body;

      if (
        !jobDescription?.trim()
      ) {
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

      let extractedText =
        "";

      let projectEvidence =
        "";

      if (
        file?.data &&
        file?.name
      ) {
        extractedText =
          await extractCareerFile(
            file
          );

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
              [
                ...evidence.languages,
              ].join(
                ", "
              ) ||
              "None detected"
            }`,

            `Frameworks/Libraries: ${
              [
                ...evidence.frameworks,
              ].join(
                ", "
              ) ||
              "None detected"
            }`,

            `Technologies: ${
              [
                ...evidence.technologies,
              ].join(
                ", "
              ) ||
              "None detected"
            }`,
          ].join("\n");
        }
      }

      const candidateProfile =
        [
          profile.trim(),

          extractedText.trim(),
        ]
          .filter(Boolean)
          .join(
            "\n\n"
          );

      if (
        !candidateProfile
      ) {
        res.status(400).json({
          error:
            "The uploaded file could not be read. Please upload a text-based PDF, DOCX, TXT, or ZIP file.",
        });

        return;
      }

      const prompt = `
You are an expert AI Career Assistant and hiring analyst.

JOB / INTERNSHIP DESCRIPTION:

${jobDescription}

CANDIDATE PROFILE:

${candidateProfile}

PROJECT EVIDENCE:

${
  projectEvidence ||
  "No project evidence detected."
}

RULES:

1. Never invent skills, experience, education, projects or achievements.
2. Match skills only when explicitly present.
3. Keep the match percentage realistic.
4. Identify important skill gaps.
5. Give specific recommendations.
6. Create a practical roadmap.
7. Treat project evidence as supporting evidence.

Return ONLY valid JSON:

{
  "jobSummary": "string",
  "requiredSkills": [],
  "matchingSkills": [],
  "missingSkills": [],
  "matchPercentage": 0,
  "matchReason": "string",
  "recommendations": [],
  "roadmap": []
}
`;

      const response =
        await groqRequest(
          [
            {
              role: "system",

              content:
                "You are a rigorous career matching engine. Return valid JSON only.",
            },

            {
              role: "user",

              content:
                prompt,
            },
          ],
          {
            temperature:
              0.2,

            maxCompletionTokens:
              5000,

            jsonMode:
              true,
          }
        );

      const result =
        parseJson(
          response.text
        );

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

      res.json({
        jobSummary:
          result.jobSummary ||
          "",

        requiredSkills:
          result.requiredSkills ||
          [],

        matchingSkills:
          result.matchingSkills ||
          [],

        missingSkills:
          result.missingSkills ||
          [],

        matchPercentage:
          result.matchPercentage,

        matchReason:
          result.matchReason ||
          "",

        recommendations:
          result.recommendations ||
          [],

        roadmap:
          result.roadmap ||
          [],
      });
    } catch (error: any) {
      console.error(
        "Groq Career Match Error:",
        error
      );

      res.status(
        error?.status >= 400
          ? error.status
          : 500
      ).json({
        error:
          errorMessage(
            error,
            "Failed to generate career analysis."
          ),
      });
    }
  }
);

/* =========================================================
   VITE / PRODUCTION
========================================================= */

async function startServer() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode:
            true,
        },

        appType: "spa",
      });

    app.use(
      vite.middlewares
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        "dist"
      );

    app.use(
      express.static(
        distPath
      )
    );

    app.get(
      "*",
      (
        req,
        res
      ) => {
        res.sendFile(
          path.join(
            distPath,
            "index.html"
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        "\n✨ AI Smart Assistant Server is running with Groq!"
      );

      console.log(
        `📍 Server listening on port ${PORT}`
      );

      console.log(
        `🔑 Groq API Key: ${
          hasGroqKey()
            ? "CONFIGURED"
            : "MISSING"
        }`
      );

      console.log(
        `🤖 Model: ${GROQ_MODEL}`
      );

      console.log(
        `👁️ Vision Model: ${GROQ_VISION_MODEL}\n`
      );
    }
  );
}

/* =========================================================
   START
========================================================= */

startServer().catch(
  (error) => {
    console.error(
      "❌ Server startup failed:",
      error
    );

    process.exit(1);
  }
);