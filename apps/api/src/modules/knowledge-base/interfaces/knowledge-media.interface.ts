/**
 * The compact JPG copy of a media image, kept on the item as
 * `metadata.compact`. apps/ai reads it to hand channels that cap photos a
 * copy they take.
 */
export interface IKnowledgeMediaCompact {
    url: string;
    mime: string;
    size: number;
}
