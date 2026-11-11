import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    CUSTOMER_JOURNEY_STAGE_ORDER,
    CUSTOMER_MARKETING_DORMANT_DAYS,
    CUSTOMER_MARKETING_PERMISSION_MERGE_ORDER,
    CUSTOMER_MARKETING_REASON_FIRST_MESSAGE,
    CUSTOMER_MARKETING_REASON_HOSTILE,
    CUSTOMER_MARKETING_REASON_MERGE,
    CUSTOMER_MARKETING_REASON_OPT_OUT_KEYWORD,
    CUSTOMER_MARKETING_REASON_TRACKED_LINK,
} from '../constants/customer-marketing.constant';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { MarketingEventGetResponseDto } from '../dtos/response/marketing-event.get.response.dto';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../enums/customer-marketing.enum';
import {
    ICustomerMarketingArrival,
    ICustomerMarketingChangeContext,
    ICustomerMarketingInbound,
} from '../interfaces/customer-marketing.interface';
import { CustomerMarketingStateEntity } from '../repository/entities/customer-marketing-state.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { MarketingEventEntity } from '../repository/entities/marketing-event.entity';
import { TrackedLinkEntity } from '../repository/entities/tracked-link.entity';
import { CustomerMarketingStateRepository } from '../repository/repositories/customer-marketing-state.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { MarketingEventRepository } from '../repository/repositories/marketing-event.repository';
import { isMarketingOptOutMessage } from '../utils/customer-marketing-opt-out.util';

const DAY_MS = 86_400_000;

/**
 * A Customer's three marketing layers (journey stage, messaging permission,
 * the "Khó chịu" flag; product reactions come with orders) and the event
 * behind every change. The merged Customer owns all its ContactPoints, so a
 * "dừng" on one channel stops offers on every channel.
 */
@Injectable()
export class CustomerMarketingService {
    constructor(
        private readonly em: EntityManager,
        private readonly stateRepository: CustomerMarketingStateRepository,
        private readonly eventRepository: MarketingEventRepository,
        private readonly customerRepository: CustomerRepository
    ) {}

    /**
     * Every inbound message: creates the row at Mới biết, keeps the last
     * message date, and applies the opt-out keyword. `optedOut` tells the
     * caller to send the confirmation instead of an agent reply.
     */
    async recordInbound(
        input: ICustomerMarketingInbound
    ): Promise<{ optedOut: boolean }> {
        try {
            return await this.applyInbound(input, this.em.fork());
        } catch (error: unknown) {
            // Two first messages raced to create the row: the other one won,
            // so this run finds it.
            if (!(error instanceof UniqueConstraintViolationException))
                throw error;
            return this.applyInbound(input, this.em.fork());
        }
    }

