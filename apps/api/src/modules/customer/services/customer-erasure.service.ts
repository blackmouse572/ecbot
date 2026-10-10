import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { MESSAGE_MEDIA_KEY_PREFIX } from '@app/modules/conversation/constants/message-media.constant';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
    ICustomerErasure,
    ICustomerErasureSummary,
} from '../interfaces/customer-erasure.interface';
import { CustomerRepository } from '../repository/repositories/customer.repository';

const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };
// S3 DeleteObjects takes at most 1000 keys per call.
const S3_DELETE_BATCH = 1000;

/** Right to erasure (GDPR Art 17, Decree 13) for one end customer. */
@Injectable()
export class CustomerErasureService {
    private readonly logger = new Logger(CustomerErasureService.name);

    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly s3: AwsS3Service,
        private readonly activityService: ActivityService
    ) {}

    /**
     * Deletes the rows, then the stored media, then writes the ERASE audit
     * row, all before the transaction commits: no erasure without its audit
     * row. A media delete that still fails after one retry does not undo the
     * erasure; its key or folder goes into the audit row for a manual retry.
     */
    async erase(
        customerId: string,
        workspace: WorkspaceEntity,
        user: UserEntity
    ): Promise<ICustomerErasureSummary> {
        const erased = await this.customerRepository.eraseInWorkspace(
            customerId,
            workspace.id,
            async (rows, em) => {
                const mediaCleanupFailed = await this.deleteMedia(rows);
                // Ids, counts and storage keys only: the audit row must not
                // keep the erased personal data.
                await this.activityService.createByUserWithWorkspace(
                    user,
                    workspace,
                    {
                        action: ENUM_ACTIVITY_ACTION.ERASE,
                        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                        metadata: {
                            id: customerId,
                            ...this.summarize(rows),
                            ...(mediaCleanupFailed.length && {
                                mediaCleanupFailed,
                            }),
                        },
                    },
                    { em }
                );
            }
        );
        if (!erased) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        return this.summarize(erased);
    }

    /** Returns the keys and folders still in storage after one retry. */
    private async deleteMedia(rows: ICustomerErasure): Promise<string[]> {
        const failed: string[] = [];
        for (let i = 0; i < rows.mediaKeys.length; i += S3_DELETE_BATCH) {
            const batch = rows.mediaKeys.slice(i, i + S3_DELETE_BATCH);
            if (
                !(await this.withRetry(() =>
                    this.s3.deleteItems(batch, PRIVATE)
                ))
            ) {
                failed.push(...batch);
            }
        }
        for (const id of rows.conversationIds) {
            const dir = `${MESSAGE_MEDIA_KEY_PREFIX}/${id}/`;
            if (
                !(await this.withRetry(() => this.s3.deleteDir(dir, PRIVATE)))
            ) {
                failed.push(dir);
            }
        }
        if (failed.length) {
            this.logger.error(
                `customer erasure: ${failed.length} media keys or folders could not be deleted, see the ERASE audit row`
            );
        }
        return failed;
    }

    private async withRetry(run: () => Promise<unknown>): Promise<boolean> {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await run();
                return true;
            } catch (err: unknown) {
                this.logger.warn(
                    `media delete failed (attempt ${attempt + 1}): ${(err as Error).message}`
                );
            }
        }
        return false;
    }

    private summarize(rows: ICustomerErasure): ICustomerErasureSummary {
        return {
            customers: rows.customerIds.length,
            contactPoints: rows.contactPointIds.length,
            conversations: rows.conversationIds.length,
            messages: rows.messageCount,
            mediaFiles: rows.mediaKeys.length,
        };
    }
}
