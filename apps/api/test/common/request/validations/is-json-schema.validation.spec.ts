import { validate } from 'class-validator';
import { IsJsonSchema } from '@app/common/request/validations/is-json-schema.validation';

class TestDto {
    @IsJsonSchema()
    schema!: Record<string, unknown>;
}

describe('IsJsonSchema', () => {
    it('accepts a valid JSON Schema object', async () => {
        const dto = new TestDto();
        dto.schema = {
            type: 'object',
            properties: { name: { type: 'string' } },
        };
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
    });

    it('rejects a malformed schema', async () => {
        const dto = new TestDto();
        dto.schema = { type: 'not-a-real-type' };
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toHaveProperty('IsJsonSchema');
    });

    it('rejects non-object input', async () => {
        const dto = new TestDto();
        // @ts-expect-error testing runtime behavior
        dto.schema = 'not an object';
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
    });
});
