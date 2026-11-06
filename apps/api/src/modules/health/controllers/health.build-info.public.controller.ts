import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { HealthPublicBuildInfoDoc } from 'src/modules/health/docs/health.public.doc';
import { HealthBuildInfoResponseDto } from 'src/modules/health/dtos/response/health.build-info.response.dto';

const UNKNOWN = 'unknown';

/**
 * Which build is live: the commit, branch and build time the deploy baked
 * into the image (GIT_COMMIT_SHA, GIT_BRANCH, BUILT_AT). Unauthenticated and
 * never cached, so a client or uptime checker can confirm a rollout landed.
 * Reads config only, no dependency checks.
 */
@ApiTags('modules.public.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/build-info',
})
export class HealthBuildInfoPublicController {
    constructor(private readonly configService: ConfigService) {}

    @HealthPublicBuildInfoDoc()
    @Response('health.buildInfo')
    @SkipThrottle()
    @Header('Cache-Control', 'no-store')
    @Get('/')
    async buildInfo(): Promise<IResponse<HealthBuildInfoResponseDto>> {
        const read = (key: string): string =>
            this.configService.get<string>(`app.build.${key}`) || UNKNOWN;

        return {
            data: {
                commit: read('commit'),
                branch: read('branch'),
                builtAt: read('builtAt'),
            },
        };
    }
}
