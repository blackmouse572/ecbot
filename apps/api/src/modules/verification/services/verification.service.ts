import { raw } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';
import { ENUM_VERIFICATION_TYPE } from 'src/modules/verification/enums/verification.enum.constant';
import { IVerificationService } from 'src/modules/verification/interfaces/verification.service.interface';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';
import { VerificationRepository } from 'src/modules/verification/repository/repositories/verification.repository';

@Injectable()
export class VerificationService implements IVerificationService {
    private readonly expiredInMinutes: number;
    private readonly otpLength: number;

    private readonly referenceLength: number;
    private readonly referencePrefix: string;

    // Failed OTP attempts allowed on /verify/email before the row is
    // locked (isActive=false) and ATTEMPT_MAX is thrown. Mirrors
    // ResetPasswordService.maxOtpAttempt.
    private readonly maxOtpAttempt = 5;

    constructor(
        private readonly verificationRepository: VerificationRepository,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.expiredInMinutes = this.configService.get<number>(
            'verification.expiredInMinutes'
        )!;
        this.otpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;

        this.referenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.referencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<VerificationEntity[]> {
        return this.verificationRepository.find<VerificationEntity>(
            find,
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity> {
        return this.verificationRepository.findOneById<VerificationEntity>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity> {
        return this.verificationRepository.findOne<VerificationEntity>(
            find,
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.verificationRepository.getTotal(find, options);
    }

    async createEmailByUser(
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationEntity> {
        const em =
            options?.em || this.verificationRepository.getEntityManager();
        const otp = this.createOtp();
        const expiredDate = this.createExpiredDate();
        const reference = this.createReference();

        const create: VerificationEntity = new VerificationEntity();
        create.user = em.getReference(UserEntity, user.id);
        create.to = user.email;
        create.type = ENUM_VERIFICATION_TYPE.EMAIL;
        create.otp = otp;
        create.expiredDate = expiredDate;
        create.isActive = true;
        create.reference = reference;

        return this.verificationRepository.create<VerificationEntity>(
            create,
            options
        );
    }

    async createMobileNumberByUser(
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationEntity> {
        const em =
            options?.em || this.verificationRepository.getEntityManager();
        const otp = this.createOtp();
        const expiredDate = this.createExpiredDate();
        const reference = this.createReference();

        const create: VerificationEntity = new VerificationEntity();
        create.user = em.getReference(UserEntity, user.id);
        create.to = user.mobileNumber!.number;
        create.type = ENUM_VERIFICATION_TYPE.MOBILE_NUMBER;
        create.otp = otp;
        create.expiredDate = expiredDate;
        create.isActive = true;
        create.reference = reference;

        return this.verificationRepository.create<VerificationEntity>(
            create,
            options
        );
    }

    async findOneLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity> {
        return this.verificationRepository.findOne<VerificationEntity>(
            {
                user,
                isActive: true,
                isVerify: false,
                type: ENUM_VERIFICATION_TYPE.EMAIL,
                expiredDate: {
                    $gte: this.helperDateService.create(),
                },
            },
            {
                ...options,
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
            }
        );
    }

    async findOneLatestMobileNumberByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity> {
        return this.verificationRepository.findOne<VerificationEntity>(
            {
                user,
                isActive: true,
                isVerify: false,
                type: ENUM_VERIFICATION_TYPE.MOBILE_NUMBER,
                expiredDate: {
                    $gte: this.helperDateService.create(),
                },
            },
            {
                ...options,
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
            }
        );
    }

    // Binds a /resend/email or /verify/email request to the caller's own
    // user id, not just the `to` email address — otherwise a request
    // carrying an arbitrary `id` plus a known/guessed email could match
    // another user's verification row. Also enforces isActive/expiredDate
    // so an inactivated or stale row is never matched.
    async findOneActiveLatestEmailByUser(
        user: string,
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity> {
        return this.verificationRepository.findOne<VerificationEntity>(
            {
                user,
                to: email,
                isActive: true,
                expiredDate: {
                    $gte: this.helperDateService.create(),
                },
            },
            {
                ...options,
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
            }
        );
    }

    validateOtp(verification: VerificationEntity, otp: string): boolean {
        return verification.otp === otp;
    }

    async verify(
        repository: VerificationEntity,
        options?: IDatabaseSaveOptions
    ): Promise<VerificationEntity> {
        repository.isActive = false;
        repository.isVerify = true;
        repository.verifyDate = this.helperDateService.create();

        return this.verificationRepository.save(repository, options);
    }

    async incrementOtpAttempt(
        repository: VerificationEntity,
        options?: IDatabaseSaveOptions
    ): Promise<VerificationEntity> {
        const nextAttempt = repository.otpAttempt + 1;
        const staysActive =
            repository.isActive && nextAttempt < this.maxOtpAttempt;

        // Atomic at the DB level (`otp_attempt = otp_attempt + 1`), not a
        // read-modify-write — concurrent wrong-OTP guesses on the same row
        // can't race a stale in-memory count past the attempt cap. The two
        // fields below mirror this exact SQL expression for this request's
        // immediate branching; every later request re-reads the real
        // (correctly atomic) DB state through the entity pipes regardless.
        await this.verificationRepository.updateRaw(
            { id: repository.id },
            {
                otpAttempt: raw('otp_attempt + 1'),
                isActive: raw(
                    `is_active and otp_attempt + 1 < ${this.maxOtpAttempt}`
                ),
            },
            options
        );

        repository.otpAttempt = nextAttempt;
        repository.isActive = staysActive;

        return repository;
    }

    async inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<any> {
        return this.verificationRepository.updateMany(
            { user, type: ENUM_VERIFICATION_TYPE.EMAIL },
            { isActive: false },
            options
        );
    }

    async inactiveMobileNumberManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<any> {
        return this.verificationRepository.updateMany(
            { user, type: ENUM_VERIFICATION_TYPE.MOBILE_NUMBER },
            { isActive: false },
            options
        );
    }

    createOtp(): string {
        return this.helperNumberService.random(this.otpLength).toString();
    }

    createExpiredDate(): Date {
        const today = this.helperDateService.create();
        return this.helperDateService.forward(
            today,
            Duration.fromObject({
                minutes: this.expiredInMinutes,
            })
        );
    }

    createReference(): string {
        const random = this.helperStringService.randomReference(
            this.referenceLength
        );

        return `${this.referencePrefix}_${random}`;
    }

    map(verification: VerificationEntity): VerificationResponse {
        return {
            expiredIn: verification.expiredDate.valueOf(),
            to: this.helperStringService.censor(verification.to),
        };
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<any> {
        return this.verificationRepository.deleteMany(find, options);
    }
}
