import { ResetPasswordEntity } from '../repository/entities/reset-password.entity';

// Internal-only: carries `url`/`token` for the email job payload. Never return
// this shape to an HTTP caller — the public response DTO
// (ResetPasswordCreteResponseDto) deliberately drops both fields.
export interface IResetPasswordCreated {
    url: string;
    token: string;
    expiredDate: Date;
    to: string;
}

export interface IResetPasswordRequest {
    resetPassword: ResetPasswordEntity;
    created: IResetPasswordCreated;
}
