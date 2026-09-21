import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { RequestEntity } from '../entities/requests.entity';

@Injectable()
export class RequestRepository extends EntityRepository<RequestEntity> {
    constructor(em: EntityManager) {
        super(em, RequestEntity);
    }
}
