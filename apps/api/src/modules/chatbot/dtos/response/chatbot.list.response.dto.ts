import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { AccountGetDetailResponseDto } from '@app/modules/account/dtos/response/account.detail.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString } from 'class-validator';
import {
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_MODEL_PROVIDER,
    ENUM_CHATBOT_STATUS,
    ENUM_CHATBOT_TYPE,
} from '../../enums/chatbot.enum';

export class AccountSummary {
    @ApiProperty({
        description: 'Account ID',
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'Account name',
        example: 'Uzumaki Naruto',
    })
    @Expose()
    name: string;

    @ApiProperty({
        description: 'Account slug',
        example: 'uzumaki-naruto',
    })
    @Expose()
    slug: string;

    @ApiProperty({
        description: 'Account avatar URL',
        example: 'https://example.com/avatar.jpg',
    })
    @Expose()
    avatar?: string;

    @ApiProperty({
        description: 'Account status',
    })
    @Expose()
    status: string;
}
export class ChatbotListResponseDto extends DatabaseDto {
    @ApiProperty({ description: 'Chatbot name' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'Chatbot avatar URL', required: false })
    @Expose()
    avatar?: string;

    @ApiProperty({ description: 'General knowledge', required: false })
    @Expose()
    generalKnowledge?: string;

    @ApiProperty({
        description: 'Chatbot status',
        enum: ENUM_CHATBOT_STATUS,
        type: String,
    })
    @Expose()
    status: ENUM_CHATBOT_STATUS;

    @ApiProperty({
        description: 'Type of the chatbot',
        enum: ENUM_CHATBOT_TYPE,
        type: String,
    })
    @Expose()
    type: ENUM_CHATBOT_TYPE;

    @ApiProperty({ description: 'Creation date', type: Date })
    @Expose()
    createdAt: Date;

    @ApiProperty({ description: 'Last update date', type: Date })
    @Expose()
    updatedAt: Date;

    @ApiProperty({
        description: 'Show typing indicator when new message came',
        type: Boolean,
        default: true,
    })
    @IsBoolean()
    @Expose()
    typingIndicator: boolean = true;

    @ApiProperty({
        description: 'Show typing indicator when new message came',
        type: Boolean,
        default: true,
    })
    @IsBoolean()
    @Expose()
    autoRead: boolean = true;

    @ApiProperty({
        description: 'Primary language for the chatbot',
        example: ENUM_CHATBOT_LANGUAGE.EN,
        enum: ENUM_CHATBOT_LANGUAGE,
        type: String,
    })
    @Expose()
    primaryLanguage: ENUM_CHATBOT_LANGUAGE;

    @ApiProperty({
        description:
            'Language to switch to when user does not use primary language',
        example: ENUM_CHATBOT_LANGUAGE.EN,
        enum: ENUM_CHATBOT_LANGUAGE,
        type: String,
        required: false,
    })
    @Expose()
    deferedLanguage?: ENUM_CHATBOT_LANGUAGE;

    @ApiProperty({
        description: 'Welcome message sent to users when they start a chat',
        example: 'Hello! How can I help you today?',
        type: String,
        required: false,
    })
    @Expose()
    welcomeMessage?: string;

    @ApiProperty({
        description: 'Fallback message when the bot cannot answer',
        example: 'I apologize, I could not understand your request.',
        type: String,
        required: false,
    })
    @Expose()
    fallbackMessage?: string;

    @ApiProperty({
        description: 'LLM model provider',
        example: ENUM_CHATBOT_MODEL_PROVIDER.OPENAI,
        enum: ENUM_CHATBOT_MODEL_PROVIDER,
        type: String,
    })
    @Expose()
    modelProvider: ENUM_CHATBOT_MODEL_PROVIDER;

    @ApiProperty({
        description: 'LLM model name',
        example: 'anthropic/claude-sonnet-4.5',
        type: String,
    })
    @Expose()
    modelTextName: string;

    @ApiProperty({
        description: 'Temperature for model response (0-2)',
        example: 1.0,
        type: Number,
        default: 1.0,
    })
    @Expose()
    modelTemperature: number = 1.0;

    @ApiProperty({
        description: 'Maximum tokens for model response',
        example: 1000,
        type: Number,
        required: false,
    })
    @Expose()
    maxTokens?: number;

    @ApiProperty({
        description:
            'Stop this chatbot once it has spent this many tokens in a day. Null means uncapped.',
        example: 100000,
        type: Number,
        required: false,
    })
    @Expose()
    dailyTokenCap?: number;

    @ApiProperty({
        description:
            'Stop this chatbot once it has spent this many tokens in a calendar month. Null means uncapped.',
        example: 2000000,
        type: Number,
        required: false,
    })
    @Expose()
    monthlyTokenCap?: number;

    @ApiProperty({
        description:
            'Number of fallback triggers before handing off to a human agent',
        example: 3,
        type: Number,
        default: 3,
    })
    @Expose()
    handoffFallbackThreshold: number = 3;

    @ApiProperty({
        description:
            'Message sent to users when the chatbot hands off to a human agent',
        example:
            'I am transferring you to a human agent for further assistance.',
        type: String,
        required: false,
    })
    handoffMessage: string | null;

    @ApiProperty({
        type: [String],
        description:
            'Keywords that trigger handoff to a human agent when detected in user messages',
    })
    @Expose()
    handoffKeywords: string[] = [];

    @ApiProperty({
        description: 'Workspace the chatbot belongs to',
    })
    @Expose()
    @IsString()
    workspace: string;

    @ApiProperty({
        description: 'Accounts associated with the chatbot',
    })
    @Expose()
    @IsArray()
    @Type(() => AccountGetDetailResponseDto)
    accounts: string[];

    @ApiProperty({
        description: 'Whether guardrails are enabled for this chatbot',
        type: Boolean,
        default: false,
    })
    @IsBoolean()
    @Expose()
    guardrailEnabled: boolean = false;

    @ApiProperty({
        description: 'Whether the LLM classifier tier of guardrails is enabled',
        type: Boolean,
        default: false,
    })
    @IsBoolean()
    @Expose()
    guardrailModelEnabled: boolean = false;

    @ApiProperty({
        description:
            'Custom operator instruction for the guardrail LLM classifier',
        type: String,
        required: false,
    })
    @Expose()
    guardrailCustomInstruction?: string;

    @ApiProperty({
        description:
            'Whether a guardrail block triggers handoff to a human agent',
        type: Boolean,
        default: true,
    })
    @IsBoolean()
    @Expose()
    guardrailEscalateOnBlock: boolean = true;

    @ApiProperty({
        description:
            'Free-text guidance for when the bot should proactively follow up',
        type: String,
        required: false,
    })
    @Expose()
    followupRules?: string;
}
