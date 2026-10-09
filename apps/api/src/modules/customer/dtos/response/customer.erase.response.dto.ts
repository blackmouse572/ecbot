import { ApiProperty } from '@nestjs/swagger';
import { ICustomerErasureSummary } from '../../interfaces/customer-erasure.interface';

/** What an erasure removed, as counts only. */
export class CustomerEraseResponseDto implements ICustomerErasureSummary {
    @ApiProperty({
        description: 'The customer plus every profile merged into it',
    })
    customers: number;

    @ApiProperty()
    contactPoints: number;

    @ApiProperty()
    conversations: number;

    @ApiProperty()
    messages: number;

    @ApiProperty({ description: 'Stored images and files sent in the chats' })
    mediaFiles: number;
}
