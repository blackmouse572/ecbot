import { applyDecorators } from '@nestjs/common';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';
import { HealthDatabaseResponseDto } from 'src/modules/health/dtos/response/health.database.response.dto';

export function HealthPublicLiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'liveness probe — process is up, no dependencies checked (unauthenticated)',
        }),
        DocResponse<HealthDatabaseResponseDto>('health.live', {
            dto: HealthDatabaseResponseDto,
        })
    );
}

export function HealthPublicReadyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'readiness probe — database + Redis reachable, gates rolling deploys (unauthenticated)',
        }),
        DocResponse<HealthDatabaseResponseDto>('health.ready', {
            dto: HealthDatabaseResponseDto,
        })
    );
}
