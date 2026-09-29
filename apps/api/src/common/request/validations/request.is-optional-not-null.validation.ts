import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Like `@IsOptional()`, but only for a missing value: `null` still runs the
 * other validators and fails them. Use it on a field whose column is NOT NULL
 * with a default, so a client can leave it out but cannot clear it.
 */
export function IsOptionalNotNull(
    validationOptions?: ValidationOptions
): PropertyDecorator {
    return ValidateIf((_, value) => value !== undefined, validationOptions);
}
