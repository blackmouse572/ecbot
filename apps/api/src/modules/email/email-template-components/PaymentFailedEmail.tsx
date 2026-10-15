import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { paymentFailedEmailCopy } from './payment-failed-email.copy';

interface PaymentFailedEmailProps {
    name: string;
    workspaceName: string;
    /** Already formatted for the reader's language. */
    graceEndsAt: string;
    billingUrl: string;
    reminder?: boolean;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/**
 * A renewal payment failed: say when the chatbots stop answering and how to
 * fix the payment. Also the reminder shortly before that date.
 */
const PaymentFailedEmail: React.FC<PaymentFailedEmailProps> = ({
    name,
    workspaceName,
    graceEndsAt,
    billingUrl,
    reminder = false,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = paymentFailedEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.impact(graceEndsAt)}
            heading={copy.heading(reminder)}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>
                {copy.intro(workspaceName, reminder)}
            </Text>
            <Text style={EMAIL_BODY}>{copy.impact(graceEndsAt)}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={billingUrl}>{copy.action}</EmailButton>
            </div>
            <Text style={EMAIL_MUTED}>{copy.recovery}</Text>
        </EmailLayout>
    );
};

export default PaymentFailedEmail;
