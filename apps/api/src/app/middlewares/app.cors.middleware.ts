import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cors, { CorsOptions } from 'cors';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AppCorsMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AppCorsMiddleware.name);

    private readonly allowOrigin: string | boolean | string[];
    private readonly allowMethod: string[];
    private readonly allowHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.allowOrigin = this.configService.get<string | boolean | string[]>(
            'middleware.cors.allowOrigin'
        );
        this.allowMethod = this.configService.get<string[]>(
            'middleware.cors.allowMethod'
        );
        this.allowHeader = this.configService.get<string[]>(
            'middleware.cors.allowHeader'
        );

        this.logger.log('CORS configuration initialized', {
            allowOrigin: this.allowOrigin,
            allowMethod: this.allowMethod,
            allowHeader: this.allowHeader,
        });
    }

    use(req: Request, res: Response, next: NextFunction): void {
        let credentials = true;
        if (typeof this.allowOrigin === 'string' && this.allowOrigin === '*') {
            credentials = false;
        } else if (
            Array.isArray(this.allowOrigin) &&
            this.allowOrigin.includes('*')
        ) {
            credentials = false;
        }

        const corsOptions: CorsOptions = {
            origin: this.allowOrigin,
            methods: this.allowMethod,
            allowedHeaders: this.allowHeader,
            preflightContinue: false,
            credentials,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
        };

        cors(corsOptions)(req, res, next);
    }
}
