import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from '@app/common/database/interfaces/database.interface';
import {
    ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE,
    FACEBOOK_SUBSCRIPTION_FIELD,
} from '@app/common/enums/facebook.enum';
import { FacebookPageResponseDto } from '@app/common/facebook/dtos/facebook-page.response.dto';
import { FacebookPageService } from '@app/common/facebook/services/facebook-page.service';
import { FacebookWebhookService } from '@app/common/facebook/services/facebook-webhook.service';
import {
    ENVELOPE_TOKEN_PREFIX,
    HelperEncryptionService,
} from '@app/common/helper/services/helper.encryption.service';
import { IOAuthTokenResult } from '@app/common/oauth/interfaces/oauth-platform.interface';
import { OAuthPlatformFactory } from '@app/common/oauth/oauth-platform.factory';
import { hasToObject } from '@app/common/utils/common';
import { IAccountService } from '@app/modules/account/interfaces/account.service.interface';
import { ChatbotService } from '@app/modules/chatbot/services/chatbot.service';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isUUID } from 'class-validator';
import slugify from 'slugify';
import { AccountCreateRequestDto } from '../dtos/request/account.create.request.dto';
import { AccountUpdateStatusRequestDto } from '../dtos/request/account.update-status.request.dto';
import { AccountUpdateRequestDto } from '../dtos/request/account.update.request.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { ENUM_ACCOUNT_STATUS, ENUM_ACCOUNT_TYPE } from '../enums/account.enum';
import { IAccountEntityWithPages } from '../interfaces/account.interface';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { FollowupEntity } from '@app/modules/platform/repository/entities/followup.entity';
import { AccountEntity } from '../repository/entities/account.entity';
import { AccountRepository } from '../repository/repositories/account.repository';

// Every account read carries enough of its workspace to label the row.
const WORKSPACE_JOIN = { path: 'workspace', select: 'name slug avatar' };

const PAGE_SUBSCRIPTION_FIELDS =
    FACEBOOK_SUBSCRIPTION_FIELD[ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE];

@Injectable()
export class AccountService implements IAccountService {
    constructor(
        private readonly em: EntityManager,
        private readonly accountRepository: AccountRepository,
        private readonly facebookPageService: FacebookPageService,
        private readonly facebookWebhookService: FacebookWebhookService,
        private readonly chatbotService: ChatbotService,
        private readonly oauthPlatformFactory: OAuthPlatformFactory,
        private readonly helperEncryption: HelperEncryptionService
    ) {}

    private encryptToken(token: string): string {
        if (!token) return token;
        return this.helperEncryption.envelopeEncrypt(token);
    }

    /**
     * Every write path must land an enveloped value. A value that already
     * carries the envelope prefix is a re-save of an encrypted row —
     * re-encrypting would double-wrap it and the next decrypt would return
     * ciphertext instead of the token.
     */
    private encryptIfPlain(token: string): string {
        if (!token || token.startsWith(ENVELOPE_TOKEN_PREFIX)) return token;
        return this.encryptToken(token);
    }

    decryptToken(encryptedToken: string): string {
        if (!encryptedToken) return encryptedToken;
        return this.helperEncryption.envelopeDecrypt(encryptedToken);
    }

    /** Adds {@link WORKSPACE_JOIN} to `options` unless the caller asked for it. */
    private withWorkspaceJoin(options?: Record<string, any>): any {
        const query: Record<string, any> = options ?? {};
        const joins: any[] = Array.isArray(query.join)
            ? query.join
            : query.join
              ? [query.join]
              : [];

        query.join = joins.some(join => join.path === WORKSPACE_JOIN.path)
            ? joins
            : [...joins, WORKSPACE_JOIN];

        return query;
    }

    private workspaceRef(workspaceId: string): WorkspaceEntity {
        return this.em.getReference(WorkspaceEntity, workspaceId);
    }

