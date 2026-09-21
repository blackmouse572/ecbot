export const BasedChatbotDocParams = [
    {
        name: 'workspace',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'c6d23ab2-2f62-41a9-9a0d-24eae66b0316',
    },
];

export const ChatbotDocParamsId = [
    {
        name: 'id',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '8fca54a4-9e4a-4a31-990d-de34c44b1af3',
    },
    ...BasedChatbotDocParams,
];

// Request examples for Swagger documentation
export const ChatbotChatRequestExample = {
    prompt: 'I want to find all my pending orders',
    histories: [
        {
            role: 'user',
            content: 'Hi there!',
        },
        {
            role: 'model',
            content:
                "Hello! I'm here to help you with your orders. What can I do for you?",
        },
    ],
};

export const ChatbotCreateRequestExample = {
    name: 'Order Assistant Bot',
    avatar: 'https://example.com/avatar.png',
    generalKnowledge:
        'This is a pizza restaurant specializing in authentic Italian cuisine. We offer delivery and pickup services. Our popular items include Margherita pizza, Pepperoni pizza, and Pasta dishes. We are located in downtown area and serve customers from 10 AM to 10 PM.',
};

export const ChatbotUpdateRequestExample = {
    name: 'Updated Order Assistant Bot',
    avatar: 'https://example.com/new-avatar.png',
    generalKnowledge:
        'Updated shop information: This is a pizza restaurant with expanded menu including salads and desserts. We now offer 24/7 delivery service.',
};

// Response examples for Swagger documentation
export const ChatbotChatResponseExample = {
    content:
        "I'll help you find your pending orders. Let me search for all orders with pending status.",
    operation: 'read',
    data: {
        orders: [
            {
                id: 'order-123',
                title: 'Pizza Margherita',
                status: 'pending',
                type: 'food',
                address: '123 Main Street',
            },
        ],
        total: 1,
    },
};
