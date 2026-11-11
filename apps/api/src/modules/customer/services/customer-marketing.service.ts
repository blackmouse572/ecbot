import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { ENUM_ORDER_STATUS } from 'src/modules/order/enums/order.enum';
import { OrderEntity } from 'src/modules/order/repository/entities/order.entity';
import { ProductGroupEntity } from 'src/modules/order/repository/entities/product-group.entity';
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
    CUSTOMER_MARKETING_REASON_ORDER_CONFIRMED,
    CUSTOMER_MARKETING_REASON_TRACKED_LINK,
} from '../constants/customer-marketing.constant';
import { CustomerMarketingStateUpdateRequestDto } from '../dtos/request/customer-marketing-state.update.request.dto';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { CustomerMarketingSummaryResponseDto } from '../dtos/response/customer-marketing-summary.response.dto';
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
    ICustomerMarketingListFilter,
    ICustomerMarketingMergeResult,
    ICustomerMarketingMergeUndo,
    IMarketingEventInput,
} from '../interfaces/customer-marketing.interface';
import { CustomerMarketingStateEntity } from '../repository/entities/customer-marketing-state.entity';
import { CustomerProductReactionEntity } from '../repository/entities/customer-product-reaction.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { MarketingEventEntity } from '../repository/entities/marketing-event.entity';
import { TrackedLinkEntity } from '../repository/entities/tracked-link.entity';
import { CustomerMarketingStateRepository } from '../repository/repositories/customer-marketing-state.repository';
import { CustomerProductReactionRepository } from '../repository/repositories/customer-product-reaction.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { MarketingEventRepository } from '../repository/repositories/marketing-event.repository';
import { customerProductReactionResponse } from '../utils/customer-product-reaction.util';
import { customerMarketingFirstSource } from '../utils/customer-marketing-first-source.util';
import { customerMarketingFreeWindows } from '../utils/customer-marketing-free-window.util';
import { isMarketingOptOutMessage } from '../utils/customer-marketing-opt-out.util';

const DAY_MS = 86_400_000;

/**
 * A Customer's marketing labels (journey stage, messaging permission, the
 * "Khó chịu" flag) and the event behind every change. Product reactions and
 * intents are in CustomerProductMarketingService. The merged Customer owns all its ContactPoints, so a
 * "dừng" on one channel stops offers on every channel.
 */
