import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import {
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsString,
    MinLength,
} from 'class-validator';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { REQUEST_STATUS, REQUEST_TYPE } from '../../constant/requests.constant';

export const RequestTableName = 'requests';

@Entity({ tableName: RequestTableName })
@Index({ properties: ['type'] })
@Index({ properties: ['requestFrom'] })
@Index({ properties: ['requestTo'] })
@Index({ properties: ['status'] })
@Index({ properties: ['workspace'] })
export class RequestEntity extends DatabaseEntityBase {
    @Enum(() => REQUEST_TYPE)
    @IsEnum(REQUEST_TYPE)
    @IsNotEmpty()
    type: REQUEST_TYPE;

    @ManyToOne(() => WorkspaceEntity, { nullable: true })
    workspace?: WorkspaceEntity;

    @ManyToOne(() => UserEntity)
    requestFrom: UserEntity;

    @ManyToOne(() => UserEntity)
    requestTo: UserEntity;

    @Property({ type: 'json', default: '{}' })
    @IsObject()
    payload: Record<string, any> = {};

    @Enum(() => REQUEST_STATUS)
    @IsEnum(REQUEST_STATUS)
    @IsNotEmpty()
    status: REQUEST_STATUS = REQUEST_STATUS.PENDING;

    @Property({ type: 'varchar', length: 500, nullable: true })
    @IsString()
    @MinLength(1)
    reason?: string;

    @ManyToOne(() => UserEntity, { nullable: true })
    processedBy?: UserEntity;

    /**
     * Utility methods for checking request status and type.
     * These methods provide convenient checks for the status and type of the request entity.
     */

    get isPending(): boolean {
        return this.status === REQUEST_STATUS.PENDING;
    }

    get isApproved(): boolean {
        return this.status === REQUEST_STATUS.APPROVED;
    }

    get isRejected(): boolean {
        return this.status === REQUEST_STATUS.REJECTED;
    }

    get isCancelled(): boolean {
        return this.status === REQUEST_STATUS.REJECTED;
    }

    get isJoinWorkspaceRequest(): boolean {
        return this.type === REQUEST_TYPE.JOIN_WORKSPACE;
    }

    get isChangeConfigRequest(): boolean {
        return this.type === REQUEST_TYPE.CHANGE_CONFIG;
    }
}

export type RequestDoc = RequestEntity;
