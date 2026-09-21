import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IPaginationFilterDateBetweenOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterDateBetweenPipe(
    fieldStart: string,
    fieldEnd: string,
    options?: IPaginationFilterDateBetweenOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly databaseService: DatabaseService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(): Promise<any> {
            const finalFieldStart = options?.queryFieldStart ?? fieldStart;
            const finalFieldEnd = options?.queryFieldEnd ?? fieldEnd;
            const request = this.cls.get<IRequestApp>(CLS_REQ);
            const body = request?.body ?? {};

            if (!body[finalFieldStart] || !body[finalFieldEnd]) {
                return;
            }

            const finalStartValue: Date = this.helperDateService.createFromIso(
                body[finalFieldStart],
                {
                    dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                }
            );
            const finalEndValue: Date = this.helperDateService.createFromIso(
                body[finalFieldEnd],
                { dayOf: ENUM_HELPER_DATE_DAY_OF.END }
            );

            this.addToRequestInstance(request, finalStartValue, finalEndValue);
            return this.databaseService.filterDateBetween(
                fieldStart,
                fieldEnd,
                finalStartValue,
                finalEndValue
            );
        }

        addToRequestInstance(
            request: IRequestApp | undefined,
            startValue: Date,
            endValue: Date
        ): void {
            if (!request) return;
            const finalFieldStart = options?.queryFieldStart ?? fieldStart;
            const finalFieldEnd = options?.queryFieldEnd ?? fieldEnd;

            request.__pagination = {
                ...request.__pagination,
                filters: request.__pagination?.filters
                    ? {
                          ...request.__pagination.filters,
                          [finalFieldStart]: startValue,
                          [finalFieldEnd]: endValue,
                      }
                    : {
                          [finalFieldStart]: startValue,
                          [finalFieldEnd]: endValue,
                      },
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
