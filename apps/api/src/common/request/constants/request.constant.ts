import { HttpStatus, ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';

export const REQUEST_CUSTOM_TIMEOUT_META_KEY = 'RequestCustomTimeoutMetaKey';
export const REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY =
    'RequestCustomTimeoutValueMetaKey';

export const REQUEST_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
    transform: true,
    // Mass assignment: a body key no DTO declares never reaches an entity,
    // and the request fails with 422 so the client sees its mistake.
    whitelist: true,
    forbidNonWhitelisted: true,
    skipUndefinedProperties: true,
    forbidUnknownValues: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    exceptionFactory: async (errors: ValidationError[]) =>
        new RequestValidationException(errors),
};
