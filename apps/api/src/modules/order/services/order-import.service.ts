import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { CustomerService } from '@app/modules/customer/services/customer.service';
import { Injectable, Logger } from '@nestjs/common';
import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';
import {
    IOrderImportResult,
    IOrderImportRow,
    OrderImportInvalidReason,
} from '../interfaces/order.interface';
import { ProductGroupEntity } from '../repository/entities/product-group.entity';
import { OrderRepository } from '../repository/repositories/order.repository';
import { OrderService } from './order.service';
import { ProductGroupService } from './product-group.service';

// A row whose number cells parsed.
interface IImportLine {
    name?: string;
    item?: string;
    group?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    status?: IOrderImportRow['status'];
}

interface IImportOrder {
    code?: string;
    firstRow: number;
    rows: IImportLine[];
    phone: string;
    orderedAt?: Date;
}

/**
 * Imports orders from CSV rows the operator already mapped to fields. Rows
 * that share a code are one order with several items. An order whose code
 * already exists in the workspace is skipped, so the same file can be
 * imported twice. A phone with no customer creates one, and a group name with
 * no group creates it. With `dryRun` nothing is written: the counts are the
 * preview the operator sees before importing.
 */
@Injectable()
export class OrderImportService {
    private readonly logger = new Logger(OrderImportService.name);

    constructor(
        private readonly orderService: OrderService,
        private readonly productGroupService: ProductGroupService,
        private readonly orderRepository: OrderRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly customerService: CustomerService
    ) {}

    async import(
        workspaceId: string,
        rows: IOrderImportRow[],
        dryRun: boolean
    ): Promise<IOrderImportResult> {
        const invalidRows: IOrderImportResult['invalidRows'] = [];
        const invalid = (row: number, reason: OrderImportInvalidReason) =>
            invalidRows.push({ row, reason });

        const orders = new Map<string, IImportOrder>();
        rows.forEach((row, index) => {
            const rowNumber = index + 1;
            const phone = row.phone?.trim();
            // A phone cell with no digits ("chưa có") is no phone at all.
            if (!phone || !/\d/.test(phone)) {
                return invalid(rowNumber, 'missingPhone');
            }
            const orderedAt = row.orderedAt
                ? this.parseDate(row.orderedAt)
                : undefined;
            if (orderedAt === null) return invalid(rowNumber, 'badDate');
            const [quantity, unitPrice, total] = [
                row.quantity,
                row.unitPrice,
                row.total,
            ].map(cell => this.parseAmount(cell));
            if ([quantity, unitPrice, total].includes(null) || quantity === 0) {
                return invalid(rowNumber, 'badNumber');
            }
            if (!row.item?.trim() && total === undefined) {
                return invalid(rowNumber, 'empty');
            }
            const line: IImportLine = {
                name: row.name,
                item: row.item,
                group: row.group,
                quantity: quantity ?? undefined,
                unitPrice: unitPrice ?? undefined,
                total: total ?? undefined,
                status: row.status,
            };

            const code = row.code?.trim() || undefined;
            const key = code ?? `#${rowNumber}`;
            const order = orders.get(key);
            if (order) {
                order.rows.push(line);
                return;
            }
            orders.set(key, {
                code,
                firstRow: rowNumber,
                rows: [line],
                phone,
                orderedAt,
            });
        });

        const taken = await this.takenCodes(workspaceId, [...orders.values()]);
        const toCreate = [...orders.values()].filter(
            order => !order.code || !taken.has(order.code)
        );

        const customers = await this.findCustomers(
            workspaceId,
            toCreate.map(order => order.phone)
        );
        const newPhones = new Set(
            toCreate.flatMap(order => {
                const key = this.phoneKey(order.phone);
                return customers.has(key) ? [] : [key];
            })
        );

        const groups = await this.productGroupService.findAll(workspaceId, {});
        const groupsByName = new Map(
            groups.map(group => [this.nameKey(group.name), group])
        );
        // New group names, first spelling wins: "serum" and "Serum" are one.
        const newGroupsByKey = new Map<string, string>();
        for (const row of toCreate.flatMap(order => order.rows)) {
            const name = row.group?.trim();
            const key = name && this.nameKey(name);
            if (!key || groupsByName.has(key) || newGroupsByKey.has(key)) {
                continue;
            }
            newGroupsByKey.set(key, name);
        }
        const newGroups = [...newGroupsByKey.values()];

        const result: IOrderImportResult = {
            dryRun,
            orders: toCreate.length,
            skipped: orders.size - toCreate.length,
            newCustomers: newPhones.size,
            newGroups,
            invalidRows,
        };
        if (dryRun) return result;

        for (const name of newGroups) {
            const group = await this.productGroupService.create(workspaceId, {
                name,
            });
            groupsByName.set(this.nameKey(name), group);
        }

        const touchedGroups = new Set<string>();
        let created = 0;
        for (const order of toCreate) {
            try {
                const customer = await this.customerFor(
                    workspaceId,
                    order,
                    customers
                );
                if (!customer) {
                    invalid(order.firstRow, 'customerLimit');
                    continue;
                }
                const saved = await this.orderService.create(
                    workspaceId,
                    {
                        customerId: customer.id,
                        code: order.code,
                        items: this.items(order, groupsByName),
                        total: order.rows.find(row => row.total !== undefined)
                            ?.total,
                        status:
                            order.rows[0].status ?? ENUM_ORDER_STATUS.CONFIRMED,
                        source: ENUM_ORDER_SOURCE.IMPORT,
                        orderedAt: order.orderedAt,
                    },
                    { refreshCycles: false }
                );
                created++;
                if (saved.status === ENUM_ORDER_STATUS.CONFIRMED) {
                    this.orderService
                        .groupIds(saved)
                        .forEach(id => touchedGroups.add(id));
                }
            } catch (error) {
                this.logger.warn(
                    `Import row ${order.firstRow} failed: ${(error as Error).message}`
                );
                invalid(order.firstRow, 'failed');
            }
        }

        await this.productGroupService.refreshLearnedCycles([...touchedGroups]);
        return { ...result, orders: created };
    }

