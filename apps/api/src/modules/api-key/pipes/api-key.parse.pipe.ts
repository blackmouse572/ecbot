import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { DATABASE_AUDIT_POPULATE } from 'src/common/database/constants/database.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

@Injectable()
export class ApiKeyParsePipe implements PipeTransform {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    async transform(value: any): Promise<ApiKeyEntity> {
        // Only the admin routes parse a key from the path, and the detail page
        // shows who created and updated it.
        const apiKey: ApiKeyEntity = await this.apiKeyService.findOneById(
            value,
            { populate: DATABASE_AUDIT_POPULATE }
        );
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        }

        return apiKey;
    }
}
