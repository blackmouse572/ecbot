import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    NotificationPriority,
    NotificationType,
} from '@app/modules/notification/enums/notification.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../enums/customer.enum';
import { ContactPointEntity } from '../repository/entities/contact-point.entity';
import { CustomerMergeSuggestionEntity } from '../repository/entities/customer-merge-suggestion.entity';
import { CustomerTagAssignmentEntity } from '../repository/entities/customer-tag-assignment.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { ContactPointRepository } from '../repository/repositories/contact-point.repository';
import { CustomerMergeSuggestionRepository } from '../repository/repositories/customer-merge-suggestion.repository';
import { CustomerTagAssignmentRepository } from '../repository/repositories/customer-tag-assignment.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';

export interface IDetectAndUpsertInput {
    workspaceId: string;
    customerId: string;
    field: 'phone' | 'email';
    value: string | null | undefined;
}

export type CustomerFieldKey =
    | 'name'
    | 'phone'
    | 'email'
    | 'language'
    | 'notes'
    | 'profileSummary';

export type FieldResolutionSide = 'A' | 'B';

export interface IConfirmMergeInput {
    survivorId: string;
    fieldResolutions?: Partial<Record<CustomerFieldKey, FieldResolutionSide>>;
}

export interface IListByWorkspaceParams {
    status?: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS;
    page?: number;
    perPage?: number;
}

const COPYABLE_FIELDS: CustomerFieldKey[] = [
    'name',
    'phone',
    'email',
    'language',
    'notes',
    'profileSummary',
];

@Injectable()
export class CustomerMergeSuggestionService {
    private readonly logger = new Logger(CustomerMergeSuggestionService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly suggestionRepository: CustomerMergeSuggestionRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly contactPointRepository: ContactPointRepository,
        private readonly tagAssignmentRepository: CustomerTagAssignmentRepository,
        private readonly notificationService: NotificationService,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository
    ) {}

    /**
     * Called from the `_onContactFieldChanged` hook in CustomerService.
     * Looks up other live Customers in the same workspace with the same phone
     * or email value; for each collision, idempotently upserts a PENDING
     * suggestion (canonicalized by sorted ids), and notifies operators on
     * first creation. Returns the list of created/updated suggestions.
     */
    async detectAndUpsert(
        input: IDetectAndUpsertInput
    ): Promise<CustomerMergeSuggestionEntity[]> {
        const { workspaceId, customerId, field, value } = input;
        if (!value || !value.trim()) return [];

        // Find candidates: same workspace, same field value, different customer
        // id, not already merged away, not soft-deleted.
        const where: Record<string, any> = {
            workspace: workspaceId,
            id: { $ne: customerId },
            mergedIntoCustomerId: null,
            deletedAt: null,
        };
        where[field] = value;

        const candidates = await this.em.find(CustomerEntity, where as any);
        if (candidates.length === 0) return [];

        const results: CustomerMergeSuggestionEntity[] = [];
        for (const candidate of candidates) {
            const otherId = candidate.id;
            const [aId, bId] = [customerId, otherId].sort();

            const existing = await this.suggestionRepository.findOneByPair(
                workspaceId,
                aId,
                bId,
                field
            );

            if (existing) {
                results.push(existing);
                continue;
            }

            const suggestion = new CustomerMergeSuggestionEntity();
            suggestion.workspace = this.em.getReference(
                WorkspaceEntity,
                workspaceId
            );
            suggestion.customerA = this.em.getReference(CustomerEntity, aId);
            suggestion.customerB = this.em.getReference(CustomerEntity, bId);
            suggestion.matchField = field;
            suggestion.matchValue = value;
            suggestion.status = ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING;

            await this.em.persistAndFlush(suggestion);
            results.push(suggestion);

            // Fire operator notification (best-effort, do not block detection)
            this.notifyOperators(workspaceId, suggestion.id, aId, bId).catch(
                err =>
                    this.logger.error(
                        `Failed to notify operators about suggestion ${suggestion.id}: ${err?.message}`
                    )
            );
        }
        return results;
    }

