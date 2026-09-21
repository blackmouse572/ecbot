import { DynamicModule, Global, Module } from '@nestjs/common';
import { ComposioApi } from './composio-api.service';

@Global()
@Module({})
export class ComposioModule {
    static forRoot(): DynamicModule {
        return {
            module: ComposioModule,
            providers: [ComposioApi],
            exports: [ComposioApi],
            controllers: [],
            imports: [],
        };
    }
}
