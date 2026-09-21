import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { IPaginationFilterOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterInBooleanPipe(
    field: string,
    defaultValue: boolean[],
    options?: IPaginationFilterOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterInBooleanPipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly databaseService: DatabaseService,
            private readonly helperArrayService: HelperArrayService
        ) {}

        async transform(value: string): Promise<any> {
            if (options?.raw) {
                this.addToRequestInstance(value);
                return {
                    [field]: value,
                };
            }

            const finalValue: boolean[] = value
                ? this.helperArrayService.unique(
                      value.split(',').map((val: string) => val === 'true')
                  )
                : defaultValue;

            this.addToRequestInstance(finalValue);
            return this.databaseService.filterIn<boolean>(field, finalValue);
        }

        addToRequestInstance(value: any): void {
            const request = this.cls.get<IRequestApp>(CLS_REQ);
            if (request) {
                request.__pagination = {
                    ...request.__pagination,
                    filters: request.__pagination?.filters
                        ? { ...request.__pagination.filters, [field]: value }
                        : { [field]: value },
                };
            }
        }
    }

    return mixin(MixinPaginationFilterInBooleanPipe);
}
