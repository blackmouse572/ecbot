import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface LowTokenBalanceEmailProps {
    name: string;
    workspaceName: string;
    usedPercent: number;
    periodEnd: string;
    usageUrl: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const LowTokenBalanceEmail: React.FC<LowTokenBalanceEmailProps> = ({
    name,
    workspaceName,
    usedPercent,
    periodEnd,
    usageUrl,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi {name},</p>
            <br />
            <p>
                Workspace <strong>{workspaceName}</strong> has used{' '}
                <strong>{usedPercent}%</strong> of its token quota for the
                current period, which renews on {periodEnd}.
            </p>
            <p>
                When the quota runs out your chatbots stop replying, so top up
                or upgrade before then.
            </p>
            <p>
                Check usage here: <a href={usageUrl}>{usageUrl}</a>
            </p>
            <p>
                Support Email:{' '}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default LowTokenBalanceEmail;
