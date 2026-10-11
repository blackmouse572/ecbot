import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
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

// A query string, fragment or login in a URL can hold a customer's secret
// (Composio URLs carry ?user_id=), so admins get scheme, host and path only.
const StripUrlSecrets = (): PropertyDecorator =>
    Transform(({ value }) => {
        try {
            const url = new URL(value);
            return `${url.origin}${url.pathname}`;
        } catch {
            return undefined;
        }
    });

// Header values can hold a customer's secret, so admins do not get them.
export class ToolAdminListResponseDto extends OmitType(ToolListResponseDto, [
    'httpHeaders',
] as const) {
    @StripUrlSecrets()
    httpUrl?: string;

    @StripUrlSecrets()
    mcpServerUrl?: string;

    @Expose()
    @Type(() => ToolAdminWorkspaceResponseDto)
    @ApiProperty({ type: ToolAdminWorkspaceResponseDto })
    workspace!: ToolAdminWorkspaceResponseDto;
}

export class ToolAdminResponseDto extends OmitType(ToolResponseDto, [
    'httpHeaders',
] as const) {
    @StripUrlSecrets()
    httpUrl?: string;

    @StripUrlSecrets()
    mcpServerUrl?: string;

    @Expose()
    @Type(() => ToolAdminWorkspaceResponseDto)
    @ApiProperty({ type: ToolAdminWorkspaceResponseDto })
    workspace!: ToolAdminWorkspaceResponseDto;

    @Expose()
    @Type(() => ToolInvocationStatsResponseDto)
    @ApiProperty({ type: ToolInvocationStatsResponseDto })
    invocationStats!: ToolInvocationStatsResponseDto;
}
