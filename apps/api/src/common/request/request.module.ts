import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RequestValidationPipe } from 'src/common/request/pipes/request.validation.pipe';
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
                    useClass: RequestValidationPipe,
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
