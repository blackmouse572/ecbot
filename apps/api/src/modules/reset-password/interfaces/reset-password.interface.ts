import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';
import { ResetPasswordEntity } from '../repository/entities/reset-password.entity';

export interface IResetPasswordRequest {
    resetPassword: ResetPasswordEntity;
    created: ResetPasswordCreteResponseDto;
}
