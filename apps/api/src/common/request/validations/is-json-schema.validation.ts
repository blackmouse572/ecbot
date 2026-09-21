import Ajv2020 from 'ajv/dist/2020';
import { registerDecorator, ValidationOptions } from 'class-validator';

const ajv = new Ajv2020({ strict: false });

export function IsJsonSchema(opts?: ValidationOptions) {
    return (object: object, propertyName: string): void => {
        registerDecorator({
            name: 'IsJsonSchema',
            target: object.constructor,
            propertyName,
            options: opts,
            validator: {
                validate(value: unknown): boolean {
                    if (
                        typeof value !== 'object' ||
                        value === null ||
                        Array.isArray(value)
                    ) {
                        return false;
                    }
                    try {
                        ajv.compile(value);
                        return true;
                    } catch {
                        return false;
                    }
                },
                defaultMessage: () =>
                    '$property must be a valid JSON Schema (draft 2020-12)',
            },
        });
    };
}
