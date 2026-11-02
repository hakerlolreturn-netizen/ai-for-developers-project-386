import type { components } from '../../api/dist/schema.d.ts'

export type MeetingType = components['schemas']['MeetingType']

/** In-memory storage (ADR 0003). */
export function createStore() {
  const meetingTypes = new Map<string, MeetingType>()

  return {
    listMeetingTypes: (): MeetingType[] => [...meetingTypes.values()],
    getMeetingType: (id: string): MeetingType | undefined => meetingTypes.get(id),
    /** Returns false and keeps the stored value when the id is taken. */
    addMeetingType(meetingType: MeetingType): boolean {
      if (meetingTypes.has(meetingType.id)) return false
      meetingTypes.set(meetingType.id, meetingType)
      return true
    },
  }
}
