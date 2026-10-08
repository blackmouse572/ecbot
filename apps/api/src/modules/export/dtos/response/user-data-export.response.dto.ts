import { ApiProperty } from '@nestjs/swagger';
import {
    IExportUserActivity,
    IExportUserProfile,
    IExportUserSession,
    IExportUserWorkspace,
} from '../../interfaces/export.interface';

export class UserDataExportResponseDto {
    @ApiProperty()
    exportedAt: Date;

    @ApiProperty({ type: Object })
    profile: IExportUserProfile;

    @ApiProperty({ type: Object, isArray: true })
    workspaces: IExportUserWorkspace[];

    @ApiProperty({ type: Object, isArray: true })
    sessions: IExportUserSession[];

    @ApiProperty({ type: Object, isArray: true })
    activities: IExportUserActivity[];
}
