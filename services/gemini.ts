
import { Task, Rubric, Review, Reference } from "../types";

declare const puter: {
  ai: {
    chat: (prompt: string, options?: { model?: string; stream?: boolean }) => Promise<unknown>;
  };
};

const MODEL = 'claude-3-5-sonnet';

const extractText = (result: unknown): string => {
  if (typeof result === 'string') {
    return result;
  }

  if (!result || typeof result !== 'object') {
    return '';
  }

  const candidate = result as {
    message?: {
      content?: string | Array<{ text?: string } | string>;
      text?: string;
    };
    content?: string | Array<{ text?: string } | string>;
    text?: string;
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };

  const nestedContent = candidate.message?.content ?? candidate.content;
  if (typeof nestedContent === 'string') {
    return nestedContent;
  }

  if (Array.isArray(nestedContent)) {
    return nestedContent
      .map((item) => typeof item === 'string' ? item : item.text ?? '')
      .join('')
      .trim();
  }

  if (typeof candidate.message?.text === 'string') {
    return candidate.message.text;
  }

  if (typeof candidate.text === 'string') {
    return candidate.text;
  }

  if (Array.isArray(candidate.choices) && candidate.choices.length > 0) {
    const choiceText = candidate.choices[0].message?.content ?? candidate.choices[0].text;
    if (typeof choiceText === 'string') {
      return choiceText;
    }
  }

  return '';
};

const chatWithFallback = async (prompt: string): Promise<string> => {
  try {
    const preferred = await puter.ai.chat(prompt, { model: MODEL });
    const preferredText = extractText(preferred);
    if (preferredText) {
      return preferredText;
    }
  } catch (error) {
    console.warn(`Failed to use model ${MODEL}, retrying with provider default.`, error);
  }

  const fallback = await puter.ai.chat(prompt);
  return extractText(fallback);
};

export const generatePolicyResponse = async (task: Task): Promise<string> => {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prompt = `
    SYSTEM: You are a professional public policy analyst.
    FORMAT: Professional Policy Memo.

    START THE MEMO WITH THIS HEADER STRUCTURE:
    **TO:** [Primary Decision Makers]
    **FROM:** Senior Public Policy Analyst
    **DATE:** ${date}
    **SUBJECT:** [Descriptive Title from Task]

    ---

    TASK CONTEXT:
    - Title: ${task.title}
    - Domain: ${task.domain}
    - Jurisdiction: ${task.jurisdiction}
    - Deliverable: ${task.deliverable_type}
    - Stakeholders: ${JSON.stringify(task.stakeholders)}
    - Constraints: ${JSON.stringify(task.constraints)}

    CONTENT REQUIREMENTS:
    1. Start with an ### **Executive Summary**.
    2. Use professional, clear, and structured sections (e.g., Background, Analysis, Recommendations).
    3. Adhere strictly to constraints: ${task.prompt_text}.
    4. If scientific or legal certainty is missing, clearly state assumptions.
    5. Use a neutral, authoritative tone suitable for high-level government officials.
  `;

  const text = await chatWithFallback(prompt);
  return text || "No response generated.";
};

export const evaluateResponse = async (task: Task, rubric: Rubric, responseText: string): Promise<Partial<Review>> => {
  const prompt = `
    ACT AS: A senior policy evaluator.
    TASK: ${JSON.stringify(task)}
    RUBRIC: ${JSON.stringify(rubric)}

    EVALUATE THE FOLLOWING RESPONSE:
    ---
    ${responseText}
    ---

    DIRECTIONS:
    - Grade objectively based on the rubric.
    - Provide clear, everyday language in your notes—avoid overly technical jargon where possible.

    RETURN JSON FORMAT ONLY (no markdown, no code fences, just raw JSON):
    {
      "scores": { "criteria_id": score_number },
      "hard_fail_triggered": boolean,
      "notes": "A helpful summary of the response quality.",
      "limitations": ["list", "of", "gaps", "or", "missing", "data"],
      "assumptions": ["list", "of", "assumptions", "the", "analyst", "made"],
      "rationale": "Detailed explanation of why this grade was given."
    }
  `;

  const result = await chatWithFallback(prompt);

  try {
    let text = result || "{}";
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse evaluation", e);
    return { notes: "Error in evaluation parsing." };
  }
};

export const generateReference = async (task: Task, responseText: string, style: Reference['style']): Promise<string> => {
  const styleGuides: Record<Reference['style'], string> = {
    neutral: 'Write in a neutral, objective academic tone. Present facts without advocacy. Suitable for non-partisan research offices.',
    staffer: 'Write in the voice of a legislative staffer briefing their principal. Be direct, action-oriented, and politically aware. Highlight what matters for the vote.',
    brief: 'Write a concise executive brief. Lead with the bottom line. Use bullet points and short paragraphs. Suitable for senior executives with limited time.',
    'one-pager': 'Condense everything into a single-page format. Use headers, bullets, and bold text for scannability. Maximum 500 words.'
  };

  const prompt = `
    SYSTEM: You are a professional policy reference writer.

    TASK CONTEXT:
    - Title: ${task.title}
    - Domain: ${task.domain}
    - Jurisdiction: ${task.jurisdiction}
    - Stakeholders: ${JSON.stringify(task.stakeholders)}
    - Constraints: ${JSON.stringify(task.constraints)}

    ORIGINAL POLICY MEMO:
    ---
    ${responseText}
    ---

    WRITING STYLE: ${style.toUpperCase()}
    ${styleGuides[style]}

    INSTRUCTIONS:
    Write a polished reference document based on the original policy memo above.
    The reference should distill the key findings, recommendations, and constraints into the specified style.
    Do not invent new policy positions—only reframe and summarize what exists in the memo.
  `;

  const text = await chatWithFallback(prompt);
  return text || "No reference generated.";
};
