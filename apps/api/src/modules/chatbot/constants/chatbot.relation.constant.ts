export const ACCOUNT_SUMMARY_FIELDS = [
    '_id',
    'name',
    'slug',
    'avatar',
    'status',
];

export const ACCOUNT_POPULATE_OPTIONS = {
    path: 'accounts',
    select: ACCOUNT_SUMMARY_FIELDS.join(' '),
};

export const WORKSPACE_SUMMARY_FIELDS = ['_id', 'name', 'avatar', 'slug'];

export const WORKSPACE_POPULATE_OPTIONS = {
    path: 'workspace',
    select: WORKSPACE_SUMMARY_FIELDS.join(' '),
};
