export interface ICustomerTagSeed {
    name: string;
    emoji: string;
    description: string;
    triggersHandoff: boolean;
}

export const CUSTOMER_TAG_DEFAULTS: ICustomerTagSeed[] = [
    {
        name: 'Hot lead',
        emoji: '🔥',
        description: 'Customer has shown strong buying intent.',
        triggersHandoff: false,
    },
    {
        name: 'New lead',
        emoji: '✨',
        description: 'First-time customer, no history yet.',
        triggersHandoff: false,
    },
    {
        name: 'Returning customer',
        emoji: '🔁',
        description: 'Customer has interacted before.',
        triggersHandoff: false,
    },
    {
        name: 'VIP',
        emoji: '⭐',
        description: 'High-value customer, prioritize.',
        triggersHandoff: false,
    },
    {
        name: 'Positive',
        emoji: '😊',
        description: 'Customer expressed satisfaction.',
        triggersHandoff: false,
    },
    {
        name: 'Negative',
        emoji: '😟',
        description: 'Customer expressed dissatisfaction.',
        triggersHandoff: false,
    },
    {
        name: 'Complaint',
        emoji: '❗',
        description: 'Customer raised a complaint.',
        triggersHandoff: true,
    },
    {
        name: 'Angry',
        emoji: '🚨',
        description: 'Customer is upset or hostile.',
        triggersHandoff: true,
    },
];
