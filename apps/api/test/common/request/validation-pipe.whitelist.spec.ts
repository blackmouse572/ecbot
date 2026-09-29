import { ArgumentMetadata, HttpStatus } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { RequestValidationException } from '@app/common/request/exceptions/request.validation.exception';
import { RequestValidationPipe } from '@app/common/request/pipes/request.validation.pipe';

class SampleRequestDto {
    @IsString()
    declared: string;

    @IsString()
    @IsOptional()
    optional?: string;
}

const as = (
    type: ArgumentMetadata['type'],
    metatype: ArgumentMetadata['metatype'] = SampleRequestDto
): ArgumentMetadata => ({ type, metatype, data: undefined });

describe('Global RequestValidationPipe - whitelist', () => {
    const pipe = new RequestValidationPipe();

    describe('body', () => {
        it('rejects a key the DTO does not declare with 422', async () => {
            const error = await pipe
                .transform({ declared: 'x', extra: 1 }, as('body'))
                .catch((e: unknown) => e);

            expect(error).toBeInstanceOf(RequestValidationException);
            expect((error as RequestValidationException).httpStatus).toBe(
                HttpStatus.UNPROCESSABLE_ENTITY
            );
            expect(
                (error as RequestValidationException).errors.map(
                    e => e.property
                )
            ).toEqual(['extra']);
        });

        it('accepts declared keys, including optional ones', async () => {
            const result = await pipe.transform(
                { declared: 'x', optional: 'y' },
                as('body')
            );

            expect(result).toBeInstanceOf(SampleRequestDto);
            expect(result).toMatchObject({ declared: 'x', optional: 'y' });
        });
    });

    // A list query carries filter keys that separate @Query('field') params
    // read, so the whole-query DTO cannot declare them all: strip, not 422.
    describe('query', () => {
        it('strips a key the DTO does not declare', async () => {
            const result = await pipe.transform(
                { declared: 'x', status: 'active' },
                as('query')
            );

            expect(result.declared).toBe('x');
            expect(result).not.toHaveProperty('status');
        });

        it('keeps search for the pagination pipes', async () => {
            const result = await pipe.transform(
                { search: 'lotus', page: '2', status: 'active' },
                as('query', PaginationListDto)
            );

            expect(result).toMatchObject({ search: 'lotus', page: '2' });
            expect(result).not.toHaveProperty('status');
        });

        it('never takes the internal pagination keys from the client', async () => {
            const result = await pipe.transform(
                { _search: { id: 'x' }, _limit: 1000 },
                as('query', PaginationListDto)
            );

            expect(result).not.toHaveProperty('_search');
            expect(result).not.toHaveProperty('_limit');
        });
    });
});