    /**
     * A customer arrived through a tracked link: logs the visit (once per link
     * and conversation), keeps the first source, and opts a PENDING customer
     * in when the link promises an offer. Null when this visit was already
     * logged, so the caller does not greet or tag twice; otherwise the state.
     */
    async recordSource(
        input: ICustomerMarketingArrival
    ): Promise<CustomerMarketingStateEntity | null> {
        const em = this.em.fork();
        const visits = await this.eventRepository.getTotal(
            {
                customer: input.customerId,
                kind: ENUM_MARKETING_EVENT_KIND.SOURCE,
                trackedLinkId: input.trackedLinkId,
                conversationId: input.conversationId ?? null,
            },
            { em }
        );
        if (visits > 0) return null;

        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.RULE,
            conversationId: input.conversationId,
            messageId: input.messageId,
            trackedLinkId: input.trackedLinkId,
        };
        const state = await this.ensureState(
            input.customerId,
            input.workspaceId,
            context,
            em
        );
        this.recordEvent(
            state,
            ENUM_MARKETING_EVENT_KIND.SOURCE,
            { ...context, oldValue: null, newValue: null },
            em
        );
        if (!state.firstTrackedLink) {
            state.firstTrackedLink = em.getReference(
                TrackedLinkEntity,
                input.trackedLinkId
            );
            state.firstSourceAt = new Date();
        }
        if (
            input.promisesOffer &&
            state.permission === ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING
        ) {
            this.applyPermission(
                state,
                ENUM_CUSTOMER_MARKETING_PERMISSION.GRANTED,
                null,
                { ...context, reason: CUSTOMER_MARKETING_REASON_TRACKED_LINK },
                em
            );
        }
        em.persist(state);
        await em.flush();
        return state;
    }

    async getState(
        customerId: string,
        workspaceId: string
    ): Promise<CustomerMarketingStateEntity> {
        await this.assertCustomer(customerId, workspaceId);
        return (
            (await this.stateRepository.findByCustomer(customerId)) ??
            this.newState(customerId, workspaceId)
        );
    }

    /** Forward only, except for an operator. */
    async setStage(
        customerId: string,
        workspaceId: string,
        stage: ENUM_CUSTOMER_JOURNEY_STAGE,
        context: ICustomerMarketingChangeContext
    ): Promise<CustomerMarketingStateEntity> {
        const state = await this.loadForChange(
            customerId,
            workspaceId,
            context
        );
        const from = CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(state.stage);
        const to = CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(stage);
        const allowed =
            to > from ||
            (to < from &&
                context.actor === ENUM_MARKETING_EVENT_ACTOR.OPERATOR);
        if (allowed) {
            this.recordEvent(state, ENUM_MARKETING_EVENT_KIND.STAGE, {
                ...context,
                oldValue: state.stage,
                newValue: stage,
            });
            state.stage = stage;
        }
        return this.save(state);
    }

    async setPermission(
        customerId: string,
        workspaceId: string,
        permission: ENUM_CUSTOMER_MARKETING_PERMISSION,
        context: ICustomerMarketingChangeContext,
        until?: Date | null
    ): Promise<CustomerMarketingStateEntity> {
        const state = await this.loadForChange(
            customerId,
            workspaceId,
            context
        );
        const leavingStop =
            state.permission === ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED &&
            permission !== ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED;
        if (leavingStop && !context.reason?.trim()) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'customerMarketing.error.reasonRequired',
            });
        }
        if (
            leavingStop &&
            state.hostile &&
            context.actor !== ENUM_MARKETING_EVENT_ACTOR.OPERATOR
        ) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'customerMarketing.error.hostile',
            });
        }
        if (
            permission === ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED &&
            !(until && until.getTime() > Date.now())
        ) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'customerMarketing.error.pauseNeedsDate',
            });
        }
        this.applyPermission(state, permission, until ?? null, context);
        return this.save(state);
    }

    /**
     * The one-time consent question. `alreadyAsked` tells the agent not to
     * ask: it asked before, or the customer already answered, said stop or
     * is marked Khó chịu.
     */
    async markConsentAsked(
        customerId: string,
        workspaceId: string,
        context: ICustomerMarketingChangeContext
    ): Promise<{ alreadyAsked: boolean }> {
        const state = await this.loadForChange(
            customerId,
            workspaceId,
            context
        );
        if (
            state.consentAskedAt ||
            state.hostile ||
            state.permission !== ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING
        ) {
            return { alreadyAsked: true };
        }
        state.consentAskedAt = new Date();
        this.recordEvent(state, ENUM_MARKETING_EVENT_KIND.CONSENT_ASKED, {
            ...context,
            oldValue: null,
            newValue: state.permission,
        });
        await this.save(state);
        return { alreadyAsked: false };
    }

    /** "Khó chịu": also stops offers for good. */
    async setHostile(
        customerId: string,
        workspaceId: string,
        hostile: boolean,
        context: ICustomerMarketingChangeContext
    ): Promise<CustomerMarketingStateEntity> {
        const state = await this.loadForChange(
            customerId,
            workspaceId,
            context
        );
        if (state.hostile !== hostile) {
            this.recordEvent(state, ENUM_MARKETING_EVENT_KIND.HOSTILE, {
                ...context,
                oldValue: String(state.hostile),
                newValue: String(hostile),
            });
            state.hostile = hostile;
        }
        if (hostile) {
            this.applyPermission(
                state,
                ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED,
                null,
                {
                    ...context,
                    reason: context.reason ?? CUSTOMER_MARKETING_REASON_HOSTILE,
                }
            );
        }
        return this.save(state);
    }

    /**
     * Inside the merge transaction: the survivor keeps the strictest
     * permission, the further stage and the hostile flag. The loser keeps its
     * own row, so an unmerge gets it back unchanged.
     */
    async mergeInto(
        loserId: string,
        survivorId: string,
        workspaceId: string,
        em: EntityManager
    ): Promise<void> {
        const loser = await this.stateRepository.findByCustomer(loserId, em);
        if (!loser) return;
        const survivor =
            (await this.stateRepository.findByCustomer(survivorId, em)) ??
            this.newState(survivorId, workspaceId, em);
        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.RULE,
            reason: CUSTOMER_MARKETING_REASON_MERGE,
        };

        const stageOf = (s: CustomerMarketingStateEntity) =>
            CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(s.stage);
        if (stageOf(loser) > stageOf(survivor)) {
            this.recordEvent(
                survivor,
                ENUM_MARKETING_EVENT_KIND.STAGE,
                { ...context, oldValue: survivor.stage, newValue: loser.stage },
                em
            );
            survivor.stage = loser.stage;
        }
        if (loser.hostile && !survivor.hostile) {
            this.recordEvent(
                survivor,
                ENUM_MARKETING_EVENT_KIND.HOSTILE,
                { ...context, oldValue: 'false', newValue: 'true' },
                em
            );
            survivor.hostile = true;
        }
        const rank = (p: ENUM_CUSTOMER_MARKETING_PERMISSION) =>
            CUSTOMER_MARKETING_PERMISSION_MERGE_ORDER.indexOf(p);
        if (rank(loser.permission) < rank(survivor.permission)) {
            this.applyPermission(
                survivor,
                loser.permission,
                loser.permissionUntil ?? null,
                context,
                em
            );
        }
        survivor.consentAskedAt =
            survivor.consentAskedAt ?? loser.consentAskedAt ?? null;
        if (
            loser.lastInboundAt &&
            (!survivor.lastInboundAt ||
                loser.lastInboundAt > survivor.lastInboundAt)
        ) {
            survivor.lastInboundAt = loser.lastInboundAt;
        }
        if (
            loser.firstTrackedLink &&
            (!survivor.firstSourceAt ||
                (loser.firstSourceAt &&
                    loser.firstSourceAt < survivor.firstSourceAt))
        ) {
            survivor.firstTrackedLink = loser.firstTrackedLink;
            survivor.firstSourceAt = loser.firstSourceAt;
        }
        em.persist(survivor);
    }

    async listEvents(
        customerId: string,
        workspaceId: string,
        options: IDatabaseFindAllOptions
    ): Promise<[MarketingEventEntity[], number]> {
        await this.assertCustomer(customerId, workspaceId);
        const find = { customer: customerId, workspace: workspaceId };
        return Promise.all([
            this.eventRepository.find(find, options),
            this.eventRepository.getTotal(find),
        ]);
    }

    mapGet(
        state: CustomerMarketingStateEntity
    ): CustomerMarketingStateGetResponseDto {
        const dormant =
            !!state.lastInboundAt &&
            Date.now() - state.lastInboundAt.getTime() >
                CUSTOMER_MARKETING_DORMANT_DAYS * DAY_MS;
        return plainToInstance(
            CustomerMarketingStateGetResponseDto,
            { ...state, dormant },
            { excludeExtraneousValues: true }
        );
    }

    mapEvents(events: MarketingEventEntity[]): MarketingEventGetResponseDto[] {
        return plainToInstance(MarketingEventGetResponseDto, events, {
            excludeExtraneousValues: true,
        });
    }

    private async applyInbound(
        input: ICustomerMarketingInbound,
        em: EntityManager
    ): Promise<{ optedOut: boolean }> {
        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.RULE,
            conversationId: input.conversationId,
            messageId: input.messageId,
        };
        const state = await this.ensureState(
            input.customerId,
            input.workspaceId,
            context,
            em
        );
        state.lastInboundAt = new Date();
        const optedOut = isMarketingOptOutMessage(input.text);
        if (optedOut) {
            this.applyPermission(
                state,
                ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED,
                null,
                {
                    ...context,
                    reason: CUSTOMER_MARKETING_REASON_OPT_OUT_KEYWORD,
                },
                em
            );
        }
        em.persist(state);
        await em.flush();
        return { optedOut };
    }

    private async ensureState(
        customerId: string,
        workspaceId: string,
        context: ICustomerMarketingChangeContext,
        em: EntityManager = this.em
    ): Promise<CustomerMarketingStateEntity> {
        const existing = await this.stateRepository.findByCustomer(
            customerId,
            em
        );
        if (existing) return existing;
        const state = this.newState(customerId, workspaceId, em);
        this.recordEvent(
            state,
            ENUM_MARKETING_EVENT_KIND.STAGE,
            {
                ...context,
                reason: CUSTOMER_MARKETING_REASON_FIRST_MESSAGE,
                oldValue: null,
                newValue: state.stage,
            },
            em
        );
        return state;
    }

    private async loadForChange(
        customerId: string,
        workspaceId: string,
        context: ICustomerMarketingChangeContext
    ): Promise<CustomerMarketingStateEntity> {
        await this.assertCustomer(customerId, workspaceId);
        return this.ensureState(customerId, workspaceId, context);
    }

    // BOLA guard: a customer of another workspace is a 404.
    private async assertCustomer(
        customerId: string,
        workspaceId: string
    ): Promise<void> {
        const customer = await this.customerRepository.findOne({
            id: customerId,
            workspace: workspaceId,
        } as any);
        if (!customer) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'customer.error.notFound',
            });
        }
    }

    private newState(
        customerId: string,
        workspaceId: string,
        em: EntityManager = this.em
    ): CustomerMarketingStateEntity {
        const state = new CustomerMarketingStateEntity();
        state.customer = em.getReference(CustomerEntity, customerId);
        state.workspace = em.getReference(WorkspaceEntity, workspaceId);
        return state;
    }

    private applyPermission(
        state: CustomerMarketingStateEntity,
        permission: ENUM_CUSTOMER_MARKETING_PERMISSION,
        until: Date | null,
        context: ICustomerMarketingChangeContext,
        em: EntityManager = this.em
    ): void {
        const sameUntil =
            (state.permissionUntil?.getTime() ?? null) ===
            (until?.getTime() ?? null);
        if (state.permission === permission && sameUntil) return;
        this.recordEvent(
            state,
            ENUM_MARKETING_EVENT_KIND.PERMISSION,
            { ...context, oldValue: state.permission, newValue: permission },
            em
        );
        state.permission = permission;
        state.permissionUntil =
            permission === ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED
                ? until
                : null;
    }

    private recordEvent(
        state: CustomerMarketingStateEntity,
        kind: ENUM_MARKETING_EVENT_KIND,
        context: ICustomerMarketingChangeContext & {
            oldValue: string | null;
            newValue: string | null;
        },
        em: EntityManager = this.em
    ): void {
        const event = new MarketingEventEntity();
        event.workspace = state.workspace;
        event.customer = state.customer;
        event.kind = kind;
        event.actor = context.actor;
        event.oldValue = context.oldValue;
        event.newValue = context.newValue;
        event.reason = context.reason ?? null;
        event.conversationId = context.conversationId ?? null;
        event.messageId = context.messageId ?? null;
        event.trackedLinkId = context.trackedLinkId ?? null;
        if (context.userId) {
            event.createdBy = em.getReference(UserEntity, context.userId);
        }
        em.persist(event);
    }

    private async save(
        state: CustomerMarketingStateEntity
    ): Promise<CustomerMarketingStateEntity> {
        this.em.persist(state);
        await this.em.flush();
        return state;
    }
}
