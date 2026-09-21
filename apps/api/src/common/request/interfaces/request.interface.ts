import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Request } from 'express';
import { ResponsePagingMetadataPaginationRequestDto } from 'src/common/response/dtos/response.paging.dto';
import { ApiKeyPayloadDto } from 'src/modules/api-key/dtos/api-key.payload.dto';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    apiKey?: ApiKeyPayloadDto;
    user?: T;

    __user?: UserEntity;
    __workspace?: WorkspaceEntity;
    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationRequestDto;
}