    async dismiss(
        suggestionId: string,
        workspaceId: string
    ): Promise<CustomerMergeSuggestionEntity> {
        const suggestion = await this.loadSuggestion(suggestionId, workspaceId);
        if (
            suggestion.status !== ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING
        ) {
            throw new BadRequestException({
                message: 'customerMergeSuggestion.error.notPending',
                statusCode: 400,
            });
        }
        suggestion.status = ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED;
        suggestion.resolvedAt = new Date();
        await this.em.persistAndFlush(suggestion);
        return suggestion;
    }

    async confirmMerge(
        suggestionId: string,
        workspaceId: string,
        input: IConfirmMergeInput
    ): Promise<{ survivorId: string; loserId: string }> {
        return this.em.transactional(async tem => {
            const suggestion = await tem.findOne(
                CustomerMergeSuggestionEntity,
                {
                    id: suggestionId,
                    workspace: workspaceId,
                    deletedAt: null,
                } as any,
                { populate: ['customerA', 'customerB'] } as any
            );
            if (!suggestion) {
                throw new NotFoundException({
                    message: 'customerMergeSuggestion.error.notFound',
                    statusCode: 404,
                });
            }
            if (
                suggestion.status !==
                ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING
            ) {
                throw new BadRequestException({
                    message: 'customerMergeSuggestion.error.notPending',
                    statusCode: 400,
                });
            }

            const aId =
                (suggestion.customerA as any).id ?? suggestion.customerA;
            const bId =
                (suggestion.customerB as any).id ?? suggestion.customerB;
            const { survivorId, fieldResolutions } = input;
            if (survivorId !== aId && survivorId !== bId) {
                throw new BadRequestException({
                    message: 'customerMergeSuggestion.error.invalidSurvivor',
                    statusCode: 400,
                });
            }
            const loserId = survivorId === aId ? bId : aId;

            const survivor = await tem.findOne(CustomerEntity, {
                id: survivorId,
            } as any);
            const loser = await tem.findOne(CustomerEntity, {
                id: loserId,
            } as any);
            if (!survivor || !loser) {
                throw new NotFoundException({
                    message: 'customer.error.notFound',
                    statusCode: 404,
                });
            }

            // 1) Apply field resolutions onto survivor
            const survivorPatch: Partial<CustomerEntity> = {};
            if (fieldResolutions) {
                for (const key of COPYABLE_FIELDS) {
                    const side = fieldResolutions[key];
                    if (!side) continue;
                    const sourceValue =
                        side === 'A' && survivorId === aId
                            ? (survivor as any)[key]
                            : side === 'B' && survivorId === bId
                              ? (survivor as any)[key]
                              : (loser as any)[key];
                    (survivorPatch as any)[key] = sourceValue ?? null;
                }
            }
            if (Object.keys(survivorPatch).length > 0) {
                Object.assign(survivor, survivorPatch);
                tem.persist(survivor);
            }

            // 2) Union tag assignments (idempotent)
            const loserAssignments = await tem.find(
                CustomerTagAssignmentEntity,
                {
                    customer: loserId,
                    deletedAt: null,
                } as any,
                { populate: ['tag'] } as any
            );
            const loserTagAssignmentIds: string[] = [];
            // Tag assignments newly created on the survivor during this merge.
            // Tracked so unmerge() can remove them (otherwise the survivor
            // keeps the loser's tags forever — a tag leak).
            const createdSurvivorAssignments: CustomerTagAssignmentEntity[] =
                [];
            for (const assignment of loserAssignments) {
                loserTagAssignmentIds.push(assignment.id);
                const tagId = (assignment.tag as any).id ?? assignment.tag;
                const survivorHas = await tem.findOne(
                    CustomerTagAssignmentEntity,
                    {
                        customer: survivorId,
                        tag: tagId,
                        deletedAt: null,
                    } as any
                );
                if (!survivorHas) {
                    const next = new CustomerTagAssignmentEntity();
                    next.customer = tem.getReference(
                        CustomerEntity,
                        survivorId
                    );
                    next.tag = assignment.tag;
                    tem.persist(next);
                    createdSurvivorAssignments.push(next);
                }
                // Soft-delete loser's assignment
                (assignment as any).deletedAt = new Date();
                (assignment as any).deleted = true;
                tem.persist(assignment);
            }

            // 3) Reparent ContactPoints
            const loserContactPoints = await tem.find(ContactPointEntity, {
                customer: loserId,
                deletedAt: null,
            } as any);
            const loserContactPointIds: string[] = loserContactPoints.map(
                cp => cp.id
            );
            await tem.nativeUpdate(
                ContactPointEntity,
                { customer: loserId } as any,
                {
                    customer: tem.getReference(CustomerEntity, survivorId),
                } as any
            );

            // 4) Soft-delete loser and mark mergedIntoCustomerId
            const loserFieldsSnapshot: Record<string, unknown> = {};
            for (const key of COPYABLE_FIELDS) {
                loserFieldsSnapshot[key] = (loser as any)[key] ?? null;
            }
            (loser as any).mergedIntoCustomerId = survivorId;
            (loser as any).deletedAt = new Date();
            (loser as any).deleted = true;
            tem.persist(loser);

            // 5) Update suggestion. Flush first so the newly-created survivor
            // tag assignments have their DB-generated ids for the snapshot.
            await tem.flush();

            suggestion.status = ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.MERGED;
            suggestion.resolvedAt = new Date();
            suggestion.mergedSurvivorId = survivorId;
            suggestion.mergedLoserId = loserId;
            suggestion.unmergeSnapshot = {
                loserContactPointIds,
                loserTagAssignmentIds,
                survivorTagAssignmentIds: createdSurvivorAssignments.map(
                    a => a.id
                ),
                loserFields: loserFieldsSnapshot,
            };
            tem.persist(suggestion);

            await tem.flush();

            this.logger.log(
                `Merged customer ${loserId} into ${survivorId} (suggestion ${suggestion.id})`
            );

            return { survivorId, loserId };
        });
    }

