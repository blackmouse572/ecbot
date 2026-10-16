export interface IHelperEgressService {
    /**
     * Drop-in replacement for global `fetch` that blocks requests to
     * loopback, private-network, link-local, and cloud-metadata addresses —
     * including after a redirect and against DNS rebinding. The body is
     * capped at `maxBytes` (the configured default when unset).
     */
    fetch(
        url: string | URL,
        init?: RequestInit,
        options?: { maxBytes?: number }
    ): Promise<Response>;
}
