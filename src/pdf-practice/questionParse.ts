import { extractCreateTableBlocks, extractInsertBlocks } from "./sqlSchemaParse";

export interface RawQA {
  text: string;
  answerSql: string | null;
}

export function stripSqlBlocks(text: string): string {
  let out = text;
  for (const block of [...extractCreateTableBlocks(text), ...extractInsertBlocks(text)]) {
    out = out.replace(block, "\n");
  }
  return out;
}

function cleanSqlAnswer(raw: string): string | null {
  let s = raw.trim();
  // Prefer a fenced code block if present.
  const fence = s.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Otherwise, keep only from the first SQL keyword onward.
  const kwMatch = s.match(/\b(SELECT|WITH|INSERT|UPDATE|DELETE)\b[\s\S]*/i);
  if (kwMatch) s = kwMatch[0];
  s = s.trim();
  if (!s) return null;
  if (!/\b(SELECT|WITH|INSERT|UPDATE|DELETE)\b/i.test(s)) return null;
  // Trim trailing prose that sometimes trails after the final semicolon.
  const semiIdx = s.lastIndexOf(";");
  if (semiIdx !== -1) s = s.slice(0, semiIdx + 1);
  return s.trim();
}

interface Marker {
  index: number;
  type: "question" | "answer";
  matchLen: number;
}

function findLabelMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  const qRe = /(?:^|\n)\s*(?:Question|Q)\s*\.?\s*\d{0,3}\s*[:.)]\s*/gi;
  const aRe = /(?:^|\n)\s*(?:Answer|Solution|SQL Answer|SQL)\s*\.?\s*\d{0,3}\s*[:.)]\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = qRe.exec(text))) markers.push({ index: m.index, type: "question", matchLen: m[0].length });
  while ((m = aRe.exec(text))) markers.push({ index: m.index, type: "answer", matchLen: m[0].length });
  markers.sort((a, b) => a.index - b.index);
  return markers;
}

function parseLabeledFormat(text: string): RawQA[] {
  const markers = findLabelMarkers(text);
  const qa: RawQA[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerParts: string[] = [];

  const flush = () => {
    if (currentQuestion !== null && currentQuestion.trim().length > 3) {
      qa.push({
        text: currentQuestion.trim(),
        answerSql: currentAnswerParts.length ? cleanSqlAnswer(currentAnswerParts.join("\n")) : null,
      });
    }
    currentQuestion = null;
    currentAnswerParts = [];
  };

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const contentStart = marker.index + marker.matchLen;
    const contentEnd = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const content = text.slice(contentStart, contentEnd);
    if (marker.type === "question") {
      flush();
      currentQuestion = content;
    } else if (currentQuestion !== null) {
      currentAnswerParts.push(content);
    }
  }
  flush();
  return qa;
}

function parseNumberedFormat(text: string): RawQA[] {
  const lines = text.split("\n");
  const startIdxs: number[] = [];
  const numRe = /^\s{0,3}(\d{1,3})[.)]\s+\S/;
  lines.forEach((line, i) => {
    if (numRe.test(line)) startIdxs.push(i);
  });
  if (startIdxs.length < 2) return [];

  const qa: RawQA[] = [];
  for (let i = 0; i < startIdxs.length; i++) {
    const start = startIdxs[i];
    const end = i + 1 < startIdxs.length ? startIdxs[i + 1] : lines.length;
    const chunkLines = lines.slice(start, end);
    // strip the leading "1. " marker from the first line
    chunkLines[0] = chunkLines[0].replace(numRe, "$1. ").replace(/^\s{0,3}\d{1,3}[.)]\s+/, "");
    const chunk = chunkLines.join("\n").trim();

    // Find the first SQL-looking line within the chunk (skip the first line itself, which is the question).
    const chunkLineArr = chunk.split("\n");
    let sqlStartLine = -1;
    for (let j = 1; j < chunkLineArr.length; j++) {
      if (/^\s*(SELECT|WITH)\b/i.test(chunkLineArr[j]) || /```/.test(chunkLineArr[j])) {
        sqlStartLine = j;
        break;
      }
    }

    let questionText: string;
    let answerSql: string | null = null;
    if (sqlStartLine !== -1) {
      questionText = chunkLineArr.slice(0, sqlStartLine).join("\n").trim();
      answerSql = cleanSqlAnswer(chunkLineArr.slice(sqlStartLine).join("\n"));
    } else {
      questionText = chunk;
    }
    // Strip any residual "Answer:" label text from the question portion
    questionText = questionText.replace(/\n?\s*(Answer|Solution)\s*\.?\s*\d{0,3}\s*[:.)]\s*$/i, "").trim();
    if (questionText.length > 3) {
      qa.push({ text: questionText, answerSql });
    }
  }
  return qa;
}

export function parseQuestionsAndAnswers(fullText: string): RawQA[] {
  const cleaned = stripSqlBlocks(fullText);
  const labeled = parseLabeledFormat(cleaned);
  if (labeled.length >= 2) return labeled;
  const numbered = parseNumberedFormat(cleaned);
  if (numbered.length >= 1) return numbered;
  return labeled; // may be 0 or 1 — better than nothing
}

const TOPIC_PATTERNS: { topic: string; re: RegExp }[] = [
  { topic: "SELECT", re: /\bSELECT\b/i },
  { topic: "WHERE", re: /\bWHERE\b/i },
  { topic: "GROUP BY", re: /\bGROUP\s+BY\b/i },
  { topic: "HAVING", re: /\bHAVING\b/i },
  { topic: "ORDER BY", re: /\bORDER\s+BY\b/i },
  { topic: "JOIN", re: /\bJOIN\b/i },
  { topic: "Subquery", re: /\bSELECT\b[\s\S]*\(\s*SELECT\b/i },
  { topic: "CTE", re: /\bWITH\s+[A-Za-z_][A-Za-z0-9_]*\s+AS\s*\(/i },
  { topic: "Window Functions", re: /\bOVER\s*\(|PARTITION\s+BY|ROW_NUMBER\s*\(|RANK\s*\(|DENSE_RANK\s*\(|LAG\s*\(|LEAD\s*\(/i },
  { topic: "UNION", re: /\bUNION\b/i },
  { topic: "DISTINCT", re: /\bDISTINCT\b/i },
  { topic: "CASE", re: /\bCASE\s+WHEN\b/i },
  { topic: "Aggregation", re: /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i },
];

export function detectTopics(questionText: string, answerSql: string | null): string[] {
  const haystack = `${questionText}\n${answerSql ?? ""}`;
  const topics: string[] = [];
  for (const { topic, re } of TOPIC_PATTERNS) {
    if (re.test(haystack)) topics.push(topic);
  }
  return topics;
}
