// The global admin activity list can be searched by who acted and on whose
// account. The search pipe builds its $or only from these paths.
export const ACTIVITY_ADMIN_AVAILABLE_SEARCH = [
    'by.name',
    'by.email',
    'user.name',
    'user.email',
];
