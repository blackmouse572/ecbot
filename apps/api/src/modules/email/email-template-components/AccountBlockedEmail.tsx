import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { accountBlockedEmailCopy } from './account-blocked-email.copy';
import { EMAIL_BODY } from './email-text.styles';

interface AccountBlockedEmailProps {
    name: string;
    accountName: string;
    reconnectUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** A channel's token could not be refreshed: ask the owner to reconnect it. */
const AccountBlockedEmail: React.FC<AccountBlockedEmailProps> = ({
    name,
    accountName,
    reconnectUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = accountBlockedEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(accountName)}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>{copy.intro(accountName)}</Text>
            <Text style={EMAIL_BODY}>{copy.impact}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={reconnectUrl}>{copy.action}</EmailButton>
            </div>
        </EmailLayout>
    );
};

export default AccountBlockedEmail;