    /** A UUID can be either the primary key or a slug that looks like one. */
    private matchIdOrSlug(idOrSlug: string): Record<string, any> {
        return isUUID(idOrSlug)
            ? { $or: [{ id: idOrSlug }, { slug: idOrSlug }] }
            : { slug: idOrSlug };
    }

    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<AccountEntity[]> {
        return this.accountRepository.find(
            find,
            this.withWorkspaceJoin(options)
        );
    }
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.accountRepository.getTotal(find, options);
    }
    findOneByIdOrSlug(
        id: string,
        options?: IDatabaseOptions,
        workspaceId?: string
    ): Promise<AccountEntity> {
        if (!id) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.notFound',
            });
        }

        // `workspaceId` is what keeps a tenant off another tenant's rows;
        // admin reads pass none and stay cross-tenant on purpose.
        return this.accountRepository.findOne(
            {
                ...this.matchIdOrSlug(id),
                ...(workspaceId && { workspace: workspaceId }),
                deletedAt: null,
            },
            {
                ...options,
                populate: [
                    'workspace',
                    'createdBy',
                    ...(options?.populate || []),
                ],
            }
        );
    }
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<AccountEntity> {
        return this.accountRepository.findOne(
            find,
            this.withWorkspaceJoin(options)
        );
    }
    create(
        createDto: AccountCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<AccountEntity> {
        const entity = new AccountEntity();
        entity.workspace = this.workspaceRef(createDto.workspace);
        entity.name = createDto.name;
        entity.slug = createDto.slug;
        entity.type = createDto.type;
        entity.status = createDto.status || ENUM_ACCOUNT_STATUS.ACTIVE;
        entity.createdBy = createDto.addedBy
            ? this.em.getReference(UserEntity, createDto.addedBy)
            : undefined;
        entity.avatar = createDto.avatar;
        entity.link = createDto.link;
        entity.accessToken = this.encryptIfPlain(createDto.accessToken);
        return this.accountRepository.create<AccountEntity>(entity, options);
    }
    updateStatus(
        repository: AccountEntity,
        { status }: AccountUpdateStatusRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.get.notFound',
            });
        }
        if (repository.status === status) {
            throw new ConflictException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'account.error.statusAlreadySet',
            });
        }
        repository.status = status;
        return this.accountRepository.save(repository, options);
    }
    /**
     * Copies the declared update fields onto the row. Fields the DTO leaves
     * out keep their current value, and keys outside the DTO are ignored — a
     * caller cannot reach `id`, `deletedAt` or the audit columns through here.
     */
    update(
        repository: AccountEntity,
        updateDto: AccountUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.get.notFound',
            });
        }

        const {
            name,
            link,
            type,
            avatar,
            slug,
            status,
            workspace,
            accessToken,
        } = updateDto;

        if (name !== undefined) repository.name = name;
        if (link !== undefined) repository.link = link;
        if (type !== undefined) repository.type = type;
        if (avatar !== undefined) repository.avatar = avatar;
        if (slug !== undefined) repository.slug = slug;
        if (status !== undefined) repository.status = status;
        if (workspace !== undefined) {
            repository.workspace = this.workspaceRef(workspace);
        }
        if (accessToken !== undefined) {
            repository.accessToken = this.encryptIfPlain(accessToken);
        }

        return this.accountRepository.save(repository, options);
    }
    softDelete(
        repository: AccountEntity,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.notFound',
            });
        }
        repository.deletedAt = new Date();
        return this.accountRepository.save(repository, options);
    }

    async findAccountsNotBelongingToAnyChatbot(
        workspaceId?: string,
        options?: IDatabaseFindAllOptions
    ): Promise<AccountEntity[]> {
        const find: Record<string, any> = {
            deletedAt: null,
            chatbot: null,
            ...(workspaceId && { workspace: workspaceId }),
        };

        return this.accountRepository.find(
            find,
            this.withWorkspaceJoin(options)
        );
    }

    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        return this.accountRepository.deleteMany(find, options).then(result => {
            return !!(result && (result as any).deletedCount > 0);
        });
    }

    mapList(accounts: AccountEntity[]): AccountListResponseDto[] {
        return accounts.map((a: AccountEntity) => {
            const obj = hasToObject(a) ? a.toObject() : a;
            return {
                ...obj,
                cookies: undefined,
                proxies: undefined,
                accessToken: undefined,
            } as unknown as AccountListResponseDto;
        });
    }

    mapDetail(account: AccountEntity): AccountGetDetailResponseDto {
        return plainToInstance(AccountGetDetailResponseDto, account, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Exchanges an OAuth code for a channel and stores it. Facebook also
     * brings in the pages the user manages, as child accounts.
     */
    async syncAccount(
        code: string,
        platform: ENUM_ACCOUNT_TYPE,
        workspaceId: string,
        userId: string,
        actionBy?: string
    ): Promise<IAccountEntityWithPages> {
        const platformService = this.oauthPlatformFactory.getService(platform);
        const profile = await platformService.getTokenAndProfile(code);

        if (!profile?.accessToken) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.accessTokenNotFound',
            });
        }

        const actor = actionBy || userId;
        // Subscribing before the write keeps a half-linked account out of the
        // database when Facebook rejects the webhook.
        const pages =
            platform === ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT
                ? await this.subscribeFacebookPages(profile)
                : [];

        const linked = await this.upsertLinkedAccount(
            profile,
            platform,
            workspaceId,
            actor
        );

        const linkedPages = await Promise.all(
            pages.map(page =>
                this.upsertLinkedPage(page, linked, workspaceId, actor)
            )
        );

        return this.joinAccountsWithPages(linked, linkedPages);
    }

    /** Keyed on `externalId`, so re-linking refreshes the existing row. */
    private upsertLinkedAccount(
        profile: IOAuthTokenResult,
        platform: ENUM_ACCOUNT_TYPE,
        workspaceId: string,
        actor: string
    ): Promise<AccountEntity> {
        return this.accountRepository.upsert(
            {
                workspace: this.workspaceRef(workspaceId),
                externalId: profile.externalId,
                accessToken: this.encryptToken(profile.accessToken),
                refreshToken: profile.refreshToken
                    ? this.encryptToken(profile.refreshToken)
                    : undefined,
                tokenExpiresAt: profile.tokenExpiresAt,
                name: profile.name,
                slug: slugify(profile.name + profile.externalId),
                avatar: profile.avatar,
                link: profile.link,
                type: platform,
                status: ENUM_ACCOUNT_STATUS.ACTIVE,
            },
            actor
        );
    }

    /** A page carries its own token and hangs off the account that owns it. */
    private upsertLinkedPage(
        page: FacebookPageResponseDto,
        parent: AccountEntity,
        workspaceId: string,
        actor: string
    ): Promise<AccountEntity> {
        return this.accountRepository.upsert(
            {
                workspace: this.workspaceRef(workspaceId),
                externalId: page.id,
                accessToken: this.encryptToken(page.access_token),
                name: page.name,
                slug: slugify(page.name + page.id),
                avatar: page.picture?.data?.url,
                link: `https://www.facebook.com/${page.id}`,
                type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                status: ENUM_ACCOUNT_STATUS.ACTIVE,
                account: this.em.getReference(AccountEntity, parent.id),
            },
            actor
        );
    }

    /**
     * Registers the app-level page webhook, then subscribes every page the
     * linked user manages. Returns those pages so they can be stored.
     */
    private async subscribeFacebookPages(
        profile: IOAuthTokenResult
    ): Promise<FacebookPageResponseDto[]> {
        const registered = await this.facebookWebhookService.registerWebhook({
            object: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE,
            fields: PAGE_SUBSCRIPTION_FIELDS,
        });

        if (!registered) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'facebook.error.webhookRegistrationFailed',
            });
        }

        const pages = await this.facebookPageService.getPages({
            userId: profile.externalId,
            accessToken: profile.accessToken,
        });

        if (pages.length) {
            const subscribed =
                await this.facebookWebhookService.subscribePageWebhook(
                    pages,
                    PAGE_SUBSCRIPTION_FIELDS
                );

            if (!subscribed) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'facebook.error.webhookSubscriptionFailed',
                });
            }
        }

        return pages;
    }

    async deleteSyncAccount(
        accountId: string,
        workspaceId: string
    ): Promise<boolean> {
        const account = await this.accountRepository.findOne({
            id: accountId,
            workspace: workspaceId,
            deletedAt: null,
        });

        if (!account) return false;

        await this.runPlatformUnlinkCleanup(account);

        // Sub-accounts (pages under a parent account) are a separate entity
        // with their own lifecycle — unlinking this account must not touch
        // them or their conversations; only this account's own data.
        return this.em.transactional(async tem => {
            const conversations = await tem.find(ConversationEntity, {
                account: accountId,
            });
            const conversationIds = conversations.map(c => c.id);

            if (conversationIds.length > 0) {
                // messages/followups keep a non-nullable, non-cascading FK
                // to conversations — remove them first so the conversation
                // rows (and, in turn, the account) can be hard-deleted
                // cleanly, all in the same transaction.
                await tem.nativeDelete(MessageEntity, {
                    conversation: { $in: conversationIds },
                });
                await tem.nativeDelete(FollowupEntity, {
                    conversation: { $in: conversationIds },
                });
                await tem.nativeDelete(ConversationEntity, {
                    id: { $in: conversationIds },
                });
            }

            await tem.nativeDelete(AccountEntity, { id: accountId });

            return true;
        });
    }

    /**
     * Best-effort per-platform cleanup on unlink (e.g. Telegram deregisters its
     * webhook). Resolved generically via the OAuth platform registry; platforms
     * that don't need cleanup simply don't implement `onUnlink`. Never aborts
     * the unlink — unsupported platforms or cleanup failures are swallowed.
     */
    private async runPlatformUnlinkCleanup(
        account: AccountEntity
    ): Promise<void> {
        try {
            const platformService = this.oauthPlatformFactory.getService(
                account.type
            );
            if (platformService.onUnlink && account.accessToken) {
                await platformService.onUnlink(
                    this.decryptToken(account.accessToken)
                );
            }
        } catch {
            // Platform has no OAuth service (e.g. FACEBOOK_PAGE) or cleanup
            // failed — unlinking must proceed regardless.
        }
    }

    joinAccountsWithPages(
        account: AccountEntity,
        pages: AccountEntity[]
    ): IAccountEntityWithPages {
        return {
            ...account,
            accessToken: undefined,
            pages: pages.map(page => ({
                ...page,
                accessToken: undefined,
            })),
            cookies: [],
            proxies: [],
        } as IAccountEntityWithPages;
    }

    upsert(dto: AccountCreateRequestDto, options?: IDatabaseCreateOptions) {
        const entity = new AccountEntity();
        entity.workspace = this.workspaceRef(dto.workspace);
        entity.name = dto.name;
        entity.slug = slugify(dto.name);
        entity.type = dto.type;
        entity.status = dto.status || ENUM_ACCOUNT_STATUS.ACTIVE;
        entity.createdBy = dto.addedBy
            ? this.em.getReference(UserEntity, dto.addedBy)
            : undefined;
        entity.avatar = dto.avatar;
        entity.link = dto.link;
        entity.accessToken = this.encryptIfPlain(dto.accessToken);
        return this.accountRepository.upsert(
            entity,
            dto.addedBy || '',
            options
        );
    }
}
