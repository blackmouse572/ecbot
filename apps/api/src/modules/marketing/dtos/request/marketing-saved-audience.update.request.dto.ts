import { PartialType } from '@nestjs/swagger';
import { MarketingSavedAudienceCreateRequestDto } from './marketing-saved-audience.create.request.dto';

/** A preset or conditions replace the whole definition; a name alone renames. */
export class MarketingSavedAudienceUpdateRequestDto extends PartialType(
    MarketingSavedAudienceCreateRequestDto
) {}
