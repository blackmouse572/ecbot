import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FacebookActivityCreateRequestDto } from '../dtos/request/facebook-activity.create.request.dto';
import { FacebookActivityUpdateRequestDto } from '../dtos/request/facebook-activity.update.request.dto';
import { FacebookActivityListResponseDto } from '../dtos/response/facebook-activity.list.response.dto';
import {
    ActivityFilter,
    CountOpts,
    CreateOpts,
    DeleteOpts,
    FindAllOpts,
    FindOneOpts,
    IFacebookActivityService,
    UpdateOpts,
} from '../interfaces/facebook-activity.service.interface';
import { FacebookActivityEntity } from '../repository/entities/facebook-activity.entity';
import { FacebookActivityRepository } from '../repository/repositories/facebook-activity.repository';

/** What a processing attempt leaves behind on the row it touched. */
type ProcessingOutcome = {
    processed: boolean;
    processingError?: string;
};

@Injectable()
export class FacebookActivityService implements IFacebookActivityService {
    constructor(private readonly activities: FacebookActivityRepository) {}

    findAll(
        where?: ActivityFilter,
        opts?: FindAllOpts
    ): Promise<FacebookActivityEntity[]> {
        return this.activities.find(where, opts);
    }

    findOne(
        where: ActivityFilter,
        opts?: FindOneOpts
    ): Promise<FacebookActivityEntity> {
        return this.activities.findOne(where, opts);
    }

    findOneById(
        id: string,
        opts?: FindOneOpts
    ): Promise<FacebookActivityEntity> {
        return this.activities.findOneById(id, opts);
    }

    getTotal(where?: ActivityFilter, opts?: CountOpts): Promise<number> {
        return this.activities.getTotal(where, opts);
    }

    create(
        payload: FacebookActivityCreateRequestDto,
        opts?: CreateOpts
    ): Promise<FacebookActivityEntity> {
        return this.activities.create(this.toEntity(payload), opts);
    }

    updateOneById(
        id: string,
        patch: FacebookActivityUpdateRequestDto,
        opts?: UpdateOpts
    ): Promise<FacebookActivityEntity> {
        return this.applyPatch(id, patch, opts);
    }

    markAsProcessed(
        id: string,
        opts?: UpdateOpts
    ): Promise<FacebookActivityEntity> {
        return this.stamp(id, { processed: true }, opts);
    }

    markAsError(
        id: string,
        reason: string,
        opts?: UpdateOpts
    ): Promise<FacebookActivityEntity> {
        const outcome = { processed: false, processingError: reason };

        return this.stamp(id, outcome, opts);
    }

    deleteMany(where?: ActivityFilter, opts?: DeleteOpts): Promise<boolean> {
        return this.activities.deleteMany(where, opts).then(() => true);
    }

    mapList(rows: FacebookActivityEntity[]): FacebookActivityListResponseDto[] {
        return plainToInstance(FacebookActivityListResponseDto, rows);
    }

    /** Turns a create request into the row it describes, still unsaved. */
    private toEntity(
        payload: FacebookActivityCreateRequestDto
    ): FacebookActivityEntity {
        const activity = new FacebookActivityEntity();

        activity.pageId = payload.pageId;
        activity.senderId = payload.senderId;
        activity.recipientId = payload.recipientId;
        activity.eventType = payload.eventType;
        activity.messageId = payload.messageId;
        activity.messageText = payload.messageText;
        activity.eventPayload = payload.eventPayload;
        activity.webhookPayload = payload.webhookPayload;
        activity.metadata = payload.metadata;
        activity.processed = false;

        return activity;
    }

    /** Writes back only the fields a patch actually carries. */
    private async applyPatch(
        id: string,
        patch: FacebookActivityUpdateRequestDto,
        opts?: UpdateOpts
    ): Promise<FacebookActivityEntity> {
        const activity = await this.findOneById(id);

        for (const [field, value] of Object.entries(patch)) {
            if (value !== undefined) activity[field] = value;
        }

        return this.activities.save(activity, opts);
    }

    /** Records the result of a processing attempt and stamps the time. */
    private async stamp(
        id: string,
        outcome: ProcessingOutcome,
        opts?: UpdateOpts
    ): Promise<FacebookActivityEntity> {
        const activity = await this.findOneById(id);

        activity.processed = outcome.processed;
        activity.processingError = outcome.processingError;
        activity.processedAt = new Date();

        return this.activities.save(activity, opts);
    }
}
