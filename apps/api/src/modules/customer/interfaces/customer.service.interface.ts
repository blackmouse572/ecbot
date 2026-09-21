import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';
import { ContactPointEntity } from '../repository/entities/contact-point.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';

export interface ICustomerUpdate {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    language?: string | null;
    notes?: string | null;
    profileSummary?: string | null;
}

export interface IResolveContactPoint {
    workspaceId: string;
    platform: ENUM_ACCOUNT_TYPE;
    externalSenderId: string;
}

export interface IResolveContactPointResult {
    contactPoint: ContactPointEntity;
    customerId: string;
    created: boolean;
}

export interface ICustomerService {
    findOneById(id: string): Promise<CustomerEntity | null>;
    findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerEntity[]>;
    update(id: string, patch: ICustomerUpdate): Promise<CustomerEntity>;
    resolveContactPoint(
        params: IResolveContactPoint
    ): Promise<IResolveContactPointResult>;
    mapGet(customer: CustomerEntity): CustomerGetResponseDto;
}
