import { Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY } from './email-text.styles';
import { lowTokenBalanceEmailCopy } from './low-token-balance-email.copy';

interface LowTokenBalanceEmailProps {
    name: string;
    workspaceName: string;
    usedPercent: number;
    /** Already formatted for the reader's language. */
    periodEnd: string;
    usageUrl: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** The period quota is mostly spent: say when it renews and where to top up. */
const LowTokenBalanceEmail: React.FC<LowTokenBalanceEmailProps> = ({
    name,
    workspaceName,
    usedPercent,
    periodEnd,
    usageUrl,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = lowTokenBalanceEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(workspaceName, usedPercent)}
            heading={copy.heading(usedPercent)}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>
                {copy.intro(workspaceName, usedPercent)}
            </Text>
            <Text style={EMAIL_BODY}>{copy.impact(periodEnd)}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={usageUrl}>{copy.action}</EmailButton>
            </div>
        </EmailLayout>
    );
};

export default LowTokenBalanceEmail;
