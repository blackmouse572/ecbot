import { ArgumentMetadata, Injectable, ValidationPipe } from '@nestjs/common';
import { REQUEST_VALIDATION_PIPE_OPTIONS } from 'src/common/request/constants/request.constant';

/**
 * The global pipe. Bodies reject undeclared keys; query strings only strip
 * them, because a list query carries filter keys that separate
 * `@Query('field')` params read and the whole-query DTO cannot declare.
 */
@Injectable()
export class RequestValidationPipe extends ValidationPipe {
    private readonly queryPipe = new ValidationPipe({
        ...REQUEST_VALIDATION_PIPE_OPTIONS,
        forbidNonWhitelisted: false,
    });

    constructor() {
        super(REQUEST_VALIDATION_PIPE_OPTIONS);
    }

    async transform(value: unknown, metadata: ArgumentMetadata) {
        return metadata.type === 'query'
            ? this.queryPipe.transform(value, metadata)
            : super.transform(value, metadata);
    }
}
