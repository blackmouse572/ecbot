import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserMobileNumberEntity } from 'src/modules/user/repository/entities/user.mobile-number.entity';

export interface IUserMobileNumberEntity extends Omit<
    UserMobileNumberEntity,
    'country'
> {
    country: CountryEntity;
}

export interface IUserEntity extends Omit<
    UserEntity,
    'role' | 'country' | 'mobileNumber'
> {
    role: RoleEntity;
    country: CountryEntity;
    mobileNumber?: IUserMobileNumberEntity;
}

export type IUserMfaUpdate = Partial<
    Pick<
        UserEntity,
        | 'mfaEnabled'
        | 'mfaSecret'
        | 'mfaPendingSecret'
        | 'mfaRecoveryCodes'
        | 'mfaLastTimeStep'
    >
>;

// Sign-up input. acceptTerms is optional here: the public sign-up DTO
// requires it, while an operator creating an account does not send it.
export type IUserSignUp = Omit<AuthSignUpRequestDto, 'acceptTerms'> & {
    acceptTerms?: boolean;
};
