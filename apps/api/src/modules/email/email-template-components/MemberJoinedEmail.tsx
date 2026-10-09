import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { memberJoinedEmailCopy } from './member-joined-email.copy';

interface MemberJoinedEmailProps {
    name: string;
    memberName: string;
    memberEmail: string;
    workspaceName: string;
    membersUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** Tells a workspace owner that someone joined their workspace. */
const MemberJoinedEmail: React.FC<MemberJoinedEmailProps> = ({
    name,
    memberName,
    memberEmail,
    workspaceName,
    membersUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = memberJoinedEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(memberName, workspaceName)}
            heading={copy.heading(workspaceName)}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>
                {copy.intro(memberName, workspaceName)}
                <br />
                <span style={EMAIL_MUTED}>{memberEmail}</span>
            </Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={membersUrl}>{copy.action}</EmailButton>
            </div>
            <Text style={EMAIL_MUTED}>{copy.why(workspaceName)}</Text>
        </EmailLayout>
    );
};

export default MemberJoinedEmail;
