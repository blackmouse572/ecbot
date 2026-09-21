import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { WaitlistJoinRequestDto } from 'src/modules/waitlist/dtos/request/waitlist.join.request.dto';
import { WaitlistListResponseDto } from 'src/modules/waitlist/dtos/response/waitlist.list.response.dto';
import { WaitlistEntity } from 'src/modules/waitlist/repository/entities/waitlist.entity';
import { WaitlistRepository } from 'src/modules/waitlist/repository/repositories/waitlist.repository';

@Injectable()
export class WaitlistService {
    constructor(private readonly waitlistRepository: WaitlistRepository) {}

    // Idempotent: a repeat email returns the existing entry instead of erroring,
    // so the landing page always shows success.
    async join({
        email,
        source,
        locale,
    }: WaitlistJoinRequestDto): Promise<WaitlistEntity> {
        const existing = await this.waitlistRepository.findOne({ email });
        if (existing) {
            return existing;
        }

        const create: WaitlistEntity = new WaitlistEntity();
        create.email = email;
        create.source = source;
        create.locale = locale;

        return this.waitlistRepository.create(create);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<WaitlistEntity[]> {
        return this.waitlistRepository.find(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.waitlistRepository.getTotal(find, options);
    }

    mapList(waitlists: WaitlistEntity[]): WaitlistListResponseDto[] {
        return plainToInstance(WaitlistListResponseDto, waitlists);
    }
}
