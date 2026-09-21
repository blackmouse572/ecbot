import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { RequestCreateDto } from '../dtos/request/requests.create.request';
import { RequestDoc } from '../repository/entities/requests.entity';

export interface IRequestService {
    findOneById(id: string): Promise<RequestDoc>;
    create(
        requestFrom: UserEntity,
        data: RequestCreateDto,
        workspace?: WorkspaceEntity
    ): Promise<RequestDoc>;
    validateRequest(requestFrom: string, data: RequestCreateDto): Promise<void>;
    approve(requestId: string, workspace: WorkspaceEntity): Promise<void>;
}
