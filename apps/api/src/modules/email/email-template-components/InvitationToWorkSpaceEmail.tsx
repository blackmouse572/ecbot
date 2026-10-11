import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { invitationEmailCopy } from './invitation-email.copy';

interface InvitationToWorkSpaceEmailProps {
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    invitationLink: string;
    workspaceName: string;
    inviterName: string;
    expiresAt?: string;
    language?: string;
}

/** Invites someone to a workspace, with the link behind a button. */
const InvitationToWorkSpaceEmail: React.FC<InvitationToWorkSpaceEmailProps> = ({
    supportEmail,
    homeUrl,
    homeName,
    invitationLink,
    workspaceName,
    inviterName,
    expiresAt,
    language,
}) => {
    const copy = invitationEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(inviterName, workspaceName)}
            heading={copy.heading(workspaceName)}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting}</Text>
            <Text style={EMAIL_BODY}>
                {copy.intro(inviterName, workspaceName)}
            </Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={invitationLink}>{copy.action}</EmailButton>
            </div>
            {expiresAt && (
                <Text style={EMAIL_MUTED}>{copy.expiry(expiresAt)}</Text>
            )}
            <Text style={EMAIL_MUTED}>{copy.ignore}</Text>
        </EmailLayout>
    );
};

export default InvitationToWorkSpaceEmail;
