import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationSearchPipe(
    availableSearch: string[] = []
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationSearchPipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            if (availableSearch.length === 0 || !value?.search) {
                this.addToRequestInstance(value?.search, availableSearch);
                return value;
            }

            const search: Record<string, any> = this.paginationService.search(
                value?.search,
                availableSearch
            );

            this.addToRequestInstance(value?.search, availableSearch);
            return {
                ...value,
                _search: search,
                _availableSearch: availableSearch,
            };
        }

        addToRequestInstance(search: string, availableSearch: string[]): void {
            const request = this.cls.get<IRequestApp>(CLS_REQ);
            if (request) {
                request.__pagination = {
                    ...request.__pagination,
                    search,
                    availableSearch,
                };
            }
        }
    }

    return mixin(MixinPaginationSearchPipe);
}
