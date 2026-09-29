import slugify from 'slugify';

/**
 * The URL slug for a workspace: lowercase letters, digits and hyphens only,
 * the same shape the app's edit form accepts. Empty when nothing slug-safe is
 * left (e.g. a name in a non-Latin script); the caller picks a fallback.
 */
export function toWorkspaceSlug(value: string): string {
    return slugify(value, { lower: true, strict: true, locale: 'vi' });
}
