import { ActivityEntity } from '@app/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from '@app/modules/activity/repository/repositories/activity.repository';
import { SessionEntity } from '@app/modules/session/repository/entities/session.entity';
import { SessionRepository } from '@app/modules/session/repository/repositories/session.repository';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceMemberEntity } from '@app/modules/workspace/repository/entities/workspace-member.entity';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { Injectable } from '@nestjs/common';
import { UserDataExportResponseDto } from '../dtos/response/user-data-export.response.dto';
import { IExportUserProfile } from '../interfaces/export.interface';
import { refId } from '../utils/ref-id.util';

/** Right of access and portability (GDPR Art 15, 20) for a signed-in user. */
@Injectable()
export class UserDataExportService {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly activityRepository: ActivityRepository
    ) {}

    async export(user: UserEntity): Promise<UserDataExportResponseDto> {
        const [memberships, sessions, activities] = await Promise.all([
            this.workspaceMemberRepository.find<WorkspaceMemberEntity>(
                { user: user.id },
                { populate: ['workspace', 'role'] }
            ),
            this.sessionRepository.find<SessionEntity>(
                { user: user.id },
                { populate: [], orderBy: { createdAt: 'DESC' } }
            ),
            this.activityRepository.find<ActivityEntity>(
                { user: user.id },
                { populate: [], orderBy: { createdAt: 'DESC' } }
            ),
        ]);

        return {
            exportedAt: new Date(),
            profile: this.mapProfile(user),
            workspaces: memberships.map(m => ({
                workspaceId: refId(m.workspace),
                workspaceName: m.workspace?.name,
                roleName: m.role?.name,
                roleType: m.role?.type,
                joinedAt: m.joinedAt,
                isActive: m.isActive,
            })),
            sessions: sessions.map(s => ({
                id: s.id,
                ip: s.ip,
                userAgent: s.userAgent,
                country: s.country,
                status: s.status,
                createdAt: s.createdAt,
                lastActiveAt: s.lastActiveAt,
                expiredAt: s.expiredAt,
                revokeAt: s.revokeAt,
            })),
            activities: activities.map(a => ({
                id: a.id,
                action: a.action,
                subject: a.subject,
                workspaceId: refId(a.workspace),
                metadata: a.metadata,
                createdAt: a.createdAt,
            })),
        };
    }

    // Explicit allow-list: password, salt and verification codes never leave.
    private mapProfile(user: UserEntity): IExportUserProfile {
        return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            mobileNumber: user.mobileNumber?.number,
            mobileNumberCountry: refId(user.mobileNumber?.country),
            gender: user.gender,
            avatar: user.avatar,
            photo: user.photo?.completedUrl,
            status: user.status,
            signUpDate: user.signUpDate,
            signUpFrom: user.signUpFrom,
            emailVerified: user.verification?.email,
            mobileNumberVerified: user.verification?.mobileNumber,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
