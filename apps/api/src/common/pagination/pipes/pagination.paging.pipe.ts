import { Injectable, mixin, Type } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { PAGINATION_DEFAULT_PER_PAGE } from 'src/common/pagination/constants/pagination.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export function PaginationPagingPipe(
    defaultPerPage: number = PAGINATION_DEFAULT_PER_PAGE
): Type<PipeTransform> {
    @Injectable()
    class MixinPaginationPagingPipe implements PipeTransform {
        constructor(
            private readonly cls: ClsService,
            private readonly paginationService: PaginationService
        ) {}

        async transform(
            value: Record<string, any>
        ): Promise<Record<string, any>> {
            const page: number = this.paginationService.page(
                value?.page ? Number.parseInt(value?.page) : 1
            );
            const perPage: number = this.paginationService.perPage(
                Number.parseInt(value?.perPage ?? defaultPerPage)
            );
            const offset: number = this.paginationService.offset(page, perPage);

            this.addToRequestInstance(page, perPage);
            return {
                ...value,
                page,
                perPage,
                _limit: perPage,
                _offset: offset,
            };
        }

        addToRequestInstance(page: number, perPage: number): void {
            const request = this.cls.get<IRequestApp>(CLS_REQ);
            if (request) {
                request.__pagination = {
                    ...request.__pagination,
                    page,
                    perPage,
                };
            }
        }
    }

    return mixin(MixinPaginationPagingPipe);
}
