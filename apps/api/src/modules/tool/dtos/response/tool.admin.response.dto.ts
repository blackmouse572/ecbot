import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ToolListResponseDto } from './tool.list.response.dto';
import { ToolResponseDto } from './tool.response.dto';

export class ToolAdminWorkspaceResponseDto {
    @Expose()
    @ApiProperty()
    id!: string;

    @Expose()
    @ApiProperty()
    name!: string;
}

export class ToolInvocationStatsResponseDto {
    @Expose()
    @ApiProperty({ description: 'Invocations kept in the log (30 days)' })
    total!: number;

    @Expose()
    @ApiProperty()
    success!: number;

    @Expose()
    @ApiProperty()
    error!: number;

    @Expose()
    @ApiProperty()
    timeout!: number;

    @Expose()
    @ApiProperty({ required: false, nullable: true, type: Date })
    lastInvokedAt!: Date | null;
}

// Header values can hold a customer's secret, so admins do not get them.
export class ToolAdminListResponseDto extends OmitType(ToolListResponseDto, [
    'httpHeaders',
] as const) {
    @Expose()
    @Type(() => ToolAdminWorkspaceResponseDto)
    @ApiProperty({ type: ToolAdminWorkspaceResponseDto })
    workspace!: ToolAdminWorkspaceResponseDto;
}

export class ToolAdminResponseDto extends OmitType(ToolResponseDto, [
    'httpHeaders',
] as const) {
    @Expose()
    @Type(() => ToolAdminWorkspaceResponseDto)
    @ApiProperty({ type: ToolAdminWorkspaceResponseDto })
    workspace!: ToolAdminWorkspaceResponseDto;

    @Expose()
    @Type(() => ToolInvocationStatsResponseDto)
    @ApiProperty({ type: ToolInvocationStatsResponseDto })
    invocationStats!: ToolInvocationStatsResponseDto;
}
