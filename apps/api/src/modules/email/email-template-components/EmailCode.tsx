import { Text } from '@react-email/components';
import React from 'react';
import { EMAIL_THEME as T } from './email-theme';

/** A one-time code in a neutral box, spaced so each digit is easy to read. */
const EmailCode: React.FC<{ code: string }> = ({ code }) => (
    <Text
        style={{
            margin: '16px 0',
            padding: '14px 0',
            textAlign: 'center',
            backgroundColor: T.bgComponent,
            border: `1px solid ${T.borderBase}`,
            borderRadius: T.radius,
            fontFamily: T.fontMono,
            fontSize: '28px',
            lineHeight: '36px',
            fontWeight: 600,
            letterSpacing: '8px',
            color: T.fgBase,
        }}
    >
        {code}
    </Text>
);

export default EmailCode;
