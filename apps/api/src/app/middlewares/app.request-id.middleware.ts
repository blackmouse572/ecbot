import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID as uuid } from 'node:crypto';

@Injectable()
export class AppRequestIdMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        req.id = uuid();

        next();
    }
}
