export const AccountDocAuth = { xApiKey: true, jwtAccessToken: true };

export const BasedAccountDocParams = [
    {
        name: 'workspace',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'bd5685ef-5f25-48b8-9983-7f16b0c1af3d',
    },
];

export const AccountDocParamsId = [
    {
        name: 'accountId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'a7cfe191-df95-4cd6-9744-c9372f3c916a',
    },
    ...BasedAccountDocParams,
];
