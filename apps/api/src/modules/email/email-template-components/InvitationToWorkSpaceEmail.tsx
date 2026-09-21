import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface InvitationToWorkSpaceEmailProps {
    supportEmail: string;
    homeUrl: string;
    homeName: string;
    invitationLink: string;
}

const InvitationToWorkSpaceEmail: React.FC<InvitationToWorkSpaceEmailProps> = ({
    supportEmail,
    homeUrl,
    homeName,
    invitationLink,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hello,</p>
            <p>
                You’ve been invited to join a workspace on{' '}
                <strong>{homeName}</strong>.
            </p>
            <p>To get started, please click the invitation link below:</p>
            <p>
                <a href={invitationLink}>{invitationLink}</a>
            </p>
            <p>
                If you have any questions or didn’t expect this invitation, feel
                free to contact us at{' '}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>
            </p>
            <br />
            <p>— The {homeName} Team</p>
        </Body>
    </Html>
);

export default InvitationToWorkSpaceEmail;
