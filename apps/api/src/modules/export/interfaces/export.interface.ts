// Section shapes of the personal data exports (GDPR Art 15 and 20). Kept as
// plain JSON so the file stays readable and portable.

export interface IExportUserProfile {
    id: string;
    name: string;
    username?: string;
    email: string;
    mobileNumber?: string;
    mobileNumberCountry?: string;
    gender?: string;
    avatar?: string;
    photo?: string;
    status: string;
    signUpDate: Date;
    signUpFrom: string;
    emailVerified?: boolean;
    mobileNumberVerified?: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

export interface IExportUserWorkspace {
    workspaceId: string;
    workspaceName?: string;
    roleName?: string;
    roleType?: string;
    joinedAt: Date;
    isActive: boolean;
}

export interface IExportUserSession {
    id: string;
    ip: string;
    userAgent?: string;
    country?: string;
    status: string;
    createdAt: Date;
    lastActiveAt?: Date;
    expiredAt: Date;
    revokeAt?: Date;
}

export interface IExportUserActivity {
    id: string;
    action: string;
    subject: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface IExportCustomer {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    language?: string;
    metadata?: Record<string, unknown>;
    profileSummary?: string;
    notes?: string;
    mergedIntoCustomerId?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface IExportContactPoint {
    id: string;
    customerId?: string;
    platform: string;
    externalSenderId: string;
    displaySenderName?: string;
    senderAvatar?: string;
    createdAt: Date;
}

export interface IExportMessage {
    id: string;
    direction: string;
    authorType: string;
    text?: string;
    attachments?: IExportAttachment[];
    reactions?: unknown[];
    /** Platform webhook payload as received; part of the stored data. */
    raw?: unknown;
    dateSent: Date;
}

export interface IExportConversation {
    id: string;
    contactPointId?: string;
    senderName?: string;
    senderAvatar?: string;
    status: string;
    createdAt: Date;
    lastMessageAt?: Date;
    messages: IExportMessage[];
}

/** A file sent in a chat: stored ones by file name, never by storage key. */
export interface IExportAttachment {
    type: string;
    description?: string;
    /** File name of a copy Ecbot stored. */
    file?: string;
    /** Platform url of a file Ecbot did not store. */
    url?: string;
}

export interface IExportCustomerTag {
    customerId?: string;
    name?: string;
    assignedAt: Date;
}

export interface IExportFollowup {
    id: string;
    conversationId?: string;
    prompt: string;
    reason: string;
    status: string;
    scheduledAt: Date;
    firedAt?: Date;
    cancelledAt?: Date;
}

export interface IExportToolInvocation {
    id: string;
    conversationId?: string;
    actionName?: string;
    status: string;
    inputArgs: Record<string, unknown>;
    outputResult?: unknown;
    errorMessage?: string;
    createdAt: Date;
}
