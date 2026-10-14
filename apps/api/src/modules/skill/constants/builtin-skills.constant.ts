import type { SkillStep } from '@repo/agent-blueprint';

export interface BuiltinSkillDef {
    slug: string;
    name: string;
    description: string;
    guardrails: string[];
    steps: SkillStep[];
}

// Builtin skill templates seeded by Ecbot (workspace = null), written as steps.
// A workspace starts a new skill from one and edits it before saving.
export const BUILTIN_SKILLS: BuiltinSkillDef[] = [
    {
        slug: 'refund-policy',
        name: 'Refund policy',
        description:
            'Use when the customer asks about refunds, returns, or cancelling an order.',
        guardrails: ['Never promise a refund you cannot verify.'],
        steps: [
            {
                id: 'apologize',
                type: 'tell',
                text: 'A short apology for the trouble.',
            },
            { id: 'order', type: 'ask', text: 'The order code.' },
            {
                id: 'policy',
                type: 'tell',
                text: 'The refund window and its conditions.',
            },
            {
                id: 'eligible',
                type: 'if',
                branches: [
                    {
                        id: 'eligible-yes',
                        condition: 'The order is eligible for a refund.',
                        steps: [
                            {
                                id: 'next',
                                type: 'tell',
                                text: 'The next steps to get the refund.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'alternatives',
                        type: 'tell',
                        text: 'Why it is not eligible, and an exchange or another option if there is one.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'complaint-handling',
        name: 'Complaint handling',
        description:
            'Use when the customer is upset, complaining, or reporting a problem.',
        guardrails: ['Stay calm and polite, and never blame the customer.'],
        steps: [
            {
                id: 'acknowledge',
                type: 'tell',
                text: 'That you understand their frustration, without being defensive.',
            },
            {
                id: 'details',
                type: 'ask',
                text: 'What happened, with the order code or date if there is one.',
            },
            {
                id: 'summary',
                type: 'tell',
                text: 'A short summary of the issue, to check you understood it.',
            },
            {
                id: 'resolve',
                type: 'if',
                branches: [
                    {
                        id: 'resolve-yes',
                        condition: 'You can solve it with what you know.',
                        steps: [
                            {
                                id: 'fix',
                                type: 'tell',
                                text: 'A concrete next step or resolution.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'handoff',
                        type: 'tell',
                        text: 'That a team member will take over, then hand the conversation to staff.',
                    },
                ],
            },
        ],
    },
];
