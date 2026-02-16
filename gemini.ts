
import { GoogleGenAI } from "@google/genai";
import { Task, Rubric, Response, Review } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "No response generated.";
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
    
    RETURN JSON FORMAT ONLY:
    {
      "scores": { "criteria_id": score_number },
      "hard_fail_triggered": boolean,
      "notes": "A helpful summary of the response quality.",
      "limitations": ["list", "of", "gaps", "or", "missing", "data"],
      "assumptions": ["list", "of", "assumptions", "the", "analyst", "made"],
      "rationale": "Detailed explanation of why this grade was given."
    }
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
        responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse evaluation", e);
    return { notes: "Error in evaluation parsing." };
  }
};
