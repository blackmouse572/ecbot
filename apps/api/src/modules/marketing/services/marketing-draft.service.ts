import { ENUM_AI_USAGE_STATUS_CODE_ERROR } from '@app/app/enums/ai-usage.status-code.enum';
import { AiDecisionService } from '@app/modules/agent-builder/services/ai-decision.service';
import {
    HttpStatus,
    Inject,
    Injectable,
    Logger,
    Optional,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from 'src/app/ai-usage-meter.interface';
import { MARKETING_SEND_MAX_TEXT_LENGTH } from '../constants/marketing-send.constant';
import { MarketingSendDraftResponseDto } from '../dtos/response/marketing-send.draft.response.dto';
import { IMarketingDraftInput } from '../interfaces/marketing-draft.interface';
import { marketingDraftPrompt } from '../utils/marketing-draft-prompt.util';

/** "AI soạn giúp" (#506): drafts a send's text, metered as the shop's tokens. */
@Injectable()
export class MarketingDraftService {
    private readonly logger = new Logger(MarketingDraftService.name);

    constructor(
        private readonly ai: AiDecisionService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    async draft(
        workspaceId: string,
        shopName: string,
        input: IMarketingDraftInput
    ): Promise<MarketingSendDraftResponseDto> {
        // No meter is the public build: allowed, and nothing recorded below.
        const budget = (await this.meter?.check(workspaceId)) ?? {
            allowed: true,
        };
        if (!budget.allowed) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_AI_USAGE_STATUS_CODE_ERROR.QUOTA_EXHAUSTED,
                message: 'tokenUsage.error.quotaExhausted',
                errors: { reason: budget.reason },
            });
        }

        const { instructions, state } = marketingDraftPrompt(shopName, input);
        const written = await this.ai
            .write(instructions, state)
            .catch((err: unknown) => {
                this.logger.warn(`marketing draft failed: ${err}`);
                return null;
            });
        if (written?.usage) {
            await this.meter
                ?.record({
                    workspaceId,
                    usage: written.usage,
                    source: ENUM_AI_USAGE_SOURCE.MARKETING_DRAFT,
                    model: written.model,
                })
                .catch((err: unknown) =>
                    this.logger.warn(
                        `marketing draft usage not recorded: ${err}`
                    )
                );
        }

        const text = (written?.text ?? '')
            .replace(/\s*[—–]\s*/g, ', ')
            .trim()
            .slice(0, MARKETING_SEND_MAX_TEXT_LENGTH);
        if (!text) {
            throw new ServiceUnavailableException({
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                message: 'marketingSend.error.draftFailed',
            });
        }
        return plainToInstance(
            MarketingSendDraftResponseDto,
            { text },
            { excludeExtraneousValues: true }
        );
    }
}
