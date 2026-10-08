/**
 * The app's light theme (@medusajs/ui-preset tokens) as literal values:
 * email clients cannot read CSS variables, so the emails use these instead.
 */
export const EMAIL_THEME = {
    bgSubtle: '#FAFAFA', // --bg-subtle: page behind the card
    bgBase: '#FFFFFF', // --bg-base: the card
    bgComponent: '#F4F4F5', // --tag-neutral-bg: code box, logo chip
    borderBase: '#E4E4E7', // --border-base
    fgBase: '#18181B', // --fg-base: headings
    fgSubtle: '#52525B', // --fg-subtle: body text
    fgMuted: '#71717A', // --fg-muted: footnotes
    fgInteractive: '#3B82F6', // --fg-interactive: links
    buttonInverted: '#27272A', // --button-inverted: the primary button
    fgOnColor: '#FFFFFF', // --fg-on-color
    fontSans:
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontMono:
        "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    radius: '8px',
} as const;
