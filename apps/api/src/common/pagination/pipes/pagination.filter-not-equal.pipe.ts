import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { IPaginationFilterEqualOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterNotEqualPipe(
    field: string,
    options?: IPaginationFilterEqualOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterEqualPipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly databaseService: DatabaseService
        ) {}

        async transform(value: string): Promise<any> {
            if (!value) {
                return;
            }

            if (options?.raw) {
                this.addToRequestInstance(value);
                return {
                    [field]: value,
                };
            }

            const finalValue: string | number = options?.isNumber
                ? Number.parseInt(value)
                : value.trim();

            this.addToRequestInstance(finalValue);
            return this.databaseService.filterNotEqual(field, finalValue);
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

    return mixin(MixinPaginationFilterEqualPipe);
}
