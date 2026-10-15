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
                    { id: 'handoff', type: 'tool', toolId: 'system:handoff' },
                    {
                        id: 'handoff-tell',
                        type: 'tell',
                        text: 'That a team member will take over.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'order-status',
        name: 'Order status',
        description:
            'Use when the customer asks where their order is, or when it will arrive.',
        guardrails: ['Never make up a delivery date or a tracking status.'],
        steps: [
            {
                id: 'order',
                type: 'ask',
                text: 'The order code, or the phone number used to order.',
            },
            {
                id: 'status',
                type: 'tell',
                text: 'The current status and the expected delivery, from what you know.',
            },
            {
                id: 'late',
                type: 'if',
                branches: [
                    {
                        id: 'late-yes',
                        condition: 'The order is late or lost.',
                        steps: [
                            {
                                id: 'late-sorry',
                                type: 'tell',
                                text: 'A short apology for the delay.',
                            },
                            {
                                id: 'late-handoff',
                                type: 'tool',
                                toolId: 'system:handoff',
                            },
                            {
                                id: 'late-tell',
                                type: 'tell',
                                text: 'That a team member will check the order and get back to them.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'follow',
                        type: 'tell',
                        text: 'How to follow the delivery until it arrives.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'book-appointment',
        name: 'Book an appointment',
        description:
            'Use when the customer wants to book a service, a visit, or a time slot.',
        guardrails: [
            'Never promise a time slot is free unless you checked it. If you cannot check, say the team will confirm the time.',
            'Never give a medical diagnosis.',
        ],
        steps: [
            { id: 'service', type: 'ask', text: 'Which service they want.' },
            {
                id: 'time',
                type: 'ask',
                text: 'The date and time they prefer.',
            },
            {
                id: 'contact',
                type: 'ask',
                text: 'Their name and phone number.',
            },
            {
                id: 'summary',
                type: 'tell',
                text: 'A summary of the booking to confirm: service, date, time and name.',
            },
            {
                id: 'confirmed',
                type: 'if',
                branches: [
                    {
                        id: 'confirmed-yes',
                        condition: 'The customer confirms the booking.',
                        steps: [
                            {
                                id: 'next',
                                type: 'tell',
                                text: 'What happens next, such as arriving a little early or what to bring.',
                            },
                            {
                                id: 'reminder',
                                type: 'tool',
                                toolId: 'system:schedule_followup',
                                text: 'Remind the customer of the appointment the day before.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'change',
                        type: 'ask',
                        text: 'What they would like to change.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'reschedule-cancel-booking',
        name: 'Reschedule or cancel a booking',
        description:
            'Use when the customer wants to move or cancel a booking or reservation they already made.',
        guardrails: ['Never charge or waive a fee without staff approval.'],
        steps: [
            {
                id: 'booking',
                type: 'ask',
                text: 'The name or phone number on the booking, and its date.',
            },
            {
                id: 'intent',
                type: 'if',
                branches: [
                    {
                        id: 'reschedule',
                        condition: 'The customer wants to move the booking.',
                        steps: [
                            {
                                id: 'new-time',
                                type: 'ask',
                                text: 'The new date and time they prefer.',
                            },
                            {
                                id: 'new-summary',
                                type: 'tell',
                                text: 'A summary of the new booking to confirm.',
                            },
                        ],
                    },
                    {
                        id: 'cancel',
                        condition: 'The customer wants to cancel the booking.',
                        steps: [
                            {
                                id: 'cancel-policy',
                                type: 'tell',
                                text: 'The cancellation policy, including any fee.',
                            },
                            {
                                id: 'cancel-confirm',
                                type: 'ask',
                                text: 'Whether they still want to cancel.',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: 'product-recommendation',
        name: 'Product recommendation',
        description:
            'Use when the customer is unsure what to buy, or asks what would suit them.',
        guardrails: [
            'Only recommend products you know are sold here.',
            'Never make health or medical claims about a product.',
        ],
        steps: [
            { id: 'need', type: 'ask', text: 'What they need it for.' },
            {
                id: 'prefs',
                type: 'ask',
                text: 'Their budget, and their size, skin type or taste when it matters.',
            },
            {
                id: 'picks',
                type: 'tell',
                text: 'Two or three matching products, each with its price and why it fits.',
            },
            {
                id: 'picked',
                type: 'if',
                branches: [
                    {
                        id: 'picked-yes',
                        condition: 'The customer picks a product.',
                        steps: [
                            {
                                id: 'how-order',
                                type: 'tell',
                                text: 'How to order it.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'dislike',
                        type: 'ask',
                        text: 'What they did not like, so you can suggest something else.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'prices-promotions',
        name: 'Prices and promotions',
        description:
            'Use when the customer asks about prices, discounts, vouchers or current deals.',
        guardrails: [
            'Never invent a discount, or offer a promotion after its end date.',
        ],
        steps: [
            {
                id: 'item',
                type: 'ask',
                text: 'Which product or service they mean, if it is not clear.',
            },
            {
                id: 'price',
                type: 'tell',
                text: 'The price, and any promotion running now with its conditions and end date.',
            },
            {
                id: 'how-buy',
                type: 'tell',
                text: 'How to order or book it.',
            },
        ],
    },
    {
        slug: 'shipping-delivery',
        name: 'Shipping and delivery',
        description:
            'Use when the customer asks about shipping fees, delivery areas or delivery time before ordering.',
        guardrails: ['Never promise a delivery time you cannot back up.'],
        steps: [
            {
                id: 'area',
                type: 'ask',
                text: 'Their province or district.',
            },
            {
                id: 'fee',
                type: 'tell',
                text: 'The shipping fee and the expected delivery time for that area.',
            },
            {
                id: 'payment',
                type: 'tell',
                text: 'The payment options, such as cash on delivery or bank transfer.',
            },
        ],
    },
    {
        slug: 'consultation-request',
        name: 'Consultation request',
        description:
            'Use when the customer is interested but needs advice from a consultant before deciding.',
        guardrails: [
            'Never give a final price, rate or approval. A consultant confirms it.',
        ],
        steps: [
            {
                id: 'interest',
                type: 'ask',
                text: 'What they are interested in.',
            },
            {
                id: 'requirement',
                type: 'ask',
                text: 'Their budget or main requirement.',
            },
            {
                id: 'contact',
                type: 'ask',
                text: 'Their name, phone number, and a good time to call.',
            },
            {
                id: 'callback',
                type: 'tell',
                text: 'That a consultant will contact them, and roughly when.',
            },
        ],
    },
    {
        slug: 'table-reservation',
        name: 'Table reservation',
        description: 'Use when the customer wants to reserve a table.',
        guardrails: [
            'Never promise a table is free unless you checked it. If you cannot check, say the team will confirm it.',
        ],
        steps: [
            {
                id: 'party',
                type: 'ask',
                text: 'The date, time and number of guests.',
            },
            {
                id: 'request',
                type: 'ask',
                text: 'Any special request, such as a birthday, children or a seating area.',
            },
            {
                id: 'contact',
                type: 'ask',
                text: 'Their name and phone number.',
            },
            {
                id: 'summary',
                type: 'tell',
                text: 'A summary of the reservation to confirm, and how long the table is held.',
            },
        ],
    },
    {
        slug: 'room-booking',
        name: 'Room booking',
        description:
            'Use when the customer asks about rooms, availability or booking a stay.',
        guardrails: [
            'Never promise a room or a rate unless you checked it. If you cannot check, say the team will confirm it.',
        ],
        steps: [
            {
                id: 'stay',
                type: 'ask',
                text: 'The check-in and check-out dates, and the number of guests.',
            },
            {
                id: 'rooms',
                type: 'tell',
                text: 'The room types that fit, with the price per night.',
            },
            {
                id: 'chosen',
                type: 'if',
                branches: [
                    {
                        id: 'chosen-yes',
                        condition: 'The customer chooses a room.',
                        steps: [
                            {
                                id: 'contact',
                                type: 'ask',
                                text: 'Their name and phone number.',
                            },
                            {
                                id: 'deposit',
                                type: 'tell',
                                text: 'How to pay the deposit to hold the room.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'priority',
                        type: 'ask',
                        text: 'What matters most to them, such as price, view or location.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'course-enrollment',
        name: 'Course enrollment',
        description:
            'Use when the customer asks about a course or class, or wants to sign up.',
        guardrails: ['Never promise results or guarantee a score.'],
        steps: [
            {
                id: 'goal',
                type: 'ask',
                text: 'Their goal and current level.',
            },
            {
                id: 'course',
                type: 'tell',
                text: 'The course that fits, with its schedule, length and fee.',
            },
            {
                id: 'enroll',
                type: 'if',
                branches: [
                    {
                        id: 'enroll-yes',
                        condition: 'The customer wants to enroll.',
                        steps: [
                            {
                                id: 'contact',
                                type: 'ask',
                                text: 'Their name and phone number.',
                            },
                            {
                                id: 'next',
                                type: 'tell',
                                text: 'The next steps to enroll.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'trial',
                        type: 'tell',
                        text: 'A free trial class or consultation, if there is one.',
                    },
                ],
            },
        ],
    },
    {
        slug: 'warranty-exchange',
        name: 'Warranty and exchange',
        description:
            'Use when a product is faulty or the wrong size, or the customer wants to exchange it.',
        guardrails: [
            'Never approve an exchange outside the policy without staff.',
        ],
        steps: [
            {
                id: 'issue',
                type: 'ask',
                text: 'The order code and what is wrong, with a photo if possible.',
            },
            {
                id: 'policy',
                type: 'tell',
                text: 'The warranty or exchange policy that applies.',
            },
            {
                id: 'qualifies',
                type: 'if',
                branches: [
                    {
                        id: 'qualifies-yes',
                        condition: 'The product qualifies under the policy.',
                        steps: [
                            {
                                id: 'return',
                                type: 'tell',
                                text: 'How to send it back or bring it in.',
                            },
                        ],
                    },
                ],
                otherwise: [
                    {
                        id: 'why-not',
                        type: 'tell',
                        text: 'Why it does not qualify.',
                    },
                    {
                        id: 'disagree',
                        type: 'if',
                        branches: [
                            {
                                id: 'disagree-yes',
                                condition: 'The customer disagrees.',
                                steps: [
                                    {
                                        id: 'disagree-handoff',
                                        type: 'tool',
                                        toolId: 'system:handoff',
                                    },
                                    {
                                        id: 'disagree-tell',
                                        type: 'tell',
                                        text: 'That a team member will review it.',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: 'talk-to-a-person',
        name: 'Talk to a person',
        description:
            'Use when the customer asks for a human, or you cannot help with their request.',
        guardrails: ['Never pretend to be a human.'],
        steps: [
            {
                id: 'summary',
                type: 'ask',
                text: 'A short summary of what they need, so staff do not ask again.',
            },
            { id: 'handoff', type: 'tool', toolId: 'system:handoff' },
            {
                id: 'handoff-tell',
                type: 'tell',
                text: 'That a team member will take over, and the working hours if it is outside them.',
            },
        ],
    },
];
