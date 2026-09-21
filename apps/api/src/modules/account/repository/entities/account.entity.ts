import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import type { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../enums/account.enum';
import { AccountConfig } from '../../interfaces/account-config.interface';

export const AccountTableName = 'accounts';

/**
 * One messaging channel a workspace has connected — a linked platform account,
 * a page derived from one, or a channel eccho issues itself.
 */
@Entity({ tableName: AccountTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['slug'] })
export class AccountEntity extends DatabaseEntityBase {
    // Platform-assigned id. Unique, and the key every upsert matches on.
    @Property({ type: 'varchar', length: 255, unique: true })
    @IsString()
    @IsNotEmpty()
    externalId: string;

    @Property({ type: 'varchar', length: 255 })
    @IsString()
    @IsNotEmpty()
    name: string;

    @Property({ type: 'varchar', length: 255 })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @Property({ type: 'text', length: 2000, nullable: true })
    @IsString()
    @IsOptional()
    avatar?: string;

    @Property({ type: 'text', length: 2000, nullable: true })
    @IsString()
    @IsOptional()
    link?: string;

    @Enum(() => ENUM_ACCOUNT_STATUS)
    @IsNotEmpty()
    @IsEnum(ENUM_ACCOUNT_STATUS)
    status: ENUM_ACCOUNT_STATUS = ENUM_ACCOUNT_STATUS.ACTIVE;

    @ManyToOne(() => WorkspaceEntity)
    @Exclude({ toPlainOnly: true })
    workspace: Rel<WorkspaceEntity>;

    @Enum(() => ENUM_ACCOUNT_TYPE)
    @IsEnum(ENUM_ACCOUNT_TYPE)
    @IsNotEmpty()
    type: ENUM_ACCOUNT_TYPE;

    // Credentials: enveloped at every write path, never serialized out.
    @Property({ type: 'text', length: 2000, hidden: true })
    @IsString()
    @IsNotEmpty()
    @Exclude()
    accessToken: string;

    @Property({ type: 'text', length: 2000, hidden: true, nullable: true })
    @IsString()
    @IsOptional()
    @Exclude()
    refreshToken?: string;

    @Property({ type: 'timestamptz', nullable: true })
    @IsOptional()
    tokenExpiresAt?: Date;

    // Parent account, for rows derived from a link (e.g. a Facebook page).
    @ManyToOne(() => AccountEntity, { nullable: true, lazy: true })
    @IsOptional()
    @Exclude()
    @ApiHideProperty()
    account?: AccountEntity;

    // Referenced by name: chatbot.entity.ts points back here, and a runtime
    // import would close the cycle.
    @ManyToOne('ChatbotEntity', { nullable: true })
    @Exclude({ toPlainOnly: true })
    @IsOptional()
    @ApiHideProperty()
    chatbot?: Rel<ChatbotEntity>;

    // Channel settings for eccho-issued channels (API_CHANNEL, WEBSITE_WIDGET).
    // Shape is discriminated by `type` — see account-config.interface.ts.
    // Hidden because ApiChannelConfig carries the signing secret.
    @Property({ type: 'jsonb', nullable: true, hidden: true })
    @IsOptional()
    @Exclude()
    @ApiHideProperty()
    config?: AccountConfig;
}
