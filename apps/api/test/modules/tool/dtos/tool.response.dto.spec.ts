import { plainToInstance } from 'class-transformer';
import { ToolResponseDto } from 'src/modules/tool/dtos/response/tool.response.dto';

// #177: the app shows a warning on destructive actions, including ones
// discovered before the flag existed.
describe('ToolResponseDto discoveredActions', () => {
    it('marks each action destructive or not', () => {
        const dto = plainToInstance(
            ToolResponseDto,
            {
                discoveredActions: [
                    { name: 'list_orders', description: 'List orders' },
                    {
                        name: 'delete_all_orders',
                        description: 'Dangerous operation, cannot be undone',
                    },
                ],
            },
            { excludeExtraneousValues: true }
        );

        expect(dto.discoveredActions).toEqual([
            {
                name: 'list_orders',
                description: 'List orders',
                destructive: false,
            },
            {
                name: 'delete_all_orders',
                description: 'Dangerous operation, cannot be undone',
                destructive: true,
            },
        ]);
    });
});
