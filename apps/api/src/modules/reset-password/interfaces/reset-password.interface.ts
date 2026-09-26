import { ResetPasswordEntity } from '../repository/entities/reset-password.entity';

// Internal-only: carries `url`/`token`/`otp` for the email job payload. Never
// return this shape to an HTTP caller — the public response DTO
// (ResetPasswordCreteResponseDto) deliberately drops all three.
export interface IResetPasswordCreated {
    url: string;
    token: string;
    otp: string;
    expiredDate: Date;
    to: string;
}

export interface IResetPasswordRequest {
    resetPassword: ResetPasswordEntity;
    created: IResetPasswordCreated;
}
