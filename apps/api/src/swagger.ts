import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { writeFileSync } from 'fs';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

export default async function (app: NestApplication): Promise<void> {
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env')!;
    const logger = new Logger('NestJs-Swagger');

    const docName: string = configService.get<string>('doc.name')!;
    const docDesc: string = configService.get<string>('doc.description')!;
    const docVersion: string = configService.get<string>('app.version')!;
    const docPrefix: string = configService.get<string>('doc.prefix')!;

    if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
        const documentBuild = new DocumentBuilder()
            .setTitle(docName)
            .setDescription(docDesc)
            .setVersion(docVersion)
            .addServer('/')
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'accessToken'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'refreshToken'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'google'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'apple'
            )
            .addApiKey(
                { type: 'apiKey', in: 'header', name: 'x-api-key' },
                'xApiKey'
            )
            .build();

        const document = SwaggerModule.createDocument(app, documentBuild, {
            deepScanRoutes: true,
        });

        writeFileSync('swagger.json', JSON.stringify(document));

        const setupPath = `${docPrefix}_`;
        const jsonDocumentUrl = `${docPrefix}/json`;
        const yamlDocumentUrl = `${docPrefix}/yaml`;
        SwaggerModule.setup(setupPath, app, document, {
            jsonDocumentUrl,
            yamlDocumentUrl,
            swaggerUiEnabled: false,
            customSiteTitle: docName,
            swaggerOptions: {
                persistAuthorization: true,
            },
        });

        const referenceHandler = apiReference({
            content: document,
            title: docName,
            description: docDesc,
            version: docVersion,
            hideDownloadButton: true,
            theme: 'none',
            layout: 'modern',
            defaultHttpClient: {
                targetKey: 'node',
                clientKey: 'axios',
            },
            authentication: {
                preferredSecurityScheme: 'accessToken',
                http: {
                    basic: {
                        enabled: true,
                    },
                    bearer: {
                        enabled: true,
                    },
                },
            },
            persistAuth: true,
        });
        app.use(docPrefix, referenceHandler);

        logger.log(`Docs will serve on ${docPrefix}`, 'NestApplication');
    }
}
