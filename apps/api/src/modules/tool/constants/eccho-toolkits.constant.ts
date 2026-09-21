export interface EcchoToolkitDef {
    slug: string;
    name: string;
    description: string;
    logo?: string;
    categories: Array<{ id: string; name: string }>;
    baseUrl: string;
    mcpPath: string;
    authorizePath: string;
}

export const ECCHO_TOOLKITS: EcchoToolkitDef[] = [
    {
        slug: 'kiotviet',
        name: 'KiotViet',
        description:
            'Integrate KiotViet retail management — inventory, orders, customers, and sales via KiotViet Retail API.',
        logo: undefined,
        categories: [
            { id: 'ecommerce', name: 'E-commerce' },
            { id: 'inventory', name: 'Inventory' },
        ],
        baseUrl: process.env['ECCHO_KIOTVIET_MCP_URL'] ?? '',
        mcpPath: '/mcp',
        authorizePath: '/authorize',
    },
];
