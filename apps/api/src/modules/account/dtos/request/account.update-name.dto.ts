import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AccountUpdateNameRequestDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    @MinLength(3)
    name: string;
}
