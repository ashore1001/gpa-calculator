const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

const allowedOrigins = new Set([
  "https://ashore1001.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Only POST /api/analyze is supported." });
    return;
  }

  const provider = getAiProvider();
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    sendJson(res, 500, {
      error: `${getProviderKeyName(provider)} is not configured on Vercel. 请先在 Vercel 环境变量中配置 ${getProviderLabel(provider)} API key。`
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  try {
    const report = await callAiProvider(provider, apiKey, payload);
    sendJson(res, 200, normalizeReport(report, payload.localAnalysis));
  } catch (error) {
    sendJson(res, 502, {
      error: `${getProviderLabel(provider)} analysis failed: ${error.message}`
    });
  }
};

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isVercelPreview = typeof origin === "string" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  const allowedOrigin = allowedOrigins.has(origin) || isVercelPreview ? origin : "https://ashore1001.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    req.on("error", () => {
      reject(new Error("Failed to read request body."));
    });
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Request payload is required.";
  if (!payload.profile || typeof payload.profile !== "object") return "profile is required.";
  if (!payload.coursesSummary || typeof payload.coursesSummary !== "object") return "coursesSummary is required.";
  if (!Array.isArray(payload.targets)) return "targets must be an array.";
  if (!payload.localAnalysis || typeof payload.localAnalysis !== "object") return "localAnalysis is required.";
  return "";
}

function getAiProvider() {
  const provider = String(process.env.AI_PROVIDER || "openai").trim().toLowerCase();
  return provider === "deepseek" ? "deepseek" : "openai";
}

function getProviderApiKey(provider) {
  return provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
}

function getProviderKeyName(provider) {
  return provider === "deepseek" ? "DEEPSEEK_API_KEY" : "OPENAI_API_KEY";
}

function getProviderLabel(provider) {
  return provider === "deepseek" ? "DeepSeek" : "OpenAI";
}

function callAiProvider(provider, apiKey, payload) {
  return provider === "deepseek" ? callDeepSeek(apiKey, payload) : callOpenAI(apiKey, payload);
}

function getMentorInstructions() {
  return [
    "你是一个严师型中文升学规划导师。",
    "你只能依据用户提交的档案、课程汇总、目标院校和本地规则分析来判断。",
    "不要伪造院校官方政策、导师态度、真实录取概率或内部信息。",
    "概率表达必须使用等级和粗区间，不要输出精确单点概率。",
    "语气直给、偏严格、聚焦行动，但不要羞辱用户。",
    "返回内容必须是 JSON，不要使用 Markdown，不要附加解释。"
  ].join("\n");
}

function getMentorPrompt(payload) {
  return [
    "请根据以下结构化信息生成升学规划分析。",
    "JSON 字段必须包含：summary, riskLevel, estimatedRange, strengths, weaknesses, nextActions, mentorReport。",
    "strengths、weaknesses、nextActions 必须是字符串数组。",
    "mentorReport 用 3-6 段中文，指出当前最应该补的事情。",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}

async function callOpenAI(apiKey, payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      instructions: getMentorInstructions(),
      input: getMentorPrompt(payload),
      max_output_tokens: 1600
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error && data.error.message ? data.error.message : `OpenAI returned ${response.status}`;
    throw new Error(message);
  }

  const text = extractOutputText(data);
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseReportJson(text);
}

async function callDeepSeek(apiKey, payload) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: getMentorInstructions()
        },
        {
          role: "user",
          content: getMentorPrompt(payload)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1600,
      stream: false
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error && data.error.message ? data.error.message : `DeepSeek returned ${response.status}`;
    throw new Error(message);
  }

  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";

  if (!text) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return parseReportJson(text);
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  if (!Array.isArray(data.output)) return "";
  return data.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
}

function parseReportJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      mentorReport: text
    };
  }
}

function normalizeReport(report, localAnalysis) {
  return {
    summary: String(report.summary || localAnalysis.summary || "暂无总结"),
    riskLevel: String(report.riskLevel || localAnalysis.riskLevel || "信息不足"),
    estimatedRange: String(report.estimatedRange || localAnalysis.estimatedRange || "无法估计"),
    strengths: normalizeStringArray(report.strengths || localAnalysis.strengths),
    weaknesses: normalizeStringArray(report.weaknesses || localAnalysis.weaknesses),
    nextActions: normalizeStringArray(report.nextActions || localAnalysis.nextActions),
    mentorReport: String(report.mentorReport || "AI 返回内容无法解析，已保留本地规则分析作为参考。")
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean).slice(0, 10);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
