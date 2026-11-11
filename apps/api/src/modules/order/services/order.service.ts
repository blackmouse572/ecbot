import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { CustomerMarketingService } from '@app/modules/customer/services/customer-marketing.service';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { randomInt } from 'node:crypto';
import {
    ORDER_CODE_ALPHABET,
    ORDER_CODE_ATTEMPTS,
    ORDER_CODE_PREFIX,
    ORDER_DEFAULT_CURRENCY,
} from '../constants/order.constant';
import { OrderGetResponseDto } from '../dtos/response/order.get.response.dto';
import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';
import {
    IOrderChatDraft,
    IOrderCreate,
    IOrderCreateOptions,
    IOrderItemInput,
    IOrderUpdate,
} from '../interfaces/order.interface';
import { OrderEntity } from '../repository/entities/order.entity';
import { OrderRepository } from '../repository/repositories/order.repository';
import { ProductGroupRepository } from '../repository/repositories/product-group.repository';
import { ProductGroupService } from './product-group.service';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly productGroupRepository: ProductGroupRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly productGroupService: ProductGroupService,
        private readonly customerMarketingService: CustomerMarketingService
    ) {}

    findAll(
        workspaceId: string,
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<OrderEntity[]> {
        return this.orderRepository.find(
            { ...find, workspace: workspaceId, deletedAt: null },
            options
        );
    }

    getTotal(workspaceId: string, find: Record<string, any>): Promise<number> {
        return this.orderRepository.getTotal({
            ...find,
            workspace: workspaceId,
            deletedAt: null,
        });
    }

    async findOneInWorkspaceOrFail(
        id: string,
        workspaceId: string
    ): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            id,
            workspace: workspaceId,
            deletedAt: null,
        });
        if (!order) {
            throw new NotFoundException({
                message: 'order.error.notFound',
                statusCode: 404,
            });
        }
        return order;
    }

    async create(
        workspaceId: string,
        input: IOrderCreate,
        options: IOrderCreateOptions = {}
    ): Promise<OrderEntity> {
        const customer = await this.customerRepository.findOne({
            id: input.customerId,
            workspace: workspaceId,
            deletedAt: null,
        } as any);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        await this.assertGroupsInWorkspace(workspaceId, input.items);

        const code = input.code
            ? await this.assertCodeFree(workspaceId, input.code)
            : await this.generateCode(workspaceId);

        const order = await this.orderRepository.create({
            workspace: workspaceId as any,
            customer,
            code,
            total: this.resolveTotal(input.items, input.total),
            currency: input.currency ?? ORDER_DEFAULT_CURRENCY,
            status: ENUM_ORDER_STATUS.PENDING,
            source: input.source,
            orderedAt: input.orderedAt ?? new Date(),
            note: input.note,
            conversationId: input.conversationId,
            items: input.items.map(item => ({
                name: item.name,
                productGroup: (item.productGroupId ?? undefined) as any,
                quantity: item.quantity,
                unitPrice: item.unitPrice ?? undefined,
            })) as any,
        });

        return input.status === ENUM_ORDER_STATUS.CONFIRMED
            ? this.markConfirmed(order, options.refreshCycles ?? true)
            : order;
    }

    /**
     * The bot noted an order the customer confirmed in chat. It stays PENDING
     * until staff confirm it, and a later note in the same conversation
     * replaces the draft instead of adding a second order. Items get the
     * product group their name matches.
     */
    async recordChatDraft(
        customerId: string,
        input: IOrderChatDraft
    ): Promise<OrderEntity> {
        const customer = await this.customerRepository.findOne({
            id: customerId,
            deletedAt: null,
        } as any);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        const workspaceId = customer.workspace.id;
        const groups = await this.productGroupService.findAll(workspaceId, {});
        const items = input.items.map(item => ({
            ...item,
            productGroupId:
                this.productGroupService.matchItemName(item.name, groups)?.id ??
                null,
        }));

        const draft = input.conversationId
            ? await this.orderRepository.findOne({
                  workspace: workspaceId,
                  conversationId: input.conversationId,
                  status: ENUM_ORDER_STATUS.PENDING,
                  source: ENUM_ORDER_SOURCE.CHAT,
                  deletedAt: null,
              })
            : null;
        if (draft) {
            return this.update(draft.id, workspaceId, {
                items,
                total: input.total,
                note: input.note,
            });
        }
        return this.create(workspaceId, {
            customerId,
            items,
            total: input.total,
            note: input.note,
            conversationId: input.conversationId,
            status: ENUM_ORDER_STATUS.PENDING,
            source: ENUM_ORDER_SOURCE.CHAT,
        });
    }

    async update(
        id: string,
        workspaceId: string,
        input: IOrderUpdate
    ): Promise<OrderEntity> {
        const order = await this.findOneInWorkspaceOrFail(id, workspaceId);
        if (order.status === ENUM_ORDER_STATUS.CANCELLED) {
            throw new BadRequestException({
                message: 'order.error.cancelled',
                statusCode: 400,
            });
        }

        if (input.code !== undefined && input.code !== order.code) {
            order.code = await this.assertCodeFree(
                workspaceId,
                input.code,
                order.id
            );
        }
        if (input.orderedAt !== undefined) order.orderedAt = input.orderedAt;
        if (input.note !== undefined) order.note = input.note ?? undefined;

        const groupsBefore = this.groupIds(order);
        if (input.items) {
            await this.assertGroupsInWorkspace(workspaceId, input.items);
            await this.orderRepository.replaceItems(order, input.items);
        }
        // New items recompute the total only when they carry prices, so
        // replacing the items of an order known by its total keeps it.
        if (input.total !== undefined) {
            order.total = input.total;
        } else if (input.items?.some(item => item.unitPrice !== undefined)) {
            order.total = this.resolveTotal(input.items);
        }

        const saved = await this.orderRepository.save(order);
        if (saved.status === ENUM_ORDER_STATUS.CONFIRMED) {
            await this.productGroupService.refreshLearnedCycles([
                ...groupsBefore,
                ...this.groupIds(saved),
            ]);
        }
        return saved;
    }

    /** The only path to CONFIRMED: a confirmed order counts as a purchase. */
    async confirm(id: string, workspaceId: string): Promise<OrderEntity> {
        const order = await this.findOneInWorkspaceOrFail(id, workspaceId);
        if (order.status !== ENUM_ORDER_STATUS.PENDING) {
            throw new BadRequestException({
                message: 'order.error.notPending',
                statusCode: 400,
            });
        }
        return this.markConfirmed(order);
    }

    async cancel(id: string, workspaceId: string): Promise<OrderEntity> {
        const order = await this.findOneInWorkspaceOrFail(id, workspaceId);
        if (order.status === ENUM_ORDER_STATUS.CANCELLED) {
            throw new BadRequestException({
                message: 'order.error.cancelled',
                statusCode: 400,
            });
        }
        const wasConfirmed = order.status === ENUM_ORDER_STATUS.CONFIRMED;
        order.status = ENUM_ORDER_STATUS.CANCELLED;
        const saved = await this.orderRepository.save(order);
        if (wasConfirmed) {
            await this.productGroupService.refreshLearnedCycles(
                this.groupIds(saved)
            );
        }
        return saved;
    }

    /**
     * Runs after an order becomes CONFIRMED: moves the customer to Mua 1 lần
     * or Mua nhiều lần. The order is already saved, so a failure here is
     * logged and the confirmation still succeeds.
     */
    async onConfirmed(order: OrderEntity): Promise<void> {
        try {
            await this.customerMarketingService.onOrderConfirmed(order);
        } catch (error: unknown) {
            this.logger.error(
                `Journey stage not updated for order ${order.id}`,
                error instanceof Error ? error.stack : String(error)
            );
        }
    }

    mapGet(order: OrderEntity): OrderGetResponseDto {
        return plainToInstance(
            OrderGetResponseDto,
            {
                ...order,
                customerId: order.customer?.id,
                customerName: order.customer?.name ?? null,
                customerPhone: order.customer?.phone ?? null,
                items: order.items.getItems().map(item => ({
                    id: item.id,
                    name: item.name,
                    productGroupId: item.productGroup?.id ?? null,
                    productGroupName: item.productGroup?.name ?? null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice ?? null,
                })),
            },
            { excludeExtraneousValues: true }
        );
    }

    mapList(orders: OrderEntity[]): OrderGetResponseDto[] {
        return orders.map(order => this.mapGet(order));
    }

    private async markConfirmed(
        order: OrderEntity,
        refreshCycles = true
    ): Promise<OrderEntity> {
        order.status = ENUM_ORDER_STATUS.CONFIRMED;
        order.confirmedAt = new Date();
        const saved = await this.orderRepository.save(order);
        if (refreshCycles) {
            await this.productGroupService.refreshLearnedCycles(
                this.groupIds(saved)
            );
        }
        await this.onConfirmed(saved);
        return saved;
    }

    // A given total wins (an import may only know the total); otherwise the
    // sum of the priced items.
    private resolveTotal(items: IOrderItemInput[], total?: number): number {
        if (total !== undefined) return total;
        return items.reduce(
            (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
            0
        );
    }

    groupIds(order: OrderEntity): string[] {
        return order.items
            .getItems()
            .flatMap(item => (item.productGroup ? [item.productGroup.id] : []));
    }

    private async assertGroupsInWorkspace(
        workspaceId: string,
        items: IOrderItemInput[]
    ): Promise<void> {
        const ids = [
            ...new Set(
                items.flatMap(item =>
                    item.productGroupId ? [item.productGroupId] : []
                )
            ),
        ];
        if (!ids.length) return;
        const found = await this.productGroupRepository.find(
            { id: { $in: ids }, workspace: workspaceId },
            { populate: [] }
        );
        if (found.length !== ids.length) {
            throw new BadRequestException({
                message: 'order.productGroup.error.notFound',
                statusCode: 400,
            });
        }
    }

    private async assertCodeFree(
        workspaceId: string,
        code: string,
        excludeId?: string
    ): Promise<string> {
        const taken = await this.orderRepository.exists(
            { workspace: workspaceId, code },
            { excludeId }
        );
        if (taken) {
            throw new ConflictException({
                message: 'order.error.codeExists',
                statusCode: 409,
            });
        }
        return code;
    }

    private async generateCode(workspaceId: string): Promise<string> {
        const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        for (let attempt = 0; attempt < ORDER_CODE_ATTEMPTS; attempt++) {
            const suffix = Array.from(
                { length: 4 },
                () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)]
            ).join('');
            const code = `${ORDER_CODE_PREFIX}-${date}-${suffix}`;
            const taken = await this.orderRepository.exists({
                workspace: workspaceId,
                code,
            });
            if (!taken) return code;
        }
        throw new ConflictException({
            message: 'order.error.codeExists',
            statusCode: 409,
        });
    }
}