    private items(
        order: IImportOrder,
        groupsByName: Map<string, ProductGroupEntity>
    ) {
        return order.rows.flatMap(row => {
            const name = row.item?.trim();
            if (!name) return [];
            const group = row.group?.trim()
                ? groupsByName.get(this.nameKey(row.group))
                : undefined;
            return [
                {
                    name,
                    productGroupId: group?.id ?? null,
                    quantity: row.quantity ?? 1,
                    unitPrice: row.unitPrice ?? null,
                },
            ];
        });
    }

    private async takenCodes(
        workspaceId: string,
        orders: IImportOrder[]
    ): Promise<Set<string>> {
        const codes = orders.flatMap(order => (order.code ? [order.code] : []));
        if (!codes.length) return new Set();
        const found = await this.orderRepository.find(
            { workspace: workspaceId, code: { $in: codes } },
            { populate: [] }
        );
        return new Set(found.map(order => order.code));
    }

    /** Existing customers keyed by phoneKey, matched on any way of writing the number. */
    private async findCustomers(
        workspaceId: string,
        phones: string[]
    ): Promise<Map<string, CustomerEntity>> {
        const variants = [
            ...new Set(phones.flatMap(p => this.phoneVariants(p))),
        ];
        const byKey = new Map<string, CustomerEntity>();
        if (!variants.length) return byKey;
        const found = await this.customerRepository.findByWorkspace(
            workspaceId,
            { phone: { $in: variants } },
            { populate: [] }
        );
        for (const customer of found) {
            if (customer.phone)
                byKey.set(this.phoneKey(customer.phone), customer);
        }
        return byKey;
    }

    /** Null when the workspace is at its plan's customer limit. */
    private async customerFor(
        workspaceId: string,
        order: IImportOrder,
        customers: Map<string, CustomerEntity>
    ): Promise<CustomerEntity | null> {
        const key = this.phoneKey(order.phone);
        const known = customers.get(key);
        if (known) return known;
        // Stored as 0 + key so a later file, however it writes the number,
        // finds this customer through phoneVariants.
        const customer = await this.customerService.createFromImport(
            workspaceId,
            {
                phone: key ? `0${key}` : order.phone,
                name: order.rows.find(row => row.name?.trim())?.name?.trim(),
            }
        );
        if (customer) customers.set(key, customer);
        return customer;
    }

    /**
     * Vietnamese numbers come as 0903412885, 84903412885, +84 903 412 885 or,
     * from a spreadsheet that dropped the leading 0, 903412885. All of them
     * reduce to the same key.
     */
    private phoneKey(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('84') && digits.length >= 11) {
            return digits.slice(2);
        }
        return digits.replace(/^0/, '');
    }

    private phoneVariants(phone: string): string[] {
        const key = this.phoneKey(phone);
        if (!key) return [phone.trim()];
        return [phone.trim(), key, `0${key}`, `84${key}`, `+84${key}`];
    }

    /**
     * A whole amount as a shop writes it: "345.000", "1,500,000đ", "2".
     * Undefined for an empty cell, null when it is not a whole number.
     */
    private parseAmount(cell?: string): number | null | undefined {
        const text = cell?.trim();
        if (!text) return undefined;
        const digits = text
            .replace(/\s|đ|₫|vnđ|vnd/gi, '')
            .replace(/[.,](?=\d{3}(\D|$))/g, '');
        return /^\d+$/.test(digits) ? Number(digits) : null;
    }

    private nameKey(name: string): string {
        return name.trim().toLocaleLowerCase('vi');
    }

    /** ISO dates, or dd/mm/yyyy with an optional hh:mm as shops write them. */
    private parseDate(value: string): Date | null {
        const local = value
            .trim()
            .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
        if (!local) {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }
        const [day, month, year, hour, minute] = [1, 2, 3, 4, 5].map(i =>
            Number(local[i] ?? 0)
        );
        const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
        // 31/02 would roll over to March: refuse it instead.
        if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) {
            return null;
        }
        return date;
    }
}
