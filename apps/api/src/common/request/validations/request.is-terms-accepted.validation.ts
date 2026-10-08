import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * The value must be exactly `true`: an explicit acceptance of the Terms of
 * Service and Privacy Policy. Reports the `isTermsAccepted` constraint,
 * translated from `request.isTermsAccepted`.
 */
export function IsTermsAccepted(
    validationOptions?: ValidationOptions
): PropertyDecorator {
    return function (object: object, propertyName: string | symbol): void {
        registerDecorator({
            name: 'isTermsAccepted',
            target: object.constructor,
            propertyName: propertyName as string,
            options: validationOptions,
            validator: {
                validate: (value: unknown): boolean => value === true,
            },
        });
    };
}
