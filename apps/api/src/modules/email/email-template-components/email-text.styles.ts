import type React from 'react';
import { EMAIL_THEME as T } from './email-theme';

/** Body text inside the email card. */
export const EMAIL_BODY: React.CSSProperties = {
    margin: '0 0 12px',
    fontSize: '14px',
    lineHeight: '20px',
    color: T.fgSubtle,
};

/** Footnotes inside the card: why you got this, references. */
export const EMAIL_MUTED: React.CSSProperties = {
    ...EMAIL_BODY,
    fontSize: '12px',
    color: T.fgMuted,
};
