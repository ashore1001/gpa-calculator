const MAX_BODY_BYTES = 16 * 1024;

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

  if (req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      message: "这是目标院校公开资料检索接口。请在 GPA 网站的目标院校表单里点击“联网查找参考”。",
      website: "https://ashore1001.github.io/gpa-calculator/",
      method: "POST /api/research-target"
    });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Only GET help and POST /api/research-target are supported." });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const school = String(payload.school || "").trim();
  if (!school) {
    sendJson(res, 400, { error: "请先填写目标学校。" });
    return;
  }

  const program = String(payload.program || "").trim();
  const direction = String(payload.direction || "推免").trim();
  const query = buildSearchQuery(school, program, direction);
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const fallbackSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  try {
    const results = await searchWeb(query, searchUrl, fallbackSearchUrl);
    const extracted = await extractRequirementsWithAi({
      school,
      program,
      direction,
      results
    });
    sendJson(res, 200, {
      status: "ok",
      query,
      searchUrl: fallbackSearchUrl,
      extracted,
      results: results.slice(0, 5),
      disclaimer: "公开网页信息可能过期或不完整，请以学校学院官网、招生简章和当年通知为准。"
    });
  } catch (error) {
    const fallback = [{
      title: "打开完整搜索结果",
      url: fallbackSearchUrl,
      snippet: `自动检索被搜索服务限制：${error.message}。可以点开搜索结果手动查看学校官网、学院通知和夏令营公告。`
    }];
    sendJson(res, 200, {
      status: "limited",
      query,
      searchUrl: fallbackSearchUrl,
      extracted: extractRequirements(fallback),
      results: fallback,
      disclaimer: "搜索服务可能限制服务器访问。请以打开后的学校学院官网、招生简章和当年通知为准。"
    });
  }
};

function buildSearchQuery(school, program, direction) {
  return [
    school,
    program,
    direction,
    "推免",
    "夏令营",
    "最低排名",
    "GPA",
    "英语要求",
    "学院"
  ].filter(Boolean).join(" ");
}

async function searchDuckDuckGo(searchUrl) {
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"
    }
  });

  if (!response.ok) {
    throw new Error(`搜索服务返回 ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const itemRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = itemRegex.exec(html)) && results.length < 8) {
    const rest = html.slice(itemRegex.lastIndex, itemRegex.lastIndex + 1800);
    const snippetMatch = rest.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

    results.push({
      title: cleanHtml(match[2]),
      url: normalizeDuckUrl(match[1]),
      snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : ""
    });
  }

  if (results.length === 0) {
    return [{
      title: "打开完整搜索结果",
      url: searchUrl,
      snippet: "自动解析失败，但可以打开完整搜索结果手动查看学校官网、学院通知和夏令营公告。"
    }];
  }

  return results;
}

async function searchWeb(query, duckUrl, bingUrl) {
  try {
    return await searchDuckDuckGo(duckUrl);
  } catch (error) {
    return searchBing(query, bingUrl, error);
  }
}

async function searchBing(query, bingUrl, originalError) {
  const response = await fetch(bingUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"
    }
  });

  if (!response.ok) {
    throw new Error(`${originalError.message}；备用搜索返回 ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const itemRegex = /<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = itemRegex.exec(html)) && results.length < 8) {
    results.push({
      title: cleanHtml(match[2]),
      url: cleanHtml(match[1]),
      snippet: cleanHtml(match[3])
    });
  }

  if (results.length === 0) {
    throw new Error(`${originalError.message}；备用搜索没有解析到结果`);
  }

  return results;
}

function extractRequirements(results) {
  const text = results.map((item) => `${item.title} ${item.snippet}`).join(" ");
  const gpaMatch = text.match(/GPA[^\d]{0,8}([3-4](?:\.\d{1,2})?)/i) || text.match(/绩点[^\d]{0,8}([3-4](?:\.\d{1,2})?)/);
  const rankMatch = text.match(/(?:排名|专业排名|综合排名)[^\d]{0,8}前\s*(\d{1,3})\s*名?/) || text.match(/前\s*(\d{1,2})\s*%/);
  const englishMatch = text.match(/(六级[^\d]{0,8}\d{3}\+?|CET-?6[^\d]{0,8}\d{3}\+?|雅思[^\d]{0,8}\d(?:\.\d)?|托福[^\d]{0,8}\d{2,3})/i);
  const researchKeywords = [];

  if (/科研|论文|课题|实验室|导师/.test(text)) researchKeywords.push("偏好科研项目");
  if (/竞赛|获奖|挑战杯|互联网\+|数学建模/.test(text)) researchKeywords.push("竞赛或奖项可作为补充");
  if (/项目|工程实践|开源|实习/.test(text)) researchKeywords.push("项目经历有帮助");

  return {
    minGpa: gpaMatch ? Number.parseFloat(gpaMatch[1]) : null,
    minRank: rankMatch && !/%/.test(rankMatch[0]) ? Number.parseInt(rankMatch[1], 10) : null,
    rankReference: rankMatch ? cleanHtml(rankMatch[0]) : "",
    englishRequirement: englishMatch ? cleanHtml(englishMatch[1]) : "",
    researchPreference: researchKeywords.join("，")
  };
}

async function extractRequirementsWithAi(context) {
  const fallback = extractRequirements(context.results);
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "你是院校公开资料提取助手，只能从搜索结果标题、摘要和链接中提取信息。",
              "不要编造最低排名、GPA、英语要求或科研偏好。",
              "没有明确证据就返回 null 或空字符串。",
              "输出 JSON：minGpa(number|null), minRank(number|null), rankReference(string), englishRequirement(string), researchPreference(string), sourceSummary(string)。"
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify({
              school: context.school,
              program: context.program,
              direction: context.direction,
              results: context.results.slice(0, 5)
            }, null, 2)
          }
        ]
      })
    });

    if (!response.ok) return fallback;
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    return {
      minGpa: Number.isFinite(Number(parsed.minGpa)) ? Number(parsed.minGpa) : fallback.minGpa,
      minRank: Number.isFinite(Number(parsed.minRank)) ? Number(parsed.minRank) : fallback.minRank,
      rankReference: parsed.rankReference || fallback.rankReference || "",
      englishRequirement: parsed.englishRequirement || fallback.englishRequirement || "",
      researchPreference: parsed.researchPreference || fallback.researchPreference || "",
      sourceSummary: parsed.sourceSummary || ""
    };
  } catch {
    return fallback;
  }
}

function cleanHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDuckUrl(value) {
  const url = cleanHtml(value);
  try {
    const parsed = new URL(url, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg || parsed.href;
  } catch {
    return url;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isVercelPreview = typeof origin === "string" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  const allowedOrigin = allowedOrigins.has(origin) || isVercelPreview ? origin : "https://ashore1001.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
