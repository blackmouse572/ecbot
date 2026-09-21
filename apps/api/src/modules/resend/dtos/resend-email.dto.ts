import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    IsArray,
    IsOptional,
    ValidateIf,
    MaxLength,
    IsObject,
    IsDefined,
    ArrayMaxSize,
    ValidateNested,
    Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
    @ApiProperty({ description: 'Attachment filename' })
    @IsString()
    filename: string;

    @ApiProperty({ description: 'Attachment content (Base64 encoded)' })
    @IsString()
    content: string;
}

class TagDto {
    @ApiProperty({
        description: 'The name of the email tag.',
        maxLength: 256,
        pattern: '^[a-zA-Z0-9_-]+$',
    })
    @IsString()
    @MaxLength(256)
    @IsDefined()
    // Only ASCII letters, numbers, underscores, dashes
    // Regex: ^[a-zA-Z0-9_-]+$
    // class-validator does not have @Matches in import, so add it:
    @Matches(/^[a-zA-Z0-9_-]+$/)
    name: string;

    @ApiProperty({
        description: 'The value of the email tag.',
        maxLength: 256,
        pattern: '^[a-zA-Z0-9_-]+$',
    })
    @IsString()
    @MaxLength(256)
    @IsDefined()
    @Matches(/^[a-zA-Z0-9_-]+$/)
    value: string;
}

export class SendEmailDto {
    @ApiProperty({
        description:
            'Sender email address. To include a friendly name, use the format "Your Name <sender@domain.com>".',
        example: 'Your Name <sender@domain.com>',
    })
    @IsString()
    @MaxLength(320)
    from: string;

    @ApiProperty({
        description:
            'Recipient email address. For multiple addresses, send as an array of strings. Max 50.',
        type: [String],
        example: ['recipient1@example.com', 'recipient2@example.com'],
    })
    @ValidateIf(o => Array.isArray(o.to))
    @IsArray()
    @ArrayMaxSize(50)
    @IsEmail({}, { each: true })
    @ValidateIf(o => typeof o.to === 'string')
    @IsEmail()
    to: string | string[];

    @ApiProperty({ description: 'Email subject.' })
    @IsString()
    subject: string;

    @ApiProperty({
        description: 'The plain text version of the message.',
        required: false,
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        description:
            'Bcc recipient email address. For multiple addresses, send as an array of strings.',
        type: [String],
        required: false,
    })
    @IsOptional()
    @ValidateIf(o => Array.isArray(o.bcc))
    @IsArray()
    @IsEmail({}, { each: true })
    @ValidateIf(o => typeof o.bcc === 'string')
    @IsEmail()
    bcc?: string | string[];

    @ApiProperty({
        description:
            'Cc recipient email address. For multiple addresses, send as an array of strings.',
        type: [String],
        required: false,
    })
    @IsOptional()
    @ValidateIf(o => Array.isArray(o.cc))
    @IsArray()
    @IsEmail({}, { each: true })
    @ValidateIf(o => typeof o.cc === 'string')
    @IsEmail()
    cc?: string | string[];

    @ApiProperty({
        description:
            'Schedule email to be sent later. The date should be in natural language (e.g.: in 1 min) or ISO 8601 format (e.g: 2024-08-05T11:52:01.858Z).',
        required: false,
        example: '2024-08-05T11:52:01.858Z',
    })
    @IsOptional()
    @IsString()
    scheduledAt?: string;

    @ApiProperty({
        description:
            'Reply-to email address. For multiple addresses, send as an array of strings.',
        type: [String],
        required: false,
    })
    @IsOptional()
    @ValidateIf(o => Array.isArray(o.reply_to))
    @IsArray()
    @IsEmail({}, { each: true })
    @ValidateIf(o => typeof o.reply_to === 'string')
    @IsEmail()
    replyTo?: string | string[];

    @ApiProperty({
        description: 'The HTML version of the message.',
        required: false,
    })
    @IsOptional()
    @IsString()
    html?: string;

    @ApiProperty({
        description: 'Custom headers to add to the email.',
        required: false,
        type: Object,
    })
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiProperty({
        description:
            'Filename and content of attachments (max 40MB per email, after Base64 encoding of the attachments).',
        required: false,
        type: [AttachmentDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttachmentDto)
    attachments?: AttachmentDto[];

    @ApiProperty({
        description: 'Custom data passed in key/value pairs as tags.',
        required: false,
        type: [TagDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TagDto)
    tags?: TagDto[];
}

export class RetrieveEmailDto {
    @ApiProperty({
        description: 'Retrieve a single email.',
        example: '37e4414c-5e25-4dbc-a071-43552a4bd53b',
    })
    @IsString()
    id: string;
}

export class UpdateEmailDto {
    @ApiProperty({
        description: 'Update a single email.',
        example: '37e4414c-5e25-4dbc-a071-43552a4bd53b',
    })
    @IsString()
    id: string;

    @ApiProperty({
        description:
            'Schedule email to be sent later. The date should be in natural language (e.g.: in 1 min) or ISO 8601 format (e.g: 2024-08-05T11:52:01.858Z).',
        required: false,
        example: '2024-08-05T11:52:01.858Z',
    })
    @IsOptional()
    @IsString()
    scheduledAt?: string;
}

export class CancelEmailDto {
    @ApiProperty({
        description: 'Cancel a scheduled email.',
        example: '37e4414c-5e25-4dbc-a071-43552a4bd53b',
    })
    @IsString()
    id: string;
}
