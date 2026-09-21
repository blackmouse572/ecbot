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
