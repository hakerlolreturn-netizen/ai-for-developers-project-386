import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Instant `iso` as a Russian-locale dayjs in the owner's time zone. */
export const inZone = (iso: string, timeZone: string) => dayjs(iso).tz(timeZone).locale('ru')
