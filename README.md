# Polisee 🏛️

**Verification-First Public Policy Intelligence & Governance Platform**

Polisee is a sovereign, high-integrity platform designed for the creation, evaluation, and deterministic auditing of public policy tasks. Operating under the **Newton Verification Agent** framework, Polisee ensures that AI-generated policy deliverables adhere to strict jurisdictional constraints, budgetary limits, and stakeholder requirements.

---

## 📑 Table of Contents
- [Core Philosophy](#core-philosophy)
- [System Architecture (System of Systems)](#system-architecture)
- [Key Features](#key-features)
- [End-to-End Workflow](#end-to-end-workflow)
- [Newton Verification Agent](#newton-verification-agent)
- [Deterministic Audit Ledger](#deterministic-audit-ledger)
- [Technical Stack](#technical-stack)

---

## 🎯 Core Philosophy

Public policy requires more than just generation; it requires **verification**. Polisee moves away from "black box" AI by implementing a "System of Systems" approach where:
1.  **Tasks** define the legal and political boundaries.
2.  **Generators** produce structured deliverables.
3.  **Evaluators** (Newton) verify the output against customizable **Rulesets**.
4.  **Ledgers** record every state change for total auditability.

---

## 🏗️ System Architecture

Polisee is built as a modular "System of Systems":

-   **The Policy Lab**: A specialized IDE for policy professionals to define tasks with multi-dimensional constraints (Budget, Timeline, Legal, Political, Equity).
-   **The Evaluation Center**: The verification hub where generated work is cross-referenced against complex rubrics.
-   **The Ruleset Engine**: A standardized framework for defining "what good looks like" in a specific jurisdiction or domain.
-   **The Sovereign Ledger**: An append-only log of all platform activities, ensuring a verifiable paper trail.

---

## ✨ Key Features

-   **Deep Constraint Modeling**: Fields for Budget, Timeline, Legal Limits, Political Feasibility, and Equity Impact.
-   **Professional Memo Engine**: Generates deliverables using professional header structures (`TO`, `FROM`, `DATE`, `SUBJECT`) and structured logic.
-   **Custom Rubric Association**: Link specific grading standards to specific tasks for consistent performance monitoring.
-   **Gemini 3 Integration**: Utilizes `gemini-3-flash-preview` for high-reasoning policy analysis and objective evaluation.
-   **Apple-Inspired UX**: A clean, responsive interface designed for high-focus professional work.
-   **Sovereign Data**: All data persists in browser LocalStorage, ensuring private, local-first computation.

---

## 🔄 End-to-End Workflow

1.  **Define**: Create a task in the **Policy Lab**. Associate it with a specific domain (e.g., Climate, Housing) and a **Ruleset**.
2.  **Generate**: Trigger the AI Analyst. It synthesizes all constraints into a professional policy memo or brief.
3.  **Evaluate**: Move to the **Evaluation Center**. The Newton Agent runs an objective assessment based on the linked rubric.
4.  **Audit**: Review the **History** tab to see the deterministic ledger of every step taken.
5.  **Export**: Download the entire verified dataset in JSONL or CSV for external reporting.

---

## 🤖 Newton Verification Agent

The **Newton Agent** is the heart of the evaluation process. Unlike standard chat agents, Newton is instructed to act as a **Senior Policy Auditor**. It looks for:
-   **Hard Fails**: Does the memo recommend something illegal?
-   **Stakeholder Alignment**: Are the goals of all listed parties addressed?
-   **Assumption Mapping**: What did the model assume where data was missing?
-   **Constraint Adherence**: Did the memo stay within the $5.2M budget limit?

---

## 📜 Deterministic Audit Ledger

Every action in Polisee creates a `LedgerEvent`. This includes:
-   `CREATE_TASK`: Versioning the initial intent.
-   `GENERATE_RESPONSE`: Linking specific model versions to specific outputs.
-   `SCORE_RESPONSE`: Recording the exact rubric scores and the rationale provided by Newton.

This ledger provides the transparency needed for high-stakes government and enterprise environments.

---

## 🛠️ Technical Stack

-   **Frontend**: React (ESM) + Tailwind CSS
-   **Intelligence**: Google Gemini API (`@google/genai`)
-   **Design System**: Apple HIG-inspired custom components
-   **Storage**: Local-first browser persistence
-   **Verification**: Custom JSON-Schema-based evaluation logic

---

*Polisee is designed for sovereign computation. No data is sent to external servers except for the transient AI inference calls.*