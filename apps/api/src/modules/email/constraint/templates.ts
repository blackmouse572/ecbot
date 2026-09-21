import { EmailSubject } from '../enum/email-subject.enum';

/**
 * Renders the React Email template for a subject.
 *
 * The templates and `@react-email/*` add ~1.4MB of JS that only matters when an
 * email is actually sent, so the whole barrel is imported here rather than at
 * module load.
 */
export async function renderTemplate<P extends object>(
    subject: EmailSubject,
    props: P
): Promise<string> {
    const {
        renderEmail,
        AccountBannedEmail,
        AccountBlockedEmail,
        ChangePasswordEmail,
        CreateEmail,
        InvitationToWorkSpaceEmail,
        LowTokenBalanceEmail,
        MobileNumberVerificationEmail,
        ResetPasswordEmail,
        VerificationEmail,
        WelcomeEmail,
    } = await import('@app/modules/email/email-template-components');

    const templates: {
        [key in EmailSubject]?: (
            props: unknown
        ) => React.ReactNode | Promise<React.ReactNode>;
    } = {
        [EmailSubject.ChangePassword]: ChangePasswordEmail,
        [EmailSubject.Welcome]: WelcomeEmail,
        [EmailSubject.CreateAccount]: CreateEmail,
        [EmailSubject.ResetPassword]: ResetPasswordEmail,
        [EmailSubject.EmailVerification]: VerificationEmail,
        [EmailSubject.EmailVerified]: VerificationEmail,
        [EmailSubject.MobileNumberVerified]: MobileNumberVerificationEmail,
        [EmailSubject.InviteToWorkSpace]: InvitationToWorkSpaceEmail,
        [EmailSubject.AccountBlocked]: AccountBlockedEmail,
        [EmailSubject.AccountBanned]: AccountBannedEmail,
        [EmailSubject.LowTokenBalance]: LowTokenBalanceEmail,
    };

    return renderEmail(templates[subject], props);
}
