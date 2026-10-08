import { ApiProperty } from '@nestjs/swagger';
import {
    IExportContactPoint,
    IExportConversation,
    IExportCustomer,
} from '../../interfaces/export.interface';

export class CustomerDataExportResponseDto {
    @ApiProperty()
    exportedAt: Date;

    @ApiProperty({ type: Object })
    customer: IExportCustomer;

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Duplicate profiles merged into this customer',
    })
    mergedCustomers: IExportCustomer[];

    @ApiProperty({ type: Object, isArray: true })
    contactPoints: IExportContactPoint[];

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Conversations with all of their messages',
    })
    conversations: IExportConversation[];
}
