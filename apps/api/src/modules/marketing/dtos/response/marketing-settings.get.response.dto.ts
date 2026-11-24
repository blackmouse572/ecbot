import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Cài đặt gửi tin: the saved values, or the defaults. */
export class MarketingSettingsGetResponseDto {
    @Expose()
    @ApiProperty({ example: 3 })
    maxPer30Days: number;

    @Expose()
    @ApiProperty({ example: 1, description: 'Fixed: one offer a shop day.' })
    maxPerDay: number;

    @Expose()
    @ApiProperty({ example: 3 })
    restAfter: number;

    @Expose()
    @ApiProperty({ example: 30 })
    restDays: number;

    @Expose()
    @ApiProperty({ example: '09:00' })
    sendFrom: string;

    @Expose()
    @ApiProperty({ example: '20:00' })
    sendTo: string;

    @Expose()
    @ApiProperty({ type: [String], example: ['dừng', 'dung', 'stop'] })
    stopKeywords: string[];

    @Expose()
    @ApiProperty({
        type: String,
        nullable: true,
        description: 'Null: the built-in text in the agent language.',
    })
    stopReply: string | null;

    @Expose()
    @ApiProperty({
        description: 'False: a customer who opts out gets no confirmation.',
    })
    stopReplyEnabled: boolean;
}
