import { generateText, Output } from "ai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import type { EngineerParseData } from "@/lib/validations/engineer";
import { engineerParseSchema } from "@/lib/validations/engineer";
import { llm } from "./provider";

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function extractTextFromXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer);
  const texts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    texts.push(`[${sheetName}]\n${csv}`);
  }
  return texts.join("\n\n");
}

const PARSE_PROMPT = `以下のスキルシート/職務経歴書から、エンジニアの情報を構造化してください。

抽出ルール:
- name: フルネーム
- email: メールアドレス（見つからなければ null）
- skills: 各技術スキル。level は beginner/intermediate/advanced/expert で判定。years は経験年数
- experience_years: IT業界全体での経験年数
- industries: 経験した業界（金融、医療、EC、製造、公共 など）
- availability: 単価、稼働開始日、リモート可否、勤務地（記載がなければ null/false）
- soft_skills: マネジメント、リーダー経験、コミュニケーション等

記載がない項目は null、空配列、false などデフォルト値にしてください。`;

export async function parseDocumentWithAI(
  fileBuffer: Buffer,
  mimeType: string,
  _fileName: string,
): Promise<{ data: EngineerParseData; rawText: string }> {
  let rawText: string;
  let messages: Parameters<typeof generateText>[0]["messages"];

  if (mimeType === "application/pdf") {
    rawText = "[PDFファイル - テキストはAIが直接抽出]";
    messages = [
      {
        role: "user",
        content: [
          { type: "file", data: fileBuffer, mediaType: "application/pdf" },
          { type: "text", text: PARSE_PROMPT },
        ],
      },
    ];
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    rawText = await extractTextFromDocx(fileBuffer);
    messages = [
      {
        role: "user",
        content: `${PARSE_PROMPT}\n\n---\n\n${rawText}`,
      },
    ];
  } else if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    rawText = extractTextFromXlsx(fileBuffer);
    messages = [
      {
        role: "user",
        content: `${PARSE_PROMPT}\n\n---\n\n${rawText}`,
      },
    ];
  } else {
    throw new Error(`未対応のファイル形式: ${mimeType}`);
  }

  const result = await generateText({
    model: llm,
    output: Output.object({ schema: engineerParseSchema }),
    messages,
  });

  return { data: result.output, rawText };
}
