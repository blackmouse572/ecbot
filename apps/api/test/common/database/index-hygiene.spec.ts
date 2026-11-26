import { readFileSync } from 'fs';
import { join } from 'path';

// Every index costs a write on each insert, and an index on a column that an
// update changes stops Postgres from doing a cheap in-place (HOT) update. In
// November 2026, 356 of the 527 prod indexes had never been scanned. Most were
// the base entity's `deleted` and `updated_at` indexes, plus plain indexes that
// a unique or composite index already covers. This reads the committed schema
// snapshot (what migrations build) so a new one cannot come back unnoticed.
interface ISnapshotIndex {
    keyName: string;
    columnNames: string[];
    unique: boolean;
    primary: boolean;
    expression?: string;
}

interface ISnapshotTable {
    name: string;
    indexes: ISnapshotIndex[];
}

const SNAPSHOT = join(__dirname, '../../../migrations/.snapshot-neondb.json');
const tables: ISnapshotTable[] = JSON.parse(
    readFileSync(SNAPSHOT, 'utf8')
).tables;

// A partial or expression index answers other queries than its columns say.
const plainIndexes = (table: ISnapshotTable) =>
    table.indexes.filter(
        index => !index.expression && index.columnNames.length
    );

const startsWith = (columns: string[], prefix: string[]) =>
    prefix.every((column, i) => columns[i] === column);

describe('index hygiene (schema snapshot)', () => {
    it('has no single-column index on deleted or updated_at', () => {
        const found = tables.flatMap(table =>
            plainIndexes(table)
                .filter(index => !index.primary && !index.unique)
                .filter(
                    ({ columnNames }) =>
                        columnNames.length === 1 &&
                        ['deleted', 'updated_at'].includes(columnNames[0])
                )
                .map(index => index.keyName)
        );

        expect(found).toEqual([]);
    });

    it('has no plain index that another index on the same table already covers', () => {
        const found = tables.flatMap(table => {
            const indexes = plainIndexes(table);
            return indexes
                .filter(index => !index.primary && !index.unique)
                .filter(index =>
                    indexes.some(
                        other =>
                            other !== index &&
                            startsWith(other.columnNames, index.columnNames) &&
                            (other.columnNames.length >
                                index.columnNames.length ||
                                other.unique ||
                                other.primary)
                    )
                )
                .map(index => index.keyName);
        });

        expect(found).toEqual([]);
    });

    // The inbox polls a conversation's newest messages every 5 s. Without this
    // index Postgres walks the global date_sent index backwards and filters, so
    // an older conversation costs a scan over every newer message.
    it('indexes messages by conversation and send time', () => {
        const messages = tables.find(table => table.name === 'messages')!;

        expect(
            plainIndexes(messages).some(index =>
                startsWith(index.columnNames, ['conversation_id', 'date_sent'])
            )
        ).toBe(true);
    });
});
