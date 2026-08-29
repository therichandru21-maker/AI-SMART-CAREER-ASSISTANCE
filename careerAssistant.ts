import JSZip from "jszip";
import mammoth from "mammoth";

const MAX_PROJECT_TEXT_SIZE = 50000;
const MAX_FILE_SIZE = 1000000;
const EXCLUDED_FOLDERS = new Set([
  "node_modules", "venv", ".venv", "__pycache__", ".git", "dist", "build",
  "target", ".pytest_cache", ".vscode", ".idea", "coverage"
]);
const CODE_EXTENSIONS = new Set([
  ".py",".js",".jsx",".ts",".tsx",".java",".c",".cpp",".cs",".rb",".go",".php",
  ".swift",".kt",".html",".css",".scss",".json",".xml",".yaml",".yml",".md",".txt"
]);
const PRIORITY_FILES = new Set([
  "readme.md","readme.txt","requirements.txt","package.json","dockerfile",
  "docker-compose.yml","pom.xml","build.gradle"
]);

export function shouldIncludeProjectFile(filePath: string): boolean {
  const lower = filePath.toLowerCase().replaceAll("\\", "/");
  const binary = [".png",".jpg",".jpeg",".gif",".ico",".svg",".exe",".dll",".so",".bin",".pyc",".class",".o",".zip",".gz",".tar",".rar"];
  const media = [".mp4",".avi",".mkv",".mov",".wav",".mp3",".m4a"];
  if (binary.some((x) => lower.endsWith(x)) || media.some((x) => lower.endsWith(x))) return false;
  if (lower.split("/").some((part) => EXCLUDED_FOLDERS.has(part))) return false;
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  const name = lower.split("/").pop() || "";
  return CODE_EXTENSIONS.has(ext) || PRIORITY_FILES.has(name);
}

export async function extractCareerFile(file: { name: string; mimeType: string; data: string }) {
  const bytes = Buffer.from(file.data, "base64");
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".txt")) return bytes.toString("utf8").trim();

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value.trim();
  }

  if (lower.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(bytes);
    const chunks: string[] = [];
    let total = 0;
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir || !shouldIncludeProjectFile(name)) continue;
      const raw = await entry.async("nodebuffer");
      if (raw.length > MAX_FILE_SIZE) continue;
      const text = raw.toString("utf8").trim();
      if (!text) continue;
      const chunk = `\n--- File: ${name} ---\n${text}`;
      chunks.push(chunk);
      total += chunk.length;
      if (total >= MAX_PROJECT_TEXT_SIZE) break;
    }
    return chunks.join("").slice(0, MAX_PROJECT_TEXT_SIZE);
  }

  // PDFs are handled by OpenAi as a native document part.
  if (lower.endsWith(".pdf")) return "";

  return bytes.toString("utf8").trim();
}

export function extractProjectEvidence(fileContents: string) {
  const content = fileContents.toLowerCase();
  const evidence = {
    languages: new Set<string>(),
    frameworks: new Set<string>(),
    technologies: new Set<string>(),
  };
  const languagePatterns: Record<string, string[]> = {
    Python: [".py", "import ", "def ", "python"],
    JavaScript: [".js", ".jsx", "const ", "function ", "require(", "import "],
    TypeScript: [".ts", ".tsx", "interface ", "type "],
    Java: [".java", "public class", "import java"],
    C: [".c", "#include", "void "],
    "C++": [".cpp", ".cc", "std::", "#include"],
    "C#": [".cs", "using system", "public class"],
    SQL: [".sql", "select", "insert", "update"],
    HTML: [".html", "<html", "<div", "<body"],
    CSS: [".css", "color:", "display:", "margin:"],
    Go: [".go", "package main", "func "],
  };
  const frameworkPatterns: Record<string, string[]> = {
    React: ["react", "from react", "import react"],
    Vue: ["vue", "from vue", "import vue"],
    Angular: ["@angular", "from @angular"],
    Django: ["django", "from django"],
    Flask: ["flask", "from flask"],
    FastAPI: ["fastapi", "from fastapi"],
    Express: ["express", "require('express')", 'require("express")'],
    TensorFlow: ["tensorflow", "import tensorflow"],
    PyTorch: ["torch", "import torch"],
    Keras: ["keras", "import keras"],
    Pandas: ["pandas", "import pandas"],
    NumPy: ["numpy", "import numpy"],
    "Scikit-learn": ["sklearn", "from sklearn"],
    SQLAlchemy: ["sqlalchemy"],
    PostgreSQL: ["postgres", "psycopg"],
    MongoDB: ["mongodb", "mongoose"],
    Docker: ["docker", "dockerfile"],
    Kubernetes: ["kubernetes", "k8s"],
    AWS: ["aws", "boto", "amazon"],
    Azure: ["azure"],
    GCP: ["google.cloud", "gcp"],
    Jest: ["jest", "describe(", "test("],
    Pytest: ["pytest", "def test_"],
    Git: ["github", "gitlab"],
    "REST API": ["api", "/api", "restful"],
    GraphQL: ["graphql", "apollo"],
    WebSocket: ["websocket"],
  };
  const techPatterns: Record<string, string[]> = {
    "Machine Learning": ["tensorflow", "pytorch", "sklearn", "machine learning"],
    "Data Science": ["pandas", "numpy", "matplotlib", "seaborn"],
    "CI/CD": ["jenkins", "gitlab-ci", "github-actions", "circleci"],
    Testing: ["test", "pytest", "jest", "unittest"],
    Containerization: ["docker", "container"],
    Cloud: ["aws", "azure", "gcp", "heroku"],
    "API Development": ["api", "rest", "graphql"],
  };
  for (const [name, patterns] of Object.entries(languagePatterns))
    if (patterns.some((p) => content.includes(p))) evidence.languages.add(name);
  for (const [name, patterns] of Object.entries(frameworkPatterns))
    if (patterns.some((p) => content.includes(p))) evidence.frameworks.add(name);
  for (const [name, patterns] of Object.entries(techPatterns))
    if (patterns.some((p) => content.includes(p))) evidence.technologies.add(name);
  return evidence;
}
