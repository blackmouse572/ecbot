import { CustomerTagCreateRequestDto } from '../../../src/modules/customer/dtos/request/customer-tag.create.request.dto';
import { CustomerTagUpdateRequestDto } from '../../../src/modules/customer/dtos/request/customer-tag.update.request.dto';
import { CustomerUpdateRequestDto } from '../../../src/modules/customer/dtos/request/customer.update.request.dto';

// @repo/client is generated from these docs. A `string | null` property
// documented without a type comes out as an object there, so a client
// sending the string the API validates for fails to typecheck.
describe('customer request DTO docs', () => {
    it.each([
        [CustomerUpdateRequestDto, 'name'],
        [CustomerUpdateRequestDto, 'phone'],
        [CustomerUpdateRequestDto, 'email'],
        [CustomerUpdateRequestDto, 'language'],
        [CustomerUpdateRequestDto, 'notes'],
        [CustomerUpdateRequestDto, 'profileSummary'],
        [CustomerTagCreateRequestDto, 'emoji'],
        [CustomerTagCreateRequestDto, 'description'],
        [CustomerTagUpdateRequestDto, 'emoji'],
        [CustomerTagUpdateRequestDto, 'description'],
    ] as const)('%p.%s is documented as a nullable string', (dto, property) => {
        expect(
            Reflect.getMetadata(
                'swagger/apiModelProperties', // @nestjs/swagger DECORATORS.API_MODEL_PROPERTIES
                dto.prototype,
                property
            )
        ).toMatchObject({ type: String, nullable: true });
    });
});