@Injectable()
export class CustomerMarketingService {
    constructor(
        private readonly em: EntityManager,
        private readonly stateRepository: CustomerMarketingStateRepository,
        private readonly eventRepository: MarketingEventRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly reactionRepository: CustomerProductReactionRepository,
        private readonly moduleRef: ModuleRef
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

        this.addEvent(
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

    /**
     * The labels with the event behind each one and the free-message window
     * per channel, for the customer panel.
     */
    async getDetail(
        customerId: string,
        workspaceId: string
    ): Promise<CustomerMarketingStateGetResponseDto> {
        const state = await this.getState(customerId, workspaceId);

        // Resolved lazily: the conversation module already depends on this
        // one.
        const conversationRepository = this.moduleRef.get(
            ConversationRepository,
            { strict: false }
        );

        await this.stateRepository.populateFirstSource([state]);

        const [
            stageEvent,
            permissionEvent,
            hostileEvent,
            lastInbound,
            reactions,
        ] = await Promise.all([
            this.latestEvent(
                customerId,
                workspaceId,
                ENUM_MARKETING_EVENT_KIND.STAGE,
                state.stage
            ),
            this.latestEvent(
                customerId,
                workspaceId,
                ENUM_MARKETING_EVENT_KIND.PERMISSION,
                state.permission
            ),
            state.hostile
                ? this.latestEvent(
                      customerId,
                      workspaceId,
                      ENUM_MARKETING_EVENT_KIND.HOSTILE
                  )
                : null,
            conversationRepository.lastInboundByChannel(
                customerId,
                workspaceId
            ),
            this.reactionRepository.findActiveByCustomer(customerId),
        ]);

        return plainToInstance(
            CustomerMarketingStateGetResponseDto,
            {
                ...state,
                dormant: this.isDormant(state),
                stageEvent,
                permissionEvent,
                hostileEvent,
                freeWindows: customerMarketingFreeWindows(
                    lastInbound,
                    channel => this.freeMessageWindowHours(channel)
                ),
                firstSource: customerMarketingFirstSource(state),
                reactions: reactions.map(customerProductReactionResponse),
            },
            { excludeExtraneousValues: true }
        );
    }

    /**
     * An edit from the app or a Client credential. Khó chịu goes first: it
     * stops offers, and a permission in the same request then applies on top.
     */
    async applyChange(
        customerId: string,
        workspaceId: string,
        change: CustomerMarketingStateUpdateRequestDto,
        context: ICustomerMarketingChangeContext
    ): Promise<void> {
        if (change.hostile !== undefined) {
            await this.setHostile(
                customerId,
                workspaceId,
                change.hostile,
                context
            );
        }

        if (change.stage) {
            await this.setStage(customerId, workspaceId, change.stage, context);
        }

        if (change.permission) {
            await this.setPermission(
                customerId,
                workspaceId,
                change.permission,
                context,
                change.permissionUntil
            );
        }
    }

    /** Labels per customer for a list page; a customer without a row gets the defaults. */
    async summarize(
        customerIds: string[]
    ): Promise<Map<string, CustomerMarketingSummaryResponseDto>> {
        if (customerIds.length === 0) return new Map();

        const states = await this.stateRepository.find({
            customer: { $in: customerIds },
        });

        await this.stateRepository.populateFirstSource(states);
        const byCustomer = new Map(states.map(s => [s.customer.id, s]));

        return new Map(
            customerIds.map(id => {
                const state =
                    byCustomer.get(id) ?? new CustomerMarketingStateEntity();

                return [
                    id,
                    plainToInstance(
                        CustomerMarketingSummaryResponseDto,
                        {
                            ...state,
                            dormant: this.isDormant(state),
                            firstSource: customerMarketingFirstSource(state),
                        },
                        { excludeExtraneousValues: true }
                    ),
                ];
            })
        );
    }

    /** A `find` fragment for the customers list. */
    customerListFilter(
        filter: ICustomerMarketingListFilter
    ): Record<string, any> {
        return this.stateRepository.customerListFilter(filter);
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

        this.moveStage(state, stage, context);

        return this.save(state);
    }

    /**
     * Runs after an order becomes CONFIRMED: the first confirmed order is
     * Mua 1 lần, the second Mua nhiều lần. Cancelling one never moves the
     * stage back.
     */
    async onOrderConfirmed(order: OrderEntity): Promise<void> {
        const customerId = order.customer.id;
        const workspaceId = order.workspace.id;

        const context = {
            actor: ENUM_MARKETING_EVENT_ACTOR.RULE,
            reason: CUSTOMER_MARKETING_REASON_ORDER_CONFIRMED,
            orderId: order.id,
        };

        const state = await this.loadForChange(
            customerId,
            workspaceId,
            context
        );

        const confirmed = await this.countConfirmedOrders([customerId]);
        this.moveStage(state, this.boughtStage(confirmed), context);
        state.lastOrderAt = this.latest(state.lastOrderAt, order.orderedAt);
        await this.save(state);
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
        this.addEvent(state, ENUM_MARKETING_EVENT_KIND.CONSENT_ASKED, {
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
            this.addEvent(state, ENUM_MARKETING_EVENT_KIND.HOSTILE, {
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
     * permission, the further stage and the hostile flag, counts both
     * customers' confirmed orders and gets the loser's "Tạm hoãn" rows. The
     * loser keeps its own rows, so an unmerge gets them back unchanged; the
     * result says what to undo on the survivor (see revertMergedReactions).
     */
    async mergeInto(
        loserId: string,
        survivorId: string,
        workspaceId: string,
        em: EntityManager
    ): Promise<ICustomerMarketingMergeResult> {
        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.RULE,
            reason: CUSTOMER_MARKETING_REASON_MERGE,
        };

        const result = await this.mergeReactions(
            loserId,
            survivorId,
            workspaceId,
            context,
            em
        );

        const loser = await this.stateRepository.findByCustomer(loserId, em);

        // The loser's orders move to the survivor, so count both.
        const confirmed = await this.countConfirmedOrders(
            [loserId, survivorId],
            em
        );

        if (!loser && !confirmed) return result;

        const survivor =
            (await this.stateRepository.findByCustomer(survivorId, em)) ??
            this.newState(survivorId, workspaceId, em);

        if (loser) this.mergeLabels(loser, survivor, context, em);

        if (confirmed) {
            this.moveStage(survivor, this.boughtStage(confirmed), context, em);
        }

        em.persist(survivor);

        return result;
    }

    /** Unmerge: removes the merge's copies and restores replaced dates. */
    async revertMergedReactions(
        undo: ICustomerMarketingMergeUndo,
        em: EntityManager
    ): Promise<void> {
        if (undo.createdReactionIds?.length) {
            await em.nativeDelete(CustomerProductReactionEntity, {
                id: { $in: undo.createdReactionIds },
            });
        }

        for (const row of undo.replacedReactions ?? []) {
            await em.nativeUpdate(
                CustomerProductReactionEntity,
                { id: row.id },
                { until: new Date(row.until), reason: row.reason }
            );
        }
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

    mapEvents(events: MarketingEventEntity[]): MarketingEventGetResponseDto[] {
        return plainToInstance(
            MarketingEventGetResponseDto,
            events.map(event => ({
                ...event,
                orderId: event.order?.id ?? null,
                productGroupId: event.productGroup?.id ?? null,
            })),
            { excludeExtraneousValues: true }
        );
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
        this.addEvent(
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

    // Each channel's adapter defines its window. Resolved lazily: the
    // platform module already depends on this one.
    private freeMessageWindowHours(
        channel: ENUM_ACCOUNT_TYPE
    ): number | null | undefined {
        const registry = this.moduleRef.get(PlatformAdapterRegistry, {
            strict: false,
        });

        return registry.has(channel)
            ? registry.get(channel).capabilities.freeMessageWindowHours
            : undefined;
    }

    // No message and no order in 120 days; never dormant with neither.
    private isDormant(state: CustomerMarketingStateEntity): boolean {
        const lastActive = this.latest(state.lastInboundAt, state.lastOrderAt);

        return (
            !!lastActive &&
            Date.now() - lastActive.getTime() >
                CUSTOMER_MARKETING_DORMANT_DAYS * DAY_MS
        );
    }

    /**
     * The newest event that set the label to its current value. One request
     * can write two events of a kind in the same millisecond (Khó chịu then
     * permission; first message then stage), and ids are random, so the sort
     * alone cannot pick the one that explains the label. Falls back to the
     * newest event of the kind.
     */
    private async latestEvent(
        customerId: string,
        workspaceId: string,
        kind: ENUM_MARKETING_EVENT_KIND,
        currentValue?: string
    ): Promise<MarketingEventEntity | null> {
        const where = { customer: customerId, workspace: workspaceId, kind };

        const options = {
            order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
        };

        const matching =
            currentValue === undefined
                ? null
                : await this.eventRepository.findOne(
                      { ...where, newValue: currentValue },
                      options
                  );

        return matching ?? this.eventRepository.findOne(where, options);
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
    async assertCustomer(
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
        this.addEvent(
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

    /** Persists, without flushing, one event for the Customer. */
    addEvent(
        target: Pick<CustomerMarketingStateEntity, 'workspace' | 'customer'>,
        kind: ENUM_MARKETING_EVENT_KIND,
        context: IMarketingEventInput,
        em: EntityManager = this.em
    ): void {
        const event = new MarketingEventEntity();
        event.workspace = target.workspace;
        event.customer = target.customer;
        event.kind = kind;
        event.actor = context.actor;
        event.oldValue = context.oldValue;
        event.newValue = context.newValue;
        event.reason = context.reason ?? null;
        event.conversationId = context.conversationId ?? null;
        event.messageId = context.messageId ?? null;

        if (context.orderId) {
            event.order = em.getReference(OrderEntity, context.orderId);
        }

        if (context.productGroupId) {
            event.productGroup = em.getReference(
                ProductGroupEntity,
                context.productGroupId
            );
        }

        if (context.at) event.createdAt = context.at;
        event.trackedLinkId = context.trackedLinkId ?? null;

        if (context.userId) {
            event.createdBy = em.getReference(UserEntity, context.userId);
        }

        em.persist(event);
    }

    /** Forward only, except for an operator. */
    private moveStage(
        state: CustomerMarketingStateEntity,
        stage: ENUM_CUSTOMER_JOURNEY_STAGE,
        context: ICustomerMarketingChangeContext &
            Pick<IMarketingEventInput, 'orderId' | 'productGroupId'>,
        em: EntityManager = this.em
    ): void {
        const from = CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(state.stage);
        const to = CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(stage);

        const allowed =
            to > from ||
            (to < from &&
                context.actor === ENUM_MARKETING_EVENT_ACTOR.OPERATOR);

        if (!allowed) return;
        this.addEvent(
            state,
            ENUM_MARKETING_EVENT_KIND.STAGE,
            { ...context, oldValue: state.stage, newValue: stage },
            em
        );
        state.stage = stage;
    }

    private countConfirmedOrders(
        customerIds: string[],
        em: EntityManager = this.em
    ): Promise<number> {
        return em.count(OrderEntity, {
            customer: { $in: customerIds },
            status: ENUM_ORDER_STATUS.CONFIRMED,
            deletedAt: null,
        });
    }

    private boughtStage(confirmedOrders: number): ENUM_CUSTOMER_JOURNEY_STAGE {
        return confirmedOrders >= 2
            ? ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_REPEAT
            : ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE;
    }

    private latest(a?: Date | null, b?: Date | null): Date | null {
        if (!a || !b) return a ?? b ?? null;

        return a > b ? a : b;
    }

    private mergeLabels(
        loser: CustomerMarketingStateEntity,
        survivor: CustomerMarketingStateEntity,
        context: ICustomerMarketingChangeContext,
        em: EntityManager
    ): void {
        const stageOf = (s: CustomerMarketingStateEntity) =>
            CUSTOMER_JOURNEY_STAGE_ORDER.indexOf(s.stage);

        if (stageOf(loser) > stageOf(survivor)) {
            this.addEvent(
                survivor,
                ENUM_MARKETING_EVENT_KIND.STAGE,
                { ...context, oldValue: survivor.stage, newValue: loser.stage },
                em
            );
            survivor.stage = loser.stage;
        }

        if (loser.hostile && !survivor.hostile) {
            this.addEvent(
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
        survivor.lastInboundAt = this.latest(
            survivor.lastInboundAt,
            loser.lastInboundAt
        );
        survivor.lastOrderAt = this.latest(
            survivor.lastOrderAt,
            loser.lastOrderAt
        );

        if (
            loser.firstTrackedLink &&
            (!survivor.firstSourceAt ||
                (loser.firstSourceAt &&
                    loser.firstSourceAt < survivor.firstSourceAt))
        ) {
            survivor.firstTrackedLink = loser.firstTrackedLink;
            survivor.firstSourceAt = loser.firstSourceAt;
        }
    }

    /**
     * The survivor gets the loser's "Tạm hoãn" rows; on the same group the
     * later date wins. Each change writes a REACTION event on the survivor.
     */
    private async mergeReactions(
        loserId: string,
        survivorId: string,
        workspaceId: string,
        context: ICustomerMarketingChangeContext,
        em: EntityManager
    ): Promise<ICustomerMarketingMergeResult> {
        const result: ICustomerMarketingMergeResult = {
            createdReactions: [],
            replacedReactions: [],
        };

        const rows = await em.find(CustomerProductReactionEntity, {
            customer: { $in: [loserId, survivorId] },
        });

        const target = {
            workspace: em.getReference(WorkspaceEntity, workspaceId),
            customer: em.getReference(CustomerEntity, survivorId),
        };

        const day = (date?: Date | null) =>
            date?.toISOString().slice(0, 10) ?? null;

        const survivorRows = rows.filter(r => r.customer.id === survivorId);

        for (const row of rows.filter(r => r.customer.id === loserId)) {
            const existing = survivorRows.find(
                r => r.productGroup.id === row.productGroup.id
            );

            if (existing && row.until <= existing.until) continue;
            this.addEvent(
                target,
                ENUM_MARKETING_EVENT_KIND.REACTION,
                {
                    ...context,
                    productGroupId: row.productGroup.id,
                    oldValue: day(existing?.until),
                    newValue: day(row.until),
                },
                em
            );

            if (existing) {
                result.replacedReactions.push({
                    id: existing.id,
                    until: existing.until.toISOString(),
                    reason: existing.reason ?? null,
                });
                existing.until = row.until;
                existing.reason = row.reason;
                continue;
            }

            const copy = new CustomerProductReactionEntity();
            copy.workspace = row.workspace;
            copy.customer = target.customer;
            copy.productGroup = row.productGroup;
            copy.until = row.until;
            copy.reason = row.reason;
            em.persist(copy);
            result.createdReactions.push(copy);
        }

        return result;
    }

    private async save(
        state: CustomerMarketingStateEntity
    ): Promise<CustomerMarketingStateEntity> {
        this.em.persist(state);
        await this.em.flush();

        return state;
    }
}
