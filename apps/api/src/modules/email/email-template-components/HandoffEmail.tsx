import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { handoffEmailCopy } from './handoff-email.copy';

interface HandoffEmailProps {
    chatbotName: string;
    workspaceName: string;
    reason: string;
    conversationUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** A conversation was handed to a person: tell the team and link to it. */
const HandoffEmail: React.FC<HandoffEmailProps> = ({
    chatbotName,
    workspaceName,
    reason,
    conversationUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = handoffEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.reason(reason)}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.intro(chatbotName)}</Text>
            <Text style={{ ...EMAIL_BODY, fontWeight: 500 }}>
                {copy.reason(reason)}
            </Text>
            <Text style={EMAIL_BODY}>{copy.paused}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={conversationUrl}>{copy.action}</EmailButton>
            </div>
            <Text style={EMAIL_MUTED}>{copy.why(workspaceName)}</Text>
        </EmailLayout>
    );
};

export default HandoffEmail;
