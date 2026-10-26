import OpenAI from "openai";

const skillList = [
  "javascript", "typescript", "react", "node.js", "node", "express",
  "mongodb", "sql", "python", "java", "c++", "html", "css",
  "git", "github", "docker", "aws", "rest api", "machine learning",
  "data structures", "algorithms", "figma", "tailwind", "next.js"
];

function fallbackAnalyze(text, jobDescription = "") {
  const lower = text.toLowerCase();
  const foundSkills = skillList.filter((s) => lower.includes(s));
  const sections = ["summary", "education", "experience", "skills", "projects"];
  const missingSections = sections.filter((s) => !lower.includes(s));
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  let score = 45;
  score += Math.min(foundSkills.length * 3, 24);
  score += Math.min(words / 80, 15);
  score -= missingSections.length * 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let matchingKeywords = [];
  let missingKeywords = [];

  if (jobDescription) {
    const jd = jobDescription.toLowerCase();
    matchingKeywords = skillList.filter((s) => jd.includes(s) && lower.includes(s));
    missingKeywords = skillList.filter((s) => jd.includes(s) && !lower.includes(s));
  }

  return {
    overallScore: score,
    atsScore: Math.max(0, Math.min(100, score - 2)),
    wordCount: words,
    skills: foundSkills,
    strengths: [
      foundSkills.length ? `Detected ${foundSkills.length} relevant technical skills.` : "Resume contains readable content.",
      words > 250 ? "Resume has enough content for meaningful analysis." : "The resume is concise."
    ],
    weaknesses: [
      ...missingSections.map((s) => `Consider adding a clear ${s} section.`),
      ...(words < 250 ? ["Add measurable achievements and project details."] : [])
    ],
    missingKeywords,
    matchingKeywords,
    recommendations: [
      "Use achievement-focused bullet points with measurable results.",
      "Keep section headings consistent and ATS-friendly.",
      "Tailor keywords to the specific job description.",
      "Add relevant projects, tools and technologies with context."
    ],
    summary: `The resume contains ${words} words and ${foundSkills.length} recognized technical skills.`
  };
}

export async function analyzeResume(text, jobDescription = "") {
  const shouldUseAI = (process.env.USE_AI === "true" || (!process.env.USE_AI && Boolean(process.env.OPENAI_API_KEY))) && Boolean(process.env.OPENAI_API_KEY);

  if (!shouldUseAI) {
    return fallbackAnalyze(text, jobDescription);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an expert resume reviewer and ATS consultant.

Analyze the resume below. If a job description is supplied, compare the resume against it.

Return ONLY valid JSON with this exact shape:
{
  "overallScore": number,
  "atsScore": number,
  "wordCount": number,
  "skills": string[],
  "strengths": string[],
  "weaknesses": string[],
  "missingKeywords": string[],
  "matchingKeywords": string[],
  "recommendations": string[],
  "summary": string
}

Scoring should be practical, not arbitrary. Do not invent experience, skills, education, employers or achievements.

RESUME:
${text.slice(0, 30000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 15000)}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt
    });

    const raw = response.output_text.trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("AI analysis failed or unavailable, falling back to built-in analyzer:", err.message);
    return fallbackAnalyze(text, jobDescription);
  }
}
