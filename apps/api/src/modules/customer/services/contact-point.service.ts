import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ContactPointGetResponseDto } from '../dtos/response/contact-point.get.response.dto';
import { ContactPointEntity } from '../repository/entities/contact-point.entity';
import { ContactPointRepository } from '../repository/repositories/contact-point.repository';

@Injectable()
export class ContactPointService {
    constructor(
        private readonly contactPointRepository: ContactPointRepository
    ) {}

    async findByCustomer(customerId: string): Promise<ContactPointEntity[]> {
        return this.contactPointRepository.findByCustomer(customerId);
    }

    /**
     * BOLA-safe variant: return contact points only when they (and their
     * customer) actually belong to the given workspace.
     */
    async findByCustomerInWorkspace(
        customerId: string,
        workspaceId: string
    ): Promise<ContactPointEntity[]> {
        return this.contactPointRepository.find({
            customer: customerId,
            workspace: workspaceId,
        } as any);
    }

    mapGet(contactPoint: ContactPointEntity): ContactPointGetResponseDto {
        return plainToInstance(ContactPointGetResponseDto, contactPoint, {
            excludeExtraneousValues: true,
        });
    }

    mapList(contactPoints: ContactPointEntity[]): ContactPointGetResponseDto[] {
        return contactPoints.map(c => this.mapGet(c));
    }
}
