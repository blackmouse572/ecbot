import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { DatabaseService } from 'src/common/database/services/database.service';
import { IPaginationFilterOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationFilterStringContainPipe(
    field: string,
    options?: IPaginationFilterOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationFilterContainPipe implements PipeTransform {
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

            value = value.trim();

            this.addToRequestInstance(value);
            return this.databaseService.filterContain(field, value);
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

    return mixin(MixinPaginationFilterContainPipe);
}
