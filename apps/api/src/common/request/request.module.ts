import {
    DynamicModule,
    HttpStatus,
    Module,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from 'src/common/request/exceptions/request.validation.exception';
import { RequestTimeoutInterceptor } from 'src/common/request/interceptors/request.timeout.interceptor';
import { IsCustomEmailConstraint } from 'src/common/request/validations/request.custom-email.validation';
import {
    DateGreaterThanConstraint,
    DateGreaterThanEqualConstraint,
} from 'src/common/request/validations/request.date-greater-than.validation';
import {
    DateLessThanConstraint,
    DateLessThanEqualConstraint,
} from 'src/common/request/validations/request.date-less-than.validation';
import {
    GreaterThanEqualOtherPropertyConstraint,
    GreaterThanOtherPropertyConstraint,
} from 'src/common/request/validations/request.greater-than-other-property.validation';
import { IsPasswordConstraint } from 'src/common/request/validations/request.is-password.validation';
import {
    LessThanEqualOtherPropertyConstraint,
    LessThanOtherPropertyConstraint,
} from 'src/common/request/validations/request.less-than-other-property.validation';

export const REQUEST_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
    transform: true,
    // Mass assignment: drop body keys no DTO declares before they can reach
    // an entity. Stripping, not rejecting — clients build PATCH bodies by
    // spreading fetched objects.
    whitelist: true,
    skipUndefinedProperties: true,
    forbidUnknownValues: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    exceptionFactory: async (errors: ValidationError[]) =>
        new RequestValidationException(errors),
};

@Module({})
export class RequestModule {
    static forRoot(): DynamicModule {
        return {
            module: RequestModule,
            controllers: [],
            providers: [
                {
                    provide: APP_INTERCEPTOR,
                    useClass: RequestTimeoutInterceptor,
                },
                {
                    provide: APP_PIPE,
                    useFactory: () =>
                        new ValidationPipe(REQUEST_VALIDATION_PIPE_OPTIONS),
                },
                DateGreaterThanEqualConstraint,
                DateGreaterThanConstraint,
                DateLessThanEqualConstraint,
                DateLessThanConstraint,
                GreaterThanEqualOtherPropertyConstraint,
                GreaterThanOtherPropertyConstraint,
                IsPasswordConstraint,
                IsCustomEmailConstraint,
                LessThanEqualOtherPropertyConstraint,
                LessThanOtherPropertyConstraint,
            ],
            imports: [],
        };
    }
}
