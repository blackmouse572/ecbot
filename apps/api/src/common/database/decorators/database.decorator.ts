import { FilterQuery } from '@mikro-orm/core';
import { IDatabaseQueryContainOptions } from 'src/common/database/interfaces/database.interface';

export function expandDatabaseField(
    field: string,
    value: unknown
): Record<string, any> {
    if (!field.includes('.')) {
        return { [field]: value };
    }
    const parts = field.split('.');
    const result: Record<string, any> = {};
    let cursor = result;
    for (let i = 0; i < parts.length - 1; i++) {
        cursor[parts[i]] = {};
        cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
    return result;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function DatabaseHelperQueryContain(
    field: string,
    value: string,
    options?: IDatabaseQueryContainOptions
): FilterQuery<any> {
    const escapedValue = escapeRegExp(value);
    const regex = options?.fullWord
        ? new RegExp(`\\b${escapedValue}\\b`)
        : new RegExp(escapedValue);
    return expandDatabaseField(field, regex);
}
