import { registerAs } from '@nestjs/config';

export default registerAs(
    'helper',
    (): Record<string, any> => ({
        salt: {
            length: 8,
        },
        egress: {
            maxResponseBytes: parseInt(
                process.env.TOOL_EGRESS_MAX_RESPONSE_BYTES ?? '5000000',
                10
            ),
        },
    })
);
