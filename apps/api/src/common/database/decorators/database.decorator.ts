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

export function DatabaseHelperQueryContain(
    field: string,
    value: string,
    options?: IDatabaseQueryContainOptions
): FilterQuery<any> {
    const regex = options?.fullWord
        ? new RegExp(`\\b${value}\\b`)
        : new RegExp(value);
    return expandDatabaseField(field, regex);
}
