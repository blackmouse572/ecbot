import { Injectable, BadRequestException, PipeTransform } from '@nestjs/common';

@Injectable()
export class RequestRequiredPipe implements PipeTransform {
    async transform(value: string): Promise<string> {
        if (!value) {
            throw new BadRequestException();
        }

        return value;
    }
}
