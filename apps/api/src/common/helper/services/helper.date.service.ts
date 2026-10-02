import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { IHelperDateService } from 'src/common/helper/interfaces/helper.date-service.interface';
import { IHelperDateCreateOptions } from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperDateService implements IHelperDateService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone');
    }

    calculateAge(dateOfBirth: Date, fromYear?: number): Duration {
        const dateTime = DateTime.now()
            .setZone(this.defTz)
            .plus({
                day: 1,
            })
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
        const dateTimeDob = DateTime.fromJSDate(dateOfBirth)
            .setZone(this.defTz)
            .set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            });

        if (fromYear) {
            dateTime.set({
                year: fromYear,
            });
        }

        return dateTime.diff(dateTimeDob);
    }

    checkIso(date: string): boolean {
        return DateTime.fromISO(date).setZone(this.defTz).isValid;
    }

    checkTimestamp(timestamp: number): boolean {
        return DateTime.fromMillis(timestamp).setZone(this.defTz).isValid;
    }

    getZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).zone.name;
    }

    getZoneOffset(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).offsetNameShort;
    }

    getTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    // Dates read back from a queued job arrive as ISO strings; fromJSDate on
    // a string is invalid and rendered an empty date in emails.
    formatToRFC2822(date: Date | string): string {
        return DateTime.fromJSDate(new Date(date))
            .setZone(this.defTz)
            .toRFC2822();
    }

    /** A date and time for people to read, e.g. "Oct 1, 2026, 10:05 AM". */
    formatToReadable(date: Date | string, locale: string): string {
        return DateTime.fromJSDate(new Date(date))
            .setZone(this.defTz)
            .setLocale(locale)
            .toLocaleString(DateTime.DATETIME_MED);
    }

    formatToIso(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISO();
    }

    formatToIsoDate(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISODate();
    }

    formatToIsoTime(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toISOTime();
    }

    create(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = date
            ? DateTime.fromJSDate(date).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            mDate = mDate.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    createInstance(date?: Date): DateTime {
        return date ? DateTime.fromJSDate(date) : DateTime.now();
    }

    createFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        const date = DateTime.fromISO(iso).setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    createFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date {
        const date = timestamp
            ? DateTime.fromMillis(timestamp).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.START
        ) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === ENUM_HELPER_DATE_DAY_OF.END
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    set(date: Date, units: DateObjectUnits): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .set(units)
            .toJSDate();
    }

    forward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .plus(duration)
            .toJSDate();
    }

    backward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .minus(duration)
            .toJSDate();
    }

    createDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }
}
