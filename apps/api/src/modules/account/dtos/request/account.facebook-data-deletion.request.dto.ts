import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Form body Meta POSTs to the data deletion callback. */
export class AccountFacebookDataDeletionRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(4000)
    signed_request: string;
}
