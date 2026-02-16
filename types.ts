
export type Domain = 
  | 'education' | 'housing' | 'health' | 'climate' | 'labor' 
  | 'transportation' | 'elections' | 'emergency_mgmt' 
  | 'intl_relations' | 'trade' | 'tech_regulation';

export type DeliverableType = 
  | 'memo' | 'brief' | 'stakeholder_summary' | 'options_matrix' | 'ethics_review';

export interface Task {
  id: string;
  title: string;
  domain: Domain;
  jurisdiction: string;
  stakeholders: { name: string; goal: string }[];
  constraints: {
    budget?: string;
    timeline?: string;
    legal_limits?: string;
    political_feasibility?: string;
    equity_impacts?: string;
    sensitivity?: string;
  };
  deliverable_type: DeliverableType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt_text: string;
  rubric_id?: string; // Associated rubric ID
  metadata: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface RubricLevel {
  score: number;
  description: string;
}

export interface RubricCriteria {
  id: string;
  label: string;
  description: string;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  name: string;
  type: DeliverableType | 'general';
  criteria: RubricCriteria[];
  hard_fails: string[];
  failure_modes: { mode: string; example: string }[];
  created_at: number;
}

export interface Response {
  id: string;
  task_id: string;
  model_info: string;
  text: string;
  seed?: number;
  params?: Record<string, any>;
  created_at: number;
}

export interface Review {
  id: string;
  response_id: string;
  rubric_id: string;
  scores: Record<string, number>;
  hard_fail_triggered: boolean;
  notes: string;
  limitations: string[];
  assumptions: string[];
  rationale: string;
  created_at: number;
}

export interface Reference {
  id: string;
  task_id: string;
  text: string;
  style: 'neutral' | 'staffer' | 'brief' | 'one-pager';
  created_at: number;
}

export type LedgerEventType = 
  | 'CREATE_TASK' | 'EDIT_TASK' | 'GENERATE_RESPONSE' 
  | 'CREATE_RUBRIC' | 'SCORE_RESPONSE' | 'WRITE_REFERENCE' | 'EXPORT_DATASET';

export interface LedgerEvent {
  id: string;
  ts: number;
  type: LedgerEventType;
  entity_type: 'Task' | 'Response' | 'Rubric' | 'Review' | 'Reference' | 'Dataset';
  entity_id: string;
  patch: any;
  summary: string;
}

export const SCHEMA_VERSION = 'polisee_schema_v1';
