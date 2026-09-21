import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { SmsTaskController } from '@app/modules/sms/controllers/sms.task.controller';
import { SmsTaskDto } from '@app/modules/sms/dtos/sms.task.dto';
import { SmsService } from '@app/modules/sms/services/sms.service';
import { ENUM_SEND_SMS_PROCESS } from '@app/modules/sms/enums/sms.enum';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '@app/common/request/constants/request.constant';

describe('SmsTaskController.handle', () => {
    const sendVerification = jest.fn().mockResolvedValue(undefined);
    let controller: SmsTaskController;

    it('allows provider delivery time on the Cloud Tasks callback', () => {
        const handler = SmsTaskController.prototype.handle;

        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, handler)
        ).toBe(true);
        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, handler)
        ).toBe('300s');
    });

    beforeEach(async () => {
        sendVerification.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SmsTaskController],
            providers: [
                { provide: SmsService, useValue: { sendVerification } },
            ],
        }).compile();
        controller = module.get(SmsTaskController);
    });

    it('dispatches verification to SmsService', async () => {
        await expect(
            controller.handle({
                jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
                send: { name: 'A', mobileNumber: '+84123456789' },
                data: { otp: '123456', expiredAt: new Date(0) },
            })
        ).resolves.toEqual({});
        expect(sendVerification).toHaveBeenCalledWith(
            { name: 'A', mobileNumber: '+84123456789' },
            { otp: '123456', expiredAt: new Date(0) }
        );
    });

    it('propagates a provider failure for Cloud Tasks retry', async () => {
        sendVerification.mockRejectedValueOnce(
            new Error('provider unavailable')
        );
        await expect(
            controller.handle({
                jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
                send: { name: 'A', mobileNumber: '+84123456789' },
                data: { otp: '123456', expiredAt: new Date(0) },
            })
        ).rejects.toThrow('provider unavailable');
    });

    it('validates the nested SMS send payload', async () => {
        const invalidSends = [{ foo: 1 }, { name: 'A' }];

        for (const send of invalidSends) {
            const errors = await validate(
                plainToInstance(SmsTaskDto, {
                    jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
                    send,
                    data: { otp: '123456', expiredAt: new Date(0) },
                }),
                { skipUndefinedProperties: true }
            );

            expect(errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ property: 'send' }),
                ])
            );
        }
    });

    it('transforms the Cloud Tasks SMS date and validates nested task data', async () => {
        const payload = {
            jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
            send: { name: 'A', mobileNumber: '+84123456789' },
            data: { otp: '123456', expiredAt: '2026-08-09T00:00:00.000Z' },
        };
        const instance = plainToInstance(SmsTaskDto, payload);

        expect(instance.data.expiredAt).toBeInstanceOf(Date);
        await expect(
            validate(instance, {
                skipUndefinedProperties: true,
                forbidUnknownValues: true,
            })
        ).resolves.toHaveLength(0);

        const transformed = await new ValidationPipe({
            transform: true,
            skipUndefinedProperties: true,
            forbidUnknownValues: true,
        }).transform(payload, {
            type: 'body',
            metatype: SmsTaskDto,
            data: '',
        });

        expect(transformed.data.expiredAt).toBeInstanceOf(Date);
    });

    it.each([
        { jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION, send: {}, data: {} },
        {
            jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
            send: { name: 'A', mobileNumber: '+84123456789' },
            data: { otp: '12', expiredAt: 'not-a-date' },
        },
        {
            send: { name: 'A', mobileNumber: '+84123456789' },
            data: { otp: '123456', expiredAt: '2026-08-09T00:00:00.000Z' },
        },
        {
            jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
            data: { otp: '123456', expiredAt: '2026-08-09T00:00:00.000Z' },
        },
        {
            jobName: ENUM_SEND_SMS_PROCESS.VERIFICATION,
            send: { name: 'A', mobileNumber: '+84123456789' },
        },
    ])('rejects malformed SMS task payload %p', async payload => {
        await expect(
            validate(plainToInstance(SmsTaskDto, payload), {
                skipUndefinedProperties: true,
                forbidUnknownValues: true,
            })
        ).resolves.toEqual(expect.arrayContaining([expect.any(Object)]));
    });
});
