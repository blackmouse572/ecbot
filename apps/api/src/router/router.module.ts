import { Module } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { RoutesClientModule } from 'src/router/routes/routes.client.module';
import { RoutesPublicModule } from 'src/router/routes/routes.public.module';
import { RoutesSharedModule } from 'src/router/routes/routes.shared.module';
import { RoutesSystemModule } from 'src/router/routes/routes.system.module';
import { RoutesTasksModule } from 'src/router/routes/routes.tasks.module';
import { RoutesUserModule } from 'src/router/routes/routes.user.module';
import { RoutesWorkspaceModule } from './routes/routes.workspace.module';

@Module({
    providers: [],
    exports: [],
    controllers: [],
    imports: [
        RoutesPublicModule,
        RoutesSystemModule,
        RoutesTasksModule,
        RoutesUserModule,
        RoutesAdminModule,
        RoutesSharedModule,
        RoutesWorkspaceModule,
        RoutesClientModule,
        NestJsRouterModule.register([
            {
                path: '/public',
                module: RoutesPublicModule,
            },
            {
                path: '/system',
                module: RoutesSystemModule,
            },
            {
                path: '/system',
                module: RoutesTasksModule,
            },
            {
                path: '/admin',
                module: RoutesAdminModule,
            },
            {
                path: '/user',
                module: RoutesUserModule,
            },
            {
                path: '/shared',
                module: RoutesSharedModule,
            },
            {
                path: '/workspace',
                module: RoutesWorkspaceModule,
            },
            {
                path: '/client',
                module: RoutesClientModule,
            },
        ]),
    ],
})
export class RouterModule {}
