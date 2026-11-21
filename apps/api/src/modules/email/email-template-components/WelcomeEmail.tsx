import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { welcomeEmailCopy } from './welcome-email.copy';

interface WelcomeEmailProps {
    name: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** Sent right after sign-up: leads the new user to connect a chat channel. */
const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
    name,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = welcomeEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.preview}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>{copy.intro}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={homeUrl}>{copy.action}</EmailButton>
            </div>
            <Text style={EMAIL_MUTED}>{copy.help}</Text>
        </EmailLayout>
    );
};

export default WelcomeEmail;
