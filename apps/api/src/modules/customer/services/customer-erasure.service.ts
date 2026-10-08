import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { MESSAGE_MEDIA_KEY_PREFIX } from '@app/modules/conversation/constants/message-media.constant';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ICustomerErasureSummary } from '../interfaces/customer-erasure.interface';
import { CustomerRepository } from '../repository/repositories/customer.repository';

const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

/** Right to erasure (GDPR Art 17, Decree 13) for one end customer. */
@Injectable()
export class CustomerErasureService {
    private readonly logger = new Logger(CustomerErasureService.name);

    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly s3: AwsS3Service
    ) {}

    async erase(
        customerId: string,
        workspaceId: string
    ): Promise<ICustomerErasureSummary> {
        const erased = await this.customerRepository.eraseInWorkspace(
            customerId,
            workspaceId
        );
        if (!erased) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        // The rows are already gone, so a storage failure must not turn into
        // an error: log the folders so they can be cleaned up by hand.
        try {
            // S3 DeleteObjects takes at most 1000 keys per call.
            for (let i = 0; i < erased.mediaKeys.length; i += 1000) {
                await this.s3.deleteItems(
                    erased.mediaKeys.slice(i, i + 1000),
                    PRIVATE
                );
            }
            for (const id of erased.conversationIds) {
                await this.s3.deleteDir(
                    `${MESSAGE_MEDIA_KEY_PREFIX}/${id}/`,
                    PRIVATE
                );
            }
        } catch (err: unknown) {
            this.logger.error(
                `customer ${customerId} erased but media cleanup failed for conversations [${erased.conversationIds.join(', ')}]: ${(err as Error).message}`
            );
        }

        return {
            customers: erased.customerIds.length,
            contactPoints: erased.contactPointIds.length,
            conversations: erased.conversationIds.length,
            messages: erased.messageCount,
            mediaFiles: erased.mediaKeys.length,
        };
    }
}
