const { z } = require("zod");

// Every model answer MUST conform to this schema before it can be returned.
// strictObject => unknown/extra fields are rejected.
const classificationSchema = z.strictObject({
  category: z.enum(["bug", "feature", "question", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
});

const formatIssues = (issues) =>
  issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");

/**
 * Best-effort extraction of a JSON object from model text. Handles the common
 * failure mode where the model wraps JSON in prose or a ```json fence.
 * Returns the parsed value or null (never throws).
 */
function extractJson(text) {
  if (typeof text !== "string" || text.trim() === "") return null;
  let t = text.trim();

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Validate raw model text against the classification schema.
 * @returns {{ok: true, value: object} | {ok: false, error: string}}
 */
function validateClassification(text) {
  const json = extractJson(text);
  if (json === null) {
    return { ok: false, error: "Response was not parseable JSON" };
  }
  const parsed = classificationSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: `Schema validation failed: ${formatIssues(parsed.error.issues)}` };
  }
  return { ok: true, value: parsed.data };
}

module.exports = { classificationSchema, extractJson, validateClassification };
