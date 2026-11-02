import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{ title: "Calendar API" })
@server("/", "Calendar")
namespace Calendar;

model Owner {
  name: string;
  timeZone: string;
}

@error
model ApiError {
  code: string;
  message: string;
}

@route("/api/owner")
@tag("owner")
interface OwnerApi {
  @get
  getOwner(): Owner | ApiError;
}

model MeetingType {
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @minLength(1)
  @maxLength(50)
  id: string;

  name: string;
  description: string;
  durationMinutes: 15 | 30 | 45 | 60;
}

model CreateMeetingType {
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @minLength(1)
  @maxLength(50)
  id: string;

  @minLength(1)
  @maxLength(100)
  name: string;

  @maxLength(500)
  description?: string;

  durationMinutes: 15 | 30 | 45 | 60;
}

@error
model ValidationError {
  @statusCode _: 400;
  code: "validation_error";
  message: string;
  fields: Record<string>;
}

@error
model MeetingTypeIdTaken {
  @statusCode _: 409;
  code: "meeting_type_id_taken";
  message: string;
}

@error
model MeetingTypeNotFound {
  @statusCode _: 404;
  code: "meeting_type_not_found";
  message: string;
}

model Slot {
  start: utcDateTime;
  end: utcDateTime;
}

model CreateMeeting {
  meetingTypeId: string;
  start: utcDateTime;

  @minLength(1)
  @maxLength(100)
  guestName: string;

  @format("email")
  guestEmail: string;
}

model MeetingTypeSummary {
  id: string;
  name: string;
  durationMinutes: 15 | 30 | 45 | 60;
}

model Meeting {
  id: string;
  meetingType: MeetingTypeSummary;
  start: utcDateTime;
  end: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@error
model SlotUnavailable {
  @statusCode _: 422;
  code: "slot_unavailable";
  message: string;
}

@error
model SlotTaken {
  @statusCode _: 409;
  code: "slot_taken";
  message: string;
}

@route("/api/meeting-types")
@tag("meeting-types")
interface MeetingTypesApi {
  @get
  listMeetingTypes(): MeetingType[];

  @get
  @route("{id}")
  getMeetingType(@path id: string): MeetingType | MeetingTypeNotFound;

  @get
  @route("{id}/slots")
  listSlots(@path id: string): Slot[] | MeetingTypeNotFound;

  @post
  createMeetingType(@body body: CreateMeetingType): {
    @statusCode _: 201;
    @body body: MeetingType;
  } | ValidationError | MeetingTypeIdTaken;
}

@route("/api/meetings")
@tag("meetings")
interface MeetingsApi {
  @get
  listUpcomingMeetings(): Meeting[];

  @post
  createMeeting(@body body: CreateMeeting): {
    @statusCode _: 201;
    @body body: Meeting;
  } | ValidationError | MeetingTypeNotFound | SlotUnavailable | SlotTaken;
}
