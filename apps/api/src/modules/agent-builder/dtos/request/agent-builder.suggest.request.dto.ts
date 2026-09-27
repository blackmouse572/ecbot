import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AgentBuilderSuggestRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    @ApiProperty({
        description: 'One or two sentences about the business and what the agent should do',
        example: 'I run a nail spa in Da Nang. Customers ask prices and want to book.',
    })
    description: string;
}
