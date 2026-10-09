import { Button } from '@react-email/components';
import React from 'react';
import { EMAIL_THEME as T } from './email-theme';

/** The app's primary button (button-inverted): dark fill, white label. */
const EmailButton: React.FC<{ href: string; children: React.ReactNode }> = ({
    href,
    children,
}) => (
    <Button
        href={href}
        style={{
            display: 'inline-block',
            backgroundColor: T.buttonInverted,
            color: T.fgOnColor,
            fontSize: '14px',
            lineHeight: '20px',
            fontWeight: 500,
            padding: '10px 16px',
            borderRadius: T.radius,
            textDecoration: 'none',
        }}
    >
        {children}
    </Button>
);

export default EmailButton;
