import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { ActivityCreateByAdminResponse } from 'src/modules/activity/dtos/request/activity.create-by-admin.response.dto';
import { ActivityCreateRequest } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import {
    IActivityDoc,
    IActivityEntity,
} from 'src/modules/activity/interfaces/activity.interface';
import { ActivityDoc } from 'src/modules/activity/repository/entities/activity.entity';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

export interface IActivityService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<ActivityDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<ActivityDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createByUser(
        user: UserEntity,
        body: ActivityCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createByAdmin(
        user: UserEntity,
        body: ActivityCreateByAdminResponse,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createView(
        userId: string,
        workspace: WorkspaceEntity,
        subject: ENUM_POLICY_SUBJECT,
        metadata: Record<string, any>
    ): Promise<ActivityDoc>;
    mapList(
        userHistories: IActivityDoc[] | IActivityEntity[]
    ): ActivityListResponseDto[];
}
