import { randomUUID } from 'node:crypto'
import type { components } from '../../api/dist/schema.d.ts'
import { formatOwnerTime, freeSlots, type Interval } from './slots.ts'

export type MeetingType = components['schemas']['MeetingType']
export type Meeting = components['schemas']['Meeting']

export type BookResult = { meeting: Meeting } | { error: 'slot_unavailable' }

/** In-memory storage (ADR 0003). */
export function createStore() {
  const meetingTypes = new Map<string, MeetingType>()
  const meetings: Meeting[] = []

  const busyIntervals = (): Interval[] =>
    meetings.map((meeting) => ({ start: new Date(meeting.start), end: new Date(meeting.end) }))

  return {
    listMeetingTypes: (): MeetingType[] => [...meetingTypes.values()],
    getMeetingType: (id: string): MeetingType | undefined => meetingTypes.get(id),
    /** Returns false and keeps the stored value when the id is taken. */
    addMeetingType(meetingType: MeetingType): boolean {
      if (meetingTypes.has(meetingType.id)) return false
      meetingTypes.set(meetingType.id, meetingType)
      return true
    },
    /** Meetings of all types in booking order. */
    listMeetings: (): Meeting[] => [...meetings],
    /** Existing meetings of all types as intervals that block slots. */
    busyIntervals,
    /** Checks `start` against the free slots and inserts in one synchronous section. */
    bookMeeting(
      meetingType: MeetingType,
      guest: { guestName: string; guestEmail: string },
      start: Date,
      now: Date,
    ): BookResult {
      const slot = freeSlots({
        durationMinutes: meetingType.durationMinutes,
        busy: busyIntervals(),
        now,
      }).find((candidate) => candidate.start.getTime() === start.getTime())
      if (!slot) return { error: 'slot_unavailable' }
      const { id, name, durationMinutes } = meetingType
      const meeting: Meeting = {
        id: randomUUID(),
        meetingType: { id, name, durationMinutes },
        start: formatOwnerTime(slot.start),
        end: formatOwnerTime(slot.end),
        ...guest,
      }
      meetings.push(meeting)
      return { meeting }
    },
  }
}
