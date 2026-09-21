import { Injectable, mixin, Type } from '@nestjs/common';
import set from 'lodash/set';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { IPaginationFilterOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterContainInArrayPipe(
    field: string,
    defaultValue?: string[],
    options?: IPaginationFilterOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterContainInArrayPipe implements PipeTransform {
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

            const finalValue: string[] = value
                ? value.split(',').filter(v => v.trim())
                : (defaultValue ?? []);

            if (!finalValue || finalValue.length === 0) {
                return;
            }

            let fieldPath = field;
            let setFieldPath = field;
            if (field.includes('.')) {
                fieldPath = field.split('.').at(-1) as string;
                setFieldPath = field.split('.').slice(0, -1).join('.');
            } else {
                return this.databaseService.filterContainInArray(
                    field,
                    finalValue
                );
            }
            const filter = this.databaseService.filterContainInArray(
                fieldPath,
                finalValue
            );

            return set({}, setFieldPath, filter);
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

    return mixin(MixinPaginationFilterContainInArrayPipe);
}
