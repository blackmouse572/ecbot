import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailCode from './EmailCode';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import {
    adminPasswordEmailCopy,
    type AdminPasswordEmailKind,
} from './admin-password-email.copy';

export interface CreateEmailProps {
    name: string;
    password: string;
    passwordExpiredAt: string;
    loginUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
    kind?: AdminPasswordEmailKind;
}

// A temporary password set by an admin, for a new account or after a reset.
const CreateEmail: React.FC<CreateEmailProps> = ({
    name,
    password,
    passwordExpiredAt,
    loginUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
    kind = 'create',
}) => {
    const copy = adminPasswordEmailCopy(kind, language, homeName);

    return (
        <EmailLayout
            language={language}
            // Never the password: the preview shows on lock screens.
            preview={copy.intro}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>{copy.intro}</Text>
            <EmailCode code={password} />
            {passwordExpiredAt && (
                <Text style={EMAIL_BODY}>
                    {copy.expires(passwordExpiredAt)}
                </Text>
            )}
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={loginUrl}>{copy.action}</EmailButton>
            </div>
            {copy.verifyNote && (
                <Text style={EMAIL_MUTED}>{copy.verifyNote}</Text>
            )}
        </EmailLayout>
    );
};

export default CreateEmail;
