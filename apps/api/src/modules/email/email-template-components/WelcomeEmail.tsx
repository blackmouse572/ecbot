import * as React from 'react';
import { Html, Head, Body, Text } from '@react-email/components';

interface WelcomeEmailProps {
    name: string;
    email: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
    name,
    email,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <Text>Welcome {name},</Text>
            <br />
            <Text>Sign up success with email {email}.</Text>
            <p>Support Email: {supportEmail}.</p>
            <p>Visit us: {homeUrl}.</p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default WelcomeEmail;
