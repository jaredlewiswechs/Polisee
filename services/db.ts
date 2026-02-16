
import { Task, Rubric, Response, Review, Reference, LedgerEvent, LedgerEventType } from '../types';

interface Store {
  tasks: Task[];
  rubrics: Rubric[];
  responses: Response[];
  reviews: Review[];
  references: Reference[];
  ledger: LedgerEvent[];
}

const STORAGE_KEY = 'polisee_storage_v1';

const getInitialStore = (): Store => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    tasks: [],
    rubrics: [],
    responses: [],
    reviews: [],
    references: [],
    ledger: []
  };
};

export const saveStore = (store: Store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const createEvent = (
  type: LedgerEventType, 
  entity_type: LedgerEvent['entity_type'], 
  entity_id: string, 
  summary: string, 
  patch: any = {}
): LedgerEvent => ({
  id: `evt-${Math.random().toString(36).substr(2, 9)}`,
  ts: Date.now(),
  type,
  entity_type,
  entity_id,
  summary,
  patch
});

export { getInitialStore };
