import slugify from 'slugify';
import { WORKSPACE_SLUG_MAX_LENGTH } from '../constants/workspace.constant';

/**
 * The URL slug for a workspace: lowercase letters, digits and hyphens only,
 * the same shape the app's edit form accepts. Empty when nothing slug-safe is
 * left (e.g. a name in a non-Latin script); the caller picks a fallback.
 * Cut to the column length, so a long name cannot fail the insert.
 */
export function toWorkspaceSlug(value: string): string {
    return slugify(value, { lower: true, strict: true, locale: 'vi' })
        .slice(0, WORKSPACE_SLUG_MAX_LENGTH)
        .replace(/-+$/, '');
}
