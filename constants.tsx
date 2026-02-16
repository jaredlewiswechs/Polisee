
import { Task, Rubric } from './types';

export const STARTER_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Urban Housing Zoning Reform',
    domain: 'housing',
    jurisdiction: 'City of Seattle',
    stakeholders: [
      { name: 'Developers', goal: 'Maximize density and profit' },
      { name: 'Homeowners', goal: 'Preserve neighborhood character' }
    ],
    constraints: {
      budget: 'N/A',
      timeline: 'Next legislative session',
      legal_limits: 'State preemption laws on density',
      equity_impacts: 'Must address historical redlining'
    },
    deliverable_type: 'memo',
    difficulty: 3,
    prompt_text: 'Draft a policy memo recommending zoning changes to increase middle housing near transit hubs.',
    metadata: {},
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 't-2',
    title: 'Grid Resilience Investment',
    domain: 'climate',
    jurisdiction: 'Federal (DOE)',
    stakeholders: [
      { name: 'Utility Companies', goal: 'Reliability over renewables' },
      { name: 'Climate Advocates', goal: '100% renewable by 2035' }
    ],
    constraints: {
      budget: '$5B Grant Program',
      political_feasibility: 'Must appeal to bipartisan infrastructure goals'
    },
    deliverable_type: 'brief',
    difficulty: 4,
    prompt_text: 'Synthesize the conflicting goals of grid stability and rapid decarbonization for a Congressional subcommittee.',
    metadata: {},
    created_at: Date.now(),
    updated_at: Date.now()
  },
  // ... more tasks could be added here for the 10 total
];

export const STARTER_RUBRICS: Rubric[] = [
  {
    id: 'r-1',
    name: 'Standard Policy Memo Rubric',
    type: 'memo',
    criteria: [
      {
        id: 'c-1',
        label: 'Policy Clarity',
        description: 'Is the core recommendation easy to find?',
        levels: [
          { score: 0, description: 'No clear recommendation.' },
          { score: 4, description: 'Explicit recommendation with immediate rationale.' }
        ]
      },
      {
        id: 'c-2',
        label: 'Stakeholder Analysis',
        description: 'Does it address the stated stakeholders?',
        levels: [
          { score: 0, description: 'Ignores stakeholders.' },
          { score: 4, description: 'Nuanced trade-off analysis between all parties.' }
        ]
      }
    ],
    hard_fails: ['Illegal recommendation', 'Factual hallucination'],
    failure_modes: [{ mode: 'Jargon-heavy', example: 'Using overly academic terms for a city council audience.' }],
    created_at: Date.now()
  }
];
