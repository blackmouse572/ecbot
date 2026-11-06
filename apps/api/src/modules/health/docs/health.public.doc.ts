import { applyDecorators } from '@nestjs/common';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';
import { HealthDatabaseResponseDto } from 'src/modules/health/dtos/response/health.database.response.dto';
import { HealthBuildInfoResponseDto } from 'src/modules/health/dtos/response/health.build-info.response.dto';

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

export function HealthPublicBuildInfoDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'build info, the git commit, branch and build time of the running image (unauthenticated)',
        }),
        DocResponse<HealthBuildInfoResponseDto>('health.buildInfo', {
            dto: HealthBuildInfoResponseDto,
        })
    );
}
