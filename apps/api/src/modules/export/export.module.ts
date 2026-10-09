import { ActivityRepositoryModule } from '@app/modules/activity/repository/activity.repository.module';
import { CustomerRepositoryModule } from '@app/modules/customer/repository/customer.repository.module';
import { SessionRepositoryModule } from '@app/modules/session/repository/session.repository.module';
import { WorkspaceRepositoryModule } from '@app/modules/workspace/repository/workspace.repository.module';
import { Module } from '@nestjs/common';
import { CustomerDataExportService } from './services/customer-data-export.service';
import { UserDataExportService } from './services/user-data-export.service';

/** Personal data exports (GDPR Art 15, 20). Synchronous JSON. */
@Module({
    imports: [
        ActivityRepositoryModule,
        SessionRepositoryModule,
        WorkspaceRepositoryModule,
        CustomerRepositoryModule,
    ],
    providers: [UserDataExportService, CustomerDataExportService],
    exports: [UserDataExportService, CustomerDataExportService],
})
export class ExportModule {}
