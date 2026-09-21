// Dotted paths are expanded into nested relation filters by the search pipe, so
// the global admin session list can be searched by the owning user's email/name.
// This is the ONLY whitelist the pipe honours: PaginationService.search() builds
// its $or exclusively from these entries, and the client-supplied string is only
// ever the match value — never a field name — so no other path can be reached.
export const SESSION_DEFAULT_AVAILABLE_SEARCH = ['user.email', 'user.name'];
