import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class RequestEmailPipe implements PipeTransform {
    transform(value: any, _: ArgumentMetadata) {
        if (
            value &&
            typeof value === 'object' &&
            typeof value.email === 'string'
        ) {
            return {
                ...value,
                email: value.email.trim().toLowerCase(),
            };
        }
        return value;
    }
}
