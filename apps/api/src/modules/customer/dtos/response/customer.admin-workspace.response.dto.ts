import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** The workspace a customer or tag belongs to, as the admin lists show it. */
export class CustomerAdminWorkspaceResponseDto {
    @ApiProperty({ example: '91dbd24d-0a1c-448d-b360-93b3a6c9b4bf' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Tiệm Bánh Mây' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'tiem-banh-may' })
    @Expose()
    slug: string;
}
