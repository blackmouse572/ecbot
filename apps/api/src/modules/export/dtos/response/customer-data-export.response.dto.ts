import { ApiProperty } from '@nestjs/swagger';
import {
    IExportContactPoint,
    IExportConversation,
    IExportCustomer,
    IExportCustomerTag,
    IExportFollowup,
    IExportToolInvocation,
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
    tags: IExportCustomerTag[];

    @ApiProperty({ type: Object, isArray: true })
    contactPoints: IExportContactPoint[];

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Conversations with all of their messages',
    })
    conversations: IExportConversation[];

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Proactive follow-up messages scheduled for the customer',
    })
    followups: IExportFollowup[];

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Tool calls the agent made in these conversations',
    })
    toolInvocations: IExportToolInvocation[];
}
