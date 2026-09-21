import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import {
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_TYPE,
} from '../../enums/chatbot.enum';

export class ChatbotCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'Name of the chatbot',
        example: 'Customer Support Bot',
        maxLength: 100,
        minLength: 1,
        required: true,
    })
    name: string;

    @IsString()
    @IsEnum(ENUM_CHATBOT_TYPE)
    @ApiProperty({
        description: 'Type of the chatbot',
        example: ENUM_CHATBOT_TYPE.BEAUTY,
        enum: ENUM_CHATBOT_TYPE,
        required: true,
    })
    type: ENUM_CHATBOT_TYPE;

    @IsString()
    @IsOptional()
    @ApiProperty({
        description: 'Avatar URL of the chatbot',
        example: 'https://example.com/avatar.png',
        required: false,
    })
    @MaxLength(500)
    avatar?: string;

    @IsString()
    @IsOptional()
    @MaxLength(5000)
    @ApiProperty({
        description: 'General knowledge of the chatbot',
        example:
            'This chatbot is designed to assist customers with their inquiries.',
        required: false,
    })
    generalKnowledge?: string;

    workspace: string;

    @IsOptional()
    @IsString({ each: true })
    @ApiProperty({
        description: 'List of account IDs associated with the chatbot',
        example: ['60d5ec49f1b2c8b1f8e4e3a1', '60d5ec49f1b2c8b1f8e4e3a2'],
        required: false,
        type: [String],
    })
    accounts?: string[];

    @ApiProperty({
        description: 'Show typing indicator when new message came',
        type: Boolean,
        default: true,
    })
    @IsBoolean()
    typingIndicator: boolean = true;

    @ApiProperty({
        description: 'Show typing indicator when new message came',
        type: Boolean,
        default: true,
    })
    @IsBoolean()
    autoRead: boolean = true;

    @IsString()
    @IsEnum(ENUM_CHATBOT_LANGUAGE)
    @IsNotEmpty()
    @ApiProperty({
        description: 'Primary language for the chatbot',
        example: ENUM_CHATBOT_LANGUAGE.EN,
        enum: ENUM_CHATBOT_LANGUAGE,
        required: true,
    })
    primaryLanguage: ENUM_CHATBOT_LANGUAGE;

    @IsString()
    @IsEnum(ENUM_CHATBOT_LANGUAGE)
    @IsOptional()
    @ApiProperty({
        description:
            'Language to switch to when user does not use primary language',
        example: ENUM_CHATBOT_LANGUAGE.EN,
        enum: ENUM_CHATBOT_LANGUAGE,
        required: false,
    })
    deferedLanguage?: ENUM_CHATBOT_LANGUAGE;

    @IsString()
    @IsOptional()
    @MaxLength(5000)
    @ApiProperty({
        description: 'Welcome message sent to users when they start a chat',
        example: 'Hello! How can I help you today?',
        required: false,
    })
    welcomeMessage?: string;

    @IsString()
    @IsOptional()
    @MaxLength(5000)
    @ApiProperty({
        description: 'Fallback message when the bot cannot answer',
        example:
            'I apologize, I could not understand your request. Please try again.',
        required: false,
    })
    fallbackMessage?: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'OpenRouter model id',
        example: 'anthropic/claude-sonnet-4.5',
        required: true,
    })
    modelTextName: string;

    @IsOptional()
    @Min(0)
    @Max(2)
    @IsNumber()
    @ApiProperty({
        description: 'Temperature for model response (0-2)',
        example: 1.0,
        required: false,
        default: 1.0,
    })
    modelTemperature?: number = 1.0;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @ApiProperty({
        description: 'Maximum tokens for model response',
        example: 1000,
        required: false,
    })
    maxTokens?: number;

    // Budget caps. Null means uncapped — the metering seam skips the usage SUM
    // entirely rather than paying for it on every turn.
    @IsOptional()
    @IsInt()
    @Min(1)
    @ApiProperty({
        description:
            'Stop this chatbot once it has spent this many tokens in a day. Omit for no daily cap.',
        example: 100000,
        required: false,
    })
    dailyTokenCap?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @ApiProperty({
        description:
            'Stop this chatbot once it has spent this many tokens in a calendar month. Omit for no monthly cap.',
        example: 2000000,
        required: false,
    })
    monthlyTokenCap?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @ApiProperty({
        description:
            'Number of consecutive fallback responses before triggering handoff',
        example: 3,
        required: false,
        default: 3,
    })
    handoffFallbackThreshold?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @ApiProperty({
        description:
            'Message sent to user when conversation is handed off to a human',
        example: "I'm connecting you with a human agent, please wait.",
        required: false,
    })
    handoffMessage?: string;

    @IsOptional()
    @IsString({ each: true })
    @ApiProperty({
        description: 'Keywords that trigger an immediate handoff to a human',
        example: ['human', 'agent', 'person'],
        required: false,
        type: [String],
    })
    handoffKeywords?: string[];

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description:
            'Enable guardrail screening of inbound messages and bot replies',
        type: Boolean,
        default: false,
        required: false,
    })
    guardrailEnabled: boolean = false;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description:
            'Enable built-in Gemini Flash classifier tier (requires guardrailEnabled)',
        type: Boolean,
        default: false,
        required: false,
    })
    guardrailModelEnabled: boolean = false;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    @ApiProperty({
        description:
            'Free-text instruction for the operator-defined LLM guardrail tier. Applied to both inbound messages and bot replies.',
        example: 'Block any message asking about competitor pricing',
        required: false,
    })
    guardrailCustomInstruction?: string;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description:
            'Trigger escalation (handoff) when a guardrail blocks. When false, block is silent and bot stays enabled.',
        type: Boolean,
        default: true,
        required: false,
    })
    guardrailEscalateOnBlock: boolean = true;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    @ApiProperty({
        description:
            'Free-text guidance for when the bot should proactively follow up',
        example: 'Follow up after 24 hours if the customer has not responded',
        required: false,
    })
    followupRules?: string;
}
