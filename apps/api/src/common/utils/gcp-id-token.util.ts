import { GoogleAuth } from 'google-auth-library';

/**
 * Fetches a Google-signed ID token (audience = target Cloud Run URL) for
 * service-to-service calls to an internal-ingress Cloud Run service.
 * Fails open to {} outside GCP (no metadata server, e.g. local/docker-compose)
 * so local dev — where the target has no IAM check — is unaffected.
 */
export async function getInternalAuthHeader(
    audience: string
): Promise<Record<string, string>> {
    try {
        const auth = new GoogleAuth();
        const client = await auth.getIdTokenClient(audience);
        const headers = await client.getRequestHeaders();
        const authorization = headers['Authorization'];
        return authorization ? { Authorization: authorization } : {};
    } catch {
        return {};
    }
}
