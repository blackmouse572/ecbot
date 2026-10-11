/**
 * Decoded payload of a Meta `signed_request`, as sent to the data deletion
 * and deauthorize callbacks. `user_id` is the app-scoped id of the person.
 */
export interface IFacebookSignedRequestPayload {
    algorithm: string;
    issued_at: number;
    user_id: string;
}
