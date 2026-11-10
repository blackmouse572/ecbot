import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { ORDER_CHAT_MAX_ITEMS } from '../../constants/order.constant';
import { OrderItemRequestDto } from './order-item.request.dto';

// What the bot noted when the customer confirmed an order in chat.
export class OrderSystemDraftRequestDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(ORDER_CHAT_MAX_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => OrderItemRequestDto)
    @ApiProperty({ type: [OrderItemRequestDto] })
    items: OrderItemRequestDto[];

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({
        required: false,
        description: 'Total the customer agreed to, in minor units',
    })
    total?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @ApiProperty({ required: false })
    note?: string;

    /** Conversation the bot is replying in: one draft per conversation. */
    @IsOptional()
    @IsUUID()
    @ApiProperty({ required: false })
    conversationId?: string;
}
