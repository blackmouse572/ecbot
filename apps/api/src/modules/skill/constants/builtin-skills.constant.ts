export interface BuiltinSkillDef {
    slug: string;
    name: string;
    description: string;
    instructions: string;
}

// Builtin skill templates seeded by Ecbot (workspace = null). A workspace
// clones one into an editable, workspace-owned skill (copy-on-add).
export const BUILTIN_SKILLS: BuiltinSkillDef[] = [
    {
        slug: 'refund-policy',
        name: 'Refund policy',
        description:
            'Use when the customer asks about refunds, returns, or cancelling an order.',
        instructions: [
            '# Refund policy',
            '',
            'When a customer asks for a refund or return:',
            '1. Acknowledge and apologize briefly.',
            '2. Ask for the order code so you can look it up.',
            '3. Explain the refund window and any conditions.',
            '4. If eligible, confirm the next steps; if not, offer alternatives.',
            'Stay polite and never promise a refund you cannot verify.',
        ].join('\n'),
    },
    {
        slug: 'complaint-handling',
        name: 'Complaint handling',
        description:
            'Use when the customer is upset, complaining, or reporting a problem.',
        instructions: [
            '# Complaint handling',
            '',
            'When a customer complains:',
            '1. Listen and acknowledge their frustration without being defensive.',
            '2. Apologize for the experience, then ask clarifying questions.',
            '3. Summarize the issue back to confirm you understood.',
            '4. Offer a concrete next step or resolution.',
            'If the issue needs a human, hand off to an operator.',
        ].join('\n'),
    },
];
