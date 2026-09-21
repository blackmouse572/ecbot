import { IFileRows } from 'src/common/file/interfaces/file.interface';

// Async because the implementation lazy-loads xlsx on first use — see
// FileService.
export interface IFileService {
    writeCsv<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>
    ): Promise<Buffer>;
    writeCsvFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Promise<Buffer>;
    writeExcel<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>[]
    ): Promise<Buffer>;
    writeExcelFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Promise<Buffer>;
    readCsv<T = Record<string, string | number | Date>>(
        file: Buffer
    ): Promise<IFileRows<T>>;
    readCsvFromString<T = Record<string, string | number | Date>>(
        file: string
    ): Promise<IFileRows<T>>;
    readExcel<T = Record<string, string | number | Date>>(
        file: Buffer
    ): Promise<IFileRows<T>[]>;
}
