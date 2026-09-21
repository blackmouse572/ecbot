import { Module } from '@nestjs/common';
import { TurnstileService } from 'src/common/turnstile/services/turnstile.service';

@Module({
    providers: [TurnstileService],
    exports: [TurnstileService],
})
export class TurnstileModule {}
