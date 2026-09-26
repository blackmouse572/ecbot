import { ConfigService } from '@nestjs/config';

/**
 * Shared-secret header sent on every apps/api -> apps/ai HTTP call, checked by
 * apps/ai's `require_internal_token` dependency. Distinct from the GCP ID
 * token in `gcp-id-token.util` (Cloud Run IAM) — both are sent together where
 * apps/ai runs behind Cloud Run.
 */
export function getInternalTokenHeader(
    configService: ConfigService
): Record<string, string> {
    return {
        'X-Internal-Token': configService.get<string>('ai.internalToken') ?? '',
    };
}
