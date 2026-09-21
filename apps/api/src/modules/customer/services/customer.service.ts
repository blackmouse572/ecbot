import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';
import {
    ICustomerService,
    ICustomerUpdate,
    IResolveContactPoint,
    IResolveContactPointResult,
} from '../interfaces/customer.service.interface';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { ContactPointRepository } from '../repository/repositories/contact-point.repository';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { CustomerMergeSuggestionService } from './customer-merge-suggestion.service';

@Injectable()
export class CustomerService implements ICustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly contactPointRepository: ContactPointRepository,
        private readonly moduleRef: ModuleRef
    ) {}

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CustomerEntity | null> {
        return this.customerRepository.findOneById(id, options);
    }

    /**
     * Look up a customer by id AND workspace. Returns null if the customer
     * does not exist OR belongs to a different workspace — so callers can
     * collapse "not found" and "cross-workspace access" into a single 404
     * (BOLA prevention).
     */
    async findOneByIdInWorkspace(
        id: string,
        workspaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CustomerEntity | null> {
        return this.customerRepository.findOne(
            { id, workspace: workspaceId } as any,
            options
        );
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerEntity[]> {
        return this.customerRepository.findByWorkspace(
            workspaceId,
            find,
            options
        );
    }

    async update(
        id: string,
        patch: ICustomerUpdate,
        workspaceId?: string
    ): Promise<CustomerEntity> {
        // BOLA guard: when a workspaceId is provided (always the case from
        // workspace-scoped controllers), refuse to update a customer that
        // lives in another workspace. Collapse to 404 to avoid leaking
        // existence to outsiders.
        const customer = workspaceId
            ? await this.findOneByIdInWorkspace(id, workspaceId)
            : await this.customerRepository.findOneById(id);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        const updated = await this.customerRepository.updateEntity(
            { id },
            patch as any
        );

        if (!updated) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        // Operator-edit path: when phone/email is touched, fire the contact
        // field changed hook so #169 match detection can pick up duplicates.
        // Prefer the caller-provided scope; fall back to the customer's own
        // workspace when update() was called without one.
        const effectiveWorkspaceId =
            workspaceId ??
            (customer.workspace as any)?.id ??
            (customer.workspace as any);
        if (effectiveWorkspaceId) {
            if (patch.phone !== undefined && patch.phone !== null) {
                await this._onContactFieldChanged(
                    id,
                    'phone',
                    patch.phone,
                    effectiveWorkspaceId
                );
            }
            if (patch.email !== undefined && patch.email !== null) {
                await this._onContactFieldChanged(
                    id,
                    'email',
                    patch.email,
                    effectiveWorkspaceId
                );
            }
        }

        return updated;
    }

    async resolveContactPoint(
        params: IResolveContactPoint
    ): Promise<IResolveContactPointResult> {
        const { workspaceId, platform, externalSenderId } = params;

        const existing =
            await this.contactPointRepository.findByWorkspacePlatformSender(
                workspaceId,
                platform,
                externalSenderId
            );

        if (existing) {
            return {
                contactPoint: existing,
                customerId: (existing.customer as any).id,
                created: false,
            };
        }

        // No contact point yet for this (workspace, platform, sender) — create a
        // Customer and a ContactPoint together. The customer name will be
        // populated by the staleness-driven profile fetch later.
        const customer = await this.customerRepository.create({
            workspace: { id: workspaceId } as any,
        });

        const contactPoint = await this.contactPointRepository.create({
            workspace: { id: workspaceId } as any,
            customer: { id: customer.id } as any,
            platform,
            externalSenderId,
        });

        this.logger.debug(
            `Resolved new contact point ${contactPoint.id} for customer ${customer.id} (${platform}/${externalSenderId})`
        );

        return { contactPoint, customerId: customer.id, created: true };
    }

    async updateContactPointProfile(
        contactPointId: string,
        patch: {
            displaySenderName?: string;
            senderAvatar?: string | null;
            fetchedAt: Date;
        }
    ): Promise<void> {
        await this.contactPointRepository.updateEntity(
            { id: contactPointId },
            patch as any
        );
    }

    async fillCustomerNameIfEmpty(
        customerId: string,
        name?: string
    ): Promise<void> {
        if (!name) return;
        const customer = await this.customerRepository.findOneById(customerId);
        if (!customer || customer.name) return;
        await this.customerRepository.updateEntity({ id: customerId }, {
            name,
        } as any);
    }

    /**
     * Merge a single metadata key/value onto the customer. Used by the agent's
     * `setCustomerField` system tool — apps/ai never writes to the DB directly,
     * so all metadata mutations funnel through this service for parity with
     * operator-driven edits.
     *
     * Phone/email writes through this path (key === 'phone' or 'email') emit a
     * contact-field-changed signal that #169 (match detection) will consume.
     */
    async setMetadataField(
        id: string,
        key: string,
        value: string
    ): Promise<CustomerEntity> {
        // Structured, indexed columns (name/phone/email/language) must be
        // written to their own columns — not the metadata JSON — so the UI
        // shows them and #169 match-detection indexes stay current. The agent
        // could mistakenly route one of these through set_customer_field, so
        // funnel them to the structured-profile path defensively.
        const STRUCTURED_KEYS = ['name', 'phone', 'email', 'language'];
        if (STRUCTURED_KEYS.includes(key)) {
            return this.updateProfileFromSystemTool(id, {
                [key]: value,
            } as {
                name?: string;
                phone?: string;
                email?: string;
                language?: string;
            });
        }
        const customer = await this.customerRepository.findOneById(id);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        const nextMetadata: Record<string, unknown> = {
            ...(customer.metadata ?? {}),
            [key]: value,
        };
        const updated = await this.customerRepository.updateEntity({ id }, {
            metadata: nextMetadata,
        } as any);
        if (!updated) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        if (key === 'phone' || key === 'email') {
            const workspaceId =
                (updated.workspace as any)?.id ?? (updated.workspace as any);
            await this._onContactFieldChanged(id, key, value, workspaceId);
        }
        return updated;
    }

    /**
     * Structured-profile patch invoked by the agent's `updateCustomerProfile`
     * system tool. Same shape as the workspace-controller `update` path but
     * scoped to the four operator-allowed columns and emits the
     * contact-field-changed event for phone/email so #169 can match later.
     */
    async updateProfileFromSystemTool(
        id: string,
        patch: {
            name?: string | null;
            phone?: string | null;
            email?: string | null;
            language?: string | null;
        }
    ): Promise<CustomerEntity> {
        // `update()` already fires the contact-field-changed hook for phone +
        // email so we don't double-dispatch here.
        return this.update(id, patch);
    }

    /**
     * Domain event hook for #169 (match detection). Routes to the
     * CustomerMergeSuggestionService which looks up duplicates in the same
     * workspace and idempotently upserts PENDING suggestions.
     */
    private async _onContactFieldChanged(
        customerId: string,
        field: 'phone' | 'email',
        value: string,
        workspaceId: string
    ): Promise<void> {
        try {
            const mergeSuggestionService = this.moduleRef.get(
                CustomerMergeSuggestionService,
                { strict: false }
            );
            await mergeSuggestionService.detectAndUpsert({
                workspaceId,
                customerId,
                field,
                value,
            });
        } catch (err: any) {
            this.logger.error(
                `Match detection failed for customer ${customerId} field ${field}: ${err?.message}`
            );
        }
    }

    mapGet(customer: CustomerEntity): CustomerGetResponseDto {
        return plainToInstance(CustomerGetResponseDto, customer, {
            excludeExtraneousValues: true,
        });
    }

    mapList(customers: CustomerEntity[]): CustomerGetResponseDto[] {
        return customers.map(c => this.mapGet(c));
    }
}
