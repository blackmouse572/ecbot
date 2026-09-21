import { ApiProperty } from '@nestjs/swagger';

export class FacebookPageResponseDto {
    @ApiProperty({
        description: 'The unique identifier for the Facebook page',
        example: '123456789012345',
        type: String,
    })
    id: string;
    @ApiProperty({
        description: 'The name of the Facebook page',
        example: 'My Awesome Page',
        type: String,
    })
    name: string;
    @ApiProperty({
        description: 'The access token for the Facebook page',
        example: 'EAA...ZDZD',
        type: String,
    })
    access_token: string;
    @ApiProperty({
        description: 'The category of the Facebook page',
        example: 'Local Business',
        type: String,
    })
    category: string;

    @ApiProperty({
        description: 'The picture of the Facebook page',
        type: Object,
    })
    picture: {
        data: {
            height: number;
            is_silhouette: boolean;
            url: string;
            width: number;
        };
    };
    @ApiProperty({
        description: 'The tasks associated with the Facebook page',
        type: [String],
        example: ['ANALYZE', 'ADVERTISE'],
    })
    tasks: string[];
    @ApiProperty({
        description: 'The number of fans on the Facebook page',
        type: Number,
        example: 1500,
    })
    fan_count: number;
}

export class FacebookPagePictureResponseDto {
    @ApiProperty({
        description: 'The URL of the Facebook page picture',
        type: String,
        example: 'https://example.com/picture.jpg',
    })
    url: string;

    @ApiProperty({
        description: 'The height of the Facebook page picture',
        type: Number,
        example: 200,
    })
    height: number;

    @ApiProperty({
        description: 'The width of the Facebook page picture',
        type: Number,
        example: 200,
    })
    width: number;
}
