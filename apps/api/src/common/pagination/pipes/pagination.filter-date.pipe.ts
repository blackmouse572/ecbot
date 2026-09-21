import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IPaginationFilterDateOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

type DateComparisonOperator = {
    $gte?: string;
    $lte?: string;
    $lt?: string;
    $gt?: string;
};

export function PaginationFilterDatePipe(
    field: string,
    options?: IPaginationFilterDateOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterDatePipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly databaseService: DatabaseService,
            private readonly helperDateService: HelperDateService
        ) {}

        async transform(value): Promise<any> {
            if (!value) {
                return;
            }
            let dateComparison: DateComparisonOperator;
            try {
                const decodedValue = decodeURIComponent(value);
                dateComparison = JSON.parse(decodedValue);

                if (options?.raw) {
                    this.addToRequestInstance(dateComparison);
                    return {
                        [field]: dateComparison,
                    };
                }
            } catch (_error) {
                try {
                    dateComparison = JSON.parse(value);
                } catch (_innerError) {
                    console.warn(
                        `Failed to parse date comparison for field ${field}:`,
                        value
                    );
                    return;
                }
            }

            const operations: Record<string, Date> = {};

            for (const [operator, dateString] of Object.entries(
                dateComparison
            )) {
                if (dateString && typeof dateString === 'string') {
                    try {
                        let processedDate: Date;

                        if (operator === '$gte' || operator === '$gt') {
                            processedDate =
                                this.helperDateService.createFromIso(
                                    dateString,
                                    { dayOf: ENUM_HELPER_DATE_DAY_OF.START }
                                );
                        } else if (operator === '$lte' || operator === '$lt') {
                            processedDate =
                                this.helperDateService.createFromIso(
                                    dateString,
                                    { dayOf: ENUM_HELPER_DATE_DAY_OF.END }
                                );
                        } else {
                            processedDate =
                                this.helperDateService.createFromIso(
                                    dateString
                                );
                        }

                        operations[operator] = processedDate;
                    } catch (_dateError) {
                        console.warn(
                            `Failed to parse date for operator ${operator}:`,
                            dateString
                        );
                    }
                }
            }

            if (Object.keys(operations).length === 0) {
                return;
            }

            this.addToRequestInstance(operations);
            return this.databaseService.filterDateComparison(field, operations);
        }

        addToRequestInstance(operations: any): void {
            const request = this.cls.get<IRequestApp>(CLS_REQ);
            if (!request) return;
            const queryField = options?.queryField ?? field;

            const filters: Record<string, any> = {};
            for (const [operator, date] of Object.entries(operations)) {
                filters[`${queryField}_${operator}`] = date;
            }

            request.__pagination = {
                ...request.__pagination,
                filters: request.__pagination?.filters
                    ? { ...request.__pagination.filters, ...filters }
                    : filters,
            };
        }
    }

    return mixin(MixinPaginationFilterDatePipe);
}
