import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import React from 'react';
import { EMAIL_THEME as T } from './email-theme';

interface EmailLayoutProps {
    language?: string;
    /** The inbox preview line shown next to the subject. */
    preview: string;
    heading: string;
    homeUrl: string;
    homeName: string;
    supportEmail?: string;
    supportLabel: string;
    signOff: string;
    children: React.ReactNode;
}

/**
 * The frame every transactional email shares, in the app's design system:
 * subtle page, white bordered card, the app icon in its neutral chip (as on
 * the sign-in page), then a muted footer.
 */
const EmailLayout: React.FC<EmailLayoutProps> = ({
    language,
    preview,
    heading,
    homeUrl,
    homeName,
    supportEmail,
    supportLabel,
    signOff,
    children,
}) => {
    const home = homeUrl.replace(/\/+$/, '');

    return (
        <Html lang={language ?? 'en'}>
            <Head />
            <Preview>{preview}</Preview>
            <Body
                style={{
                    margin: 0,
                    padding: '32px 12px',
                    backgroundColor: T.bgSubtle,
                    fontFamily: T.fontSans,
                    color: T.fgSubtle,
                }}
            >
                <Container style={{ maxWidth: '480px', margin: '0 auto' }}>
                    <Section
                        style={{
                            backgroundColor: T.bgBase,
                            border: `1px solid ${T.borderBase}`,
                            borderRadius: '12px',
                            padding: '32px',
                        }}
                    >
                        <Img
                            src={`${home}/favicon/favicon-96x96.png`}
                            width="32"
                            height="32"
                            alt={homeName}
                            style={{
                                borderRadius: T.radius,
                                border: `1px solid ${T.borderBase}`,
                                marginBottom: '24px',
                            }}
                        />
                        <Text
                            style={{
                                margin: '0 0 8px',
                                fontSize: '18px',
                                lineHeight: '28px',
                                fontWeight: 600,
                                color: T.fgBase,
                            }}
                        >
                            {heading}
                        </Text>
                        {children}
                    </Section>
                    <Section style={{ padding: '20px 32px 0' }}>
                        <Text style={footer}>
                            <Link
                                href={home}
                                style={{ ...footer, textDecoration: 'none' }}
                            >
                                {signOff}
                            </Link>
                        </Text>
                        {supportEmail && (
                            <Text style={footer}>
                                {supportLabel}{' '}
                                <Link
                                    href={`mailto:${supportEmail}`}
                                    style={{
                                        color: T.fgMuted,
                                        textDecoration: 'underline',
                                    }}
                                >
                                    {supportEmail}
                                </Link>
                            </Text>
                        )}
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

const footer: React.CSSProperties = {
    margin: '0 0 4px',
    fontSize: '12px',
    lineHeight: '20px',
    color: T.fgMuted,
};

export default EmailLayout;