    async unmerge(
        customerId: string,
        workspaceId: string
    ): Promise<CustomerMergeSuggestionEntity> {
        return this.em.transactional(async tem => {
            // Most-recent MERGED suggestion referencing this customer.
            const suggestion = await tem.findOne(
                CustomerMergeSuggestionEntity,
                {
                    workspace: workspaceId,
                    status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.MERGED,
                    $or: [
                        { mergedSurvivorId: customerId },
                        { mergedLoserId: customerId },
                    ],
                    deletedAt: null,
                } as any,
                { orderBy: { resolvedAt: 'DESC' } as any }
            );
            if (!suggestion) {
                throw new NotFoundException({
                    message: 'customerMergeSuggestion.error.noMergeToUnmerge',
                    statusCode: 404,
                });
            }

            const survivorId = suggestion.mergedSurvivorId!;
            const loserId = suggestion.mergedLoserId!;
            const snapshot = (suggestion.unmergeSnapshot ?? {}) as {
                loserContactPointIds?: string[];
                loserTagAssignmentIds?: string[];
                survivorTagAssignmentIds?: string[];
                loserFields?: Record<string, unknown>;
            };

            const loser = await tem.findOne(CustomerEntity, {
                id: loserId,
            } as any);
            if (!loser) {
                throw new NotFoundException({
                    message: 'customer.error.notFound',
                    statusCode: 404,
                });
            }

            // 1) Restore loser
            (loser as any).mergedIntoCustomerId = null;
            (loser as any).deletedAt = null;
            (loser as any).deleted = false;
            // Optionally restore fields from snapshot (only those that were
            // captured — leaves anything else untouched).
            if (snapshot.loserFields) {
                for (const key of COPYABLE_FIELDS) {
                    if (key in snapshot.loserFields) {
                        (loser as any)[key] =
                            (snapshot.loserFields as any)[key] ?? null;
                    }
                }
            }
            tem.persist(loser);

            // 2) Reparent ContactPoints back using snapshot
            if (
                snapshot.loserContactPointIds &&
                snapshot.loserContactPointIds.length > 0
            ) {
                await tem.nativeUpdate(
                    ContactPointEntity,
                    { id: { $in: snapshot.loserContactPointIds } } as any,
                    {
                        customer: tem.getReference(CustomerEntity, loserId),
                    } as any
                );
            }

            // 3) Restore the loser's tag assignments that the merge soft-deleted.
            if (
                snapshot.loserTagAssignmentIds &&
                snapshot.loserTagAssignmentIds.length > 0
            ) {
                await tem.nativeUpdate(
                    CustomerTagAssignmentEntity,
                    { id: { $in: snapshot.loserTagAssignmentIds } } as any,
                    { deletedAt: null, deleted: false } as any
                );
            }

            // 3b) Remove the tag assignments the merge created on the survivor,
            // otherwise the survivor keeps the loser's tags after unmerge.
            if (
                snapshot.survivorTagAssignmentIds &&
                snapshot.survivorTagAssignmentIds.length > 0
            ) {
                await tem.nativeUpdate(
                    CustomerTagAssignmentEntity,
                    { id: { $in: snapshot.survivorTagAssignmentIds } } as any,
                    { deletedAt: new Date(), deleted: true } as any
                );
            }

            // 4) Flip suggestion to DISMISSED (so it doesn't re-surface)
            suggestion.status = ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED;
            suggestion.resolvedAt = new Date();
            tem.persist(suggestion);

            await tem.flush();

            this.logger.log(
                `Unmerged customer ${loserId} from ${survivorId} (suggestion ${suggestion.id})`
            );
            return suggestion;
        });
    }

