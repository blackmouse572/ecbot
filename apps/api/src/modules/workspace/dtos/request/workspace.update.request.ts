import { ApiProperty } from '@nestjs/swagger';
import { WorkSpaceCreateRequestDto } from './workspace.create.request';

export class WorkSpaceUpdateRequestDto extends WorkSpaceCreateRequestDto {
    // @ApiProperty({
    //     example: '21fa5786-7216-488b-89ae-571349af05b1',
    //     description: 'Owner id',
    //     required: true,
    //     type: String,
    // })
    // owner: string;

    @ApiProperty({
        example: 'workspace-slug',
        description: 'Slug for the workspace',
        required: true,
        type: String,
    })
    slug: string;
    // @ApiProperty({
    //     example: ['bed86cf8-1734-4bee-870d-b802df8e2964'],
    //     description: ' List of user IDs to be added to the workspace',
    //     required: false,
    //     type: [String],
    // })
    // members?: string[];
}
