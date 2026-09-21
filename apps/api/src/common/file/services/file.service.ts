import { Injectable } from '@nestjs/common';
import { IFileRows } from 'src/common/file/interfaces/file.interface';
import { IFileService } from 'src/common/file/interfaces/file.service.interface';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/enums/helper.enum';

// xlsx is ~1.2MB and only ever runs on export/import endpoints. Importing it at
// the top level puts that parse cost on every boot; `await import` moves it to
// the first call. This is why every method here is async.
const xlsx = () => import('xlsx');

@Injectable()
export class FileService implements IFileService {
    async writeCsv<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>
    ): Promise<Buffer> {
        const { utils } = await xlsx();

        const worksheet = utils.json_to_sheet(rows.data);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        // create buffer
        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    async writeCsvFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Promise<Buffer> {
        const { utils } = await xlsx();

        const worksheet = utils.aoa_to_sheet(rows);
        const csv = utils.sheet_to_csv(worksheet, { FS: ';' });

        // create buffer
        const buff: Buffer = Buffer.from(csv, 'utf8');

        return buff;
    }

    async writeExcel<T = Record<string, string | number | Date>>(
        rows: IFileRows<T>[]
    ): Promise<Buffer> {
        const { utils, write } = await xlsx();

        // workbook
        const workbook = utils.book_new();

        for (const [index, row] of rows.entries()) {
            // worksheet
            const worksheet = utils.json_to_sheet(row.data);
            utils.book_append_sheet(
                workbook,
                worksheet,
                row.sheetName ?? `Sheet${index + 1}`
            );
        }

        // create buffer
        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    async writeExcelFromArray<T = Record<string, string | number | Date>>(
        rows: T[][]
    ): Promise<Buffer> {
        const { utils, write } = await xlsx();

        // workbook
        const workbook = utils.book_new();

        // worksheet
        const worksheet = utils.aoa_to_sheet(rows);
        utils.book_append_sheet(workbook, worksheet, `Sheet1`);

        // create buffer
        const buff: Buffer = write(workbook, {
            type: 'buffer',
            bookType: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX,
        });

        return buff;
    }

    async readCsv<T = Record<string, string | number | Date>>(
        file: Buffer
    ): Promise<IFileRows<T>> {
        const { utils, read } = await xlsx();

        // workbook
        const workbook = read(file, {
            type: 'buffer',
        });

        // worksheet
        const worksheetsName: string = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetsName];
        const rows: T[] = utils.sheet_to_json(worksheet);

        return {
            data: rows,
            sheetName: worksheetsName,
        };
    }

    async readCsvFromString<T = Record<string, string | number | Date>>(
        file: string
    ): Promise<IFileRows<T>> {
        const { utils, read } = await xlsx();

        // workbook
        const workbook = read(file, {
            type: 'string',
        });

        // worksheet
        const worksheetsName: string = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetsName];
        const rows: T[] = utils.sheet_to_json(worksheet);

        return {
            data: rows,
            sheetName: worksheetsName,
        };
    }

    async readExcel<T = Record<string, string | number | Date>>(
        file: Buffer
    ): Promise<IFileRows<T>[]> {
        const { utils, read } = await xlsx();

        // workbook
        const workbook = read(file, {
            type: 'buffer',
        });

        // worksheet
        const worksheetsName: string[] = workbook.SheetNames;
        const sheets: IFileRows[] = [];

        for (let i = 0; i < worksheetsName.length; i++) {
            const worksheet = workbook.Sheets[worksheetsName[i]];

            // rows
            const rows: T[] = utils.sheet_to_json(worksheet);

            sheets.push({
                data: rows,
                sheetName: worksheetsName[i],
            });
        }

        return sheets;
    }
}