    async listByWorkspace(
        workspaceId: string,
        params: IListByWorkspaceParams = {}
    ): Promise<{
        data: CustomerMergeSuggestionEntity[];
        page: number;
        perPage: number;
        totalData: number;
    }> {
        const status =
            params.status ?? ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING;
        const page = Math.max(1, params.page ?? 1);
        const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
        const offset = (page - 1) * perPage;

        const where: Record<string, any> = {
            workspace: workspaceId,
            status,
            deletedAt: null,
        };

        const [data, totalData] = await Promise.all([
            this.em.find(CustomerMergeSuggestionEntity, where as any, {
                limit: perPage,
                offset,
                orderBy: { createdAt: 'DESC' } as any,
                populate: ['customerA', 'customerB'] as any,
            }),
            this.em.count(CustomerMergeSuggestionEntity, where as any),
        ]);

        return { data, page, perPage, totalData };
    }

    async findOne(
        id: string,
        workspaceId: string
    ): Promise<CustomerMergeSuggestionEntity> {
        return this.loadSuggestion(id, workspaceId);
    }

    async findPendingCustomerIdsByWorkspace(
        workspaceId: string
    ): Promise<string[]> {
        return this.suggestionRepository.findPendingCustomerIdsByWorkspace(
            workspaceId
        );
    }

    private async loadSuggestion(
        id: string,
        workspaceId: string
    ): Promise<CustomerMergeSuggestionEntity> {
        const suggestion = await this.em.findOne(
            CustomerMergeSuggestionEntity,
            {
                id,
                workspace: workspaceId,
                deletedAt: null,
            } as any,
            { populate: ['customerA', 'customerB'] } as any
        );
        if (!suggestion) {
            throw new NotFoundException({
                message: 'customerMergeSuggestion.error.notFound',
                statusCode: 404,
            });
        }
        return suggestion;
    }

    private async notifyOperators(
        workspaceId: string,
        suggestionId: string,
        customerAId: string,
        customerBId: string
    ): Promise<void> {
        try {
            const members =
                await this.workspaceMemberRepository.findActiveByWorkspace(
                    workspaceId
                );
            if (!members || members.length === 0) return;

            await Promise.all(
                members.map(member =>
                    this.notificationService
                        .create({
                            title: 'Possible duplicate customer',
                            message:
                                'A customer was updated with a phone or email that matches another customer. Review the merge suggestion.',
                            type: NotificationType.INFO,
                            priority: NotificationPriority.MEDIUM,
                            recipient: member.user.id,
                            metadata: {
                                actionUrl: `/customers/suggestions`,
                                actionText: 'Review',
                                data: {
                                    suggestionId,
                                    workspaceId,
                                    customerAId,
                                    customerBId,
                                },
                            },
                        })
                        .catch(err =>
                            this.logger.error(
                                `Failed to notify member ${member.user.id}: ${err?.message}`
                            )
                        )
                )
            );
        } catch (err: any) {
            this.logger.error(
                `notifyOperators failed for workspace ${workspaceId}: ${err?.message}`
            );
        }
    }
}
