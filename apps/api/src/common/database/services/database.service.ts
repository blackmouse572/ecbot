import { Injectable } from '@nestjs/common';
import {
    DatabaseHelperQueryContain,
    expandDatabaseField,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseService } from 'src/common/database/interfaces/database.service.interface';

@Injectable()
export class DatabaseService implements IDatabaseService {
    constructor() {}

    filterEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, any> {
        return expandDatabaseField(field, { $eq: filterValue });
    }

    filterNotEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, any> {
        return expandDatabaseField(field, { $ne: filterValue });
    }

    filterContain(field: string, filterValue: string): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue);
    }

    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue, {
            fullWord: true,
        });
    }

    filterIn<T = string>(field: string, filterValue: T[]): Record<string, any> {
        return expandDatabaseField(field, { $in: filterValue });
    }

    filterContainInArray(
        field: string,
        filterValue: string[]
    ): Record<string, any> {
        return expandDatabaseField(field, { $in: filterValue });
    }

    filterNin<T = string>(
        field: string,
        filterValue: T[]
    ): Record<string, any> {
        return expandDatabaseField(field, { $nin: filterValue });
    }

    filterDateBetween(
        fieldStart: string,
        fieldEnd: string,
        filterStartValue: Date,
        filterEndValue: Date
    ): Record<string, any> {
        if (fieldStart === fieldEnd) {
            return expandDatabaseField(fieldStart, {
                $gte: filterStartValue,
                $lte: filterEndValue,
            });
        }

        return {
            ...expandDatabaseField(fieldStart, {
                $gte: filterStartValue,
            }),
            ...expandDatabaseField(fieldEnd, {
                $lte: filterEndValue,
            }),
        };
    }

    filterDateComparison(
        field: string,
        operations: Record<string, Date>
    ): Record<string, any> {
        const validOperators = ['$gte', '$lte', '$gt', '$lt'];
        const filteredOperations: Record<string, Date> = {};

        // Filter to only include valid operators
        for (const [operator, value] of Object.entries(operations)) {
            if (validOperators.includes(operator) && value) {
                filteredOperations[operator] = value;
            }
        }

        if (Object.keys(filteredOperations).length === 0) {
            return {};
        }

        return expandDatabaseField(field, filteredOperations);
    }
}
