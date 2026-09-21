// Dotted paths are expanded into nested relation filters by the search pipe, so
// the global admin password-history list can be searched by the owning user's
// email/name. This is the ONLY whitelist the pipe honours: PaginationService
// .search() builds its $or exclusively from these entries, and the client string
// is only ever the match value — never a field name — so no other path is reachable.
export const PASSWORD_HISTORY_DEFAULT_AVAILABLE_SEARCH = [
    'user.email',
    'user.name',
];
