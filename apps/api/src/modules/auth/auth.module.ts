import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthImpersonationReadOnlyInterceptor } from 'src/modules/auth/interceptors/auth.impersonation-read-only.interceptor';
import { AuthJwtAccessStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ImpersonationService } from 'src/modules/auth/services/impersonation.service';
import { MfaService } from 'src/modules/auth/services/mfa.service';
import { SessionModule } from 'src/modules/session/session.module';
import { UserModule } from 'src/modules/user/user.module';
import { Algorithm } from 'jsonwebtoken';

@Module({
    providers: [
        AuthService,
        ImpersonationService,
        MfaService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuthImpersonationReadOnlyInterceptor,
        },
    ],
    exports: [AuthService, ImpersonationService, MfaService],
    controllers: [],
    imports: [
        SessionModule,
        UserModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService): JwtModuleOptions => ({
                signOptions: {
                    audience: configService.get<string>('auth.jwt.audience'),
                    issuer: configService.get<string>('auth.jwt.issuer'),
                    algorithm:
                        configService.get<Algorithm>('auth.jwt.algorithm'),
                },
            }),
        }),
    ],
})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            providers: [AuthJwtAccessStrategy, AuthJwtRefreshStrategy],
            exports: [],
            controllers: [],
            imports: [SessionModule],
        };
    }
}
