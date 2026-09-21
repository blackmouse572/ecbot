export interface IDatabaseService {
    filterEqual<T = string>(field: string, filterValue: T): Record<string, any>;
    filterNotEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, any>;
    filterContain(field: string, filterValue: string): Record<string, any>;
    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, any>;
    filterIn<T = string>(field: string, filterValue: T[]): Record<string, any>;
    filterNin<T = string>(field: string, filterValue: T[]): Record<string, any>;
    filterDateBetween(
        fieldStart: string,
        fieldEnd: string,
        filterStartValue: Date,
        filterEndValue: Date
    ): Record<string, any>;
}
