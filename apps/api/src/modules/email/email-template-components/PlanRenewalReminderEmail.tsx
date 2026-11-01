import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { planRenewalReminderEmailCopy } from './plan-renewal-reminder-email.copy';

interface PlanRenewalReminderEmailProps {
    name: string;
    workspaceName: string;
    planName: string;
    /** Already formatted for the reader's language. */
    periodEnd: string;
    billingUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/**
 * A plan paid one period at a time (bank transfer) is about to end: say when,
 * what happens after, and link to where the next period is paid.
 */
const PlanRenewalReminderEmail: React.FC<PlanRenewalReminderEmailProps> = ({
    name,
    workspaceName,
    planName,
    periodEnd,
    billingUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = planRenewalReminderEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(planName, workspaceName, periodEnd).join('')}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>
                {copy.intro(
                    <strong key="plan">{planName}</strong>,
                    <strong key="workspace">{workspaceName}</strong>,
                    <strong key="end">{periodEnd}</strong>
                )}
            </Text>
            <Text style={EMAIL_BODY}>{copy.impact}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={billingUrl}>{copy.action}</EmailButton>
            </div>
            <Text style={EMAIL_MUTED}>{copy.howToPay}</Text>
        </EmailLayout>
    );
};

export default PlanRenewalReminderEmail;
