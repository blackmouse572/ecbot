import { ValidationPipe } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { REQUEST_VALIDATION_PIPE_OPTIONS } from '@app/common/request/request.module';

class SampleRequestDto {
    @IsString()
    declared: string;

    @IsString()
    @IsOptional()
    optional?: string;
}

describe('Global ValidationPipe - whitelist (S-8)', () => {
    const pipe = new ValidationPipe(REQUEST_VALIDATION_PIPE_OPTIONS);

    const metadata = {
        type: 'body' as const,
        metatype: SampleRequestDto,
        data: '',
    };

    it('strips body keys the DTO does not declare', async () => {
        const result = await pipe.transform(
            { declared: 'x', extra: 1 },
            metadata
        );

        expect(result).toBeInstanceOf(SampleRequestDto);
        expect(result.declared).toBe('x');
        expect(result).not.toHaveProperty('extra');
    });

    it('keeps declared keys, including optional ones', async () => {
        const result = await pipe.transform(
            { declared: 'x', optional: 'y', extra: 'z' },
            metadata
        );

        expect(result.declared).toBe('x');
        expect(result.optional).toBe('y');
        expect(result).not.toHaveProperty('extra');
    });

    // Ruling for this plan: stripping, not rejecting. The SPA and admin build
    // PATCH bodies by spreading fetched objects, so `forbidNonWhitelisted`
    // would turn every stray field into a 422.
    it('does not reject a body that carries undeclared keys', async () => {
        await expect(
            pipe.transform({ declared: 'x', extra: 1 }, metadata)
        ).resolves.toBeDefined();
    });
});
