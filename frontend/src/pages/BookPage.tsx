import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'
import { inZone } from '../time.ts'

type Owner = components['schemas']['Owner']
type MeetingType = components['schemas']['MeetingType']
type Slot = components['schemas']['Slot']
type Meeting = components['schemas']['Meeting']

const WINDOW_DAYS = 14

const slotDay = (slot: Slot, timeZone: string) => inZone(slot.start, timeZone).format('YYYY-MM-DD')
const slotTime = (slot: Slot, timeZone: string) => inZone(slot.start, timeZone).format('HH:mm')

function MeetingTypeList() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>()

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types').then(({ data }) => {
      if (active) setMeetingTypes(data)
    })
    return () => {
      active = false
    }
  }, [])

  if (!meetingTypes) return null
  if (meetingTypes.length === 0) return <Text mt="md">Владелец ещё не добавил типы встреч</Text>
  return (
    <Stack mt="md">
      {meetingTypes.map(({ id, name, description, durationMinutes }) => (
        <Paper key={id} component={Link} to={`/book/${id}`} withBorder p="md" td="none" c="inherit">
          <Group justify="space-between">
            <Text fw={600}>{name}</Text>
            <Badge variant="light">{durationMinutes} мин</Badge>
          </Group>
          {description && (
            <Text size="sm" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </Paper>
      ))}
    </Stack>
  )
}

function TimeStep({
  meetingType,
  timeZone,
  slot,
  onSlot,
  onNext,
}: {
  meetingType: MeetingType
  timeZone: string
  slot: Slot | null
  onSlot: (slot: Slot) => void
  onNext: () => void
}) {
  const [slots, setSlots] = useState<Slot[]>()
  const [day, setDay] = useState<string | null>(slot ? slotDay(slot, timeZone) : null)

  useEffect(() => {
    let active = true
    api
      .GET('/api/meeting-types/{id}/slots', { params: { path: { id: meetingType.id } } })
      .then(({ data }) => {
        if (active) setSlots(data)
      })
    return () => {
      active = false
    }
  }, [meetingType.id])

  const [today] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date()))
  const maxDate = dayjs(today)
    .add(WINDOW_DAYS - 1, 'day')
    .format('YYYY-MM-DD')
  const freeDays = new Set(slots?.map((candidate) => slotDay(candidate, timeZone)))
  const daySlots = slots?.filter((candidate) => slotDay(candidate, timeZone) === day) ?? []

  return (
    <Stack mt="md">
      <Text>
        {meetingType.name}, {meetingType.durationMinutes} мин
      </Text>
      <Group align="flex-start" gap="xl">
        <DatePicker
          value={day}
          onChange={setDay}
          minDate={today}
          maxDate={maxDate}
          excludeDate={(date) => !freeDays.has(date)}
        />
        <SimpleGrid cols={4} spacing="xs" style={{ flex: 1 }}>
          {daySlots.map((candidate) => (
            <Button
              key={candidate.start}
              variant={slot?.start === candidate.start ? 'filled' : 'default'}
              onClick={() => onSlot(candidate)}
            >
              {slotTime(candidate, timeZone)}
            </Button>
          ))}
        </SimpleGrid>
      </Group>
      <Group>
        <Button component={Link} to="/book" variant="default">
          Назад
        </Button>
        <Button disabled={!slot} onClick={onNext}>
          Далее
        </Button>
      </Group>
    </Stack>
  )
}

const slotRange = (slot: Slot, timeZone: string) =>
  `${inZone(slot.start, timeZone).format('D MMMM')}, ${slotTime(slot, timeZone)}–${slotTime({ start: slot.end }, timeZone)}`

function DataStep({
  meetingType,
  timeZone,
  slot,
  onSlot,
  onBack,
  onBooked,
}: {
  meetingType: MeetingType
  timeZone: string
  slot: Slot | null
  onSlot: (slot: Slot | null) => void
  onBack: () => void
  onBooked: (meeting: Meeting) => void
}) {
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>()
  const [daySlots, setDaySlots] = useState<Slot[]>()
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!slot) return
    setSubmitting(true)
    try {
      const { data, error } = await api.POST('/api/meetings', {
        body: { meetingTypeId: meetingType.id, start: slot.start, guestName, guestEmail },
      })
      if (data) {
        onBooked(data)
      } else if (error.code === 'validation_error') {
        setFields(error.fields)
        setMessage(undefined)
      } else {
        setFields({})
        setMessage(error.message)
        if (error.code === 'slot_taken' || error.code === 'slot_unavailable') {
          const day = slotDay(slot, timeZone)
          const fresh = await api.GET('/api/meeting-types/{id}/slots', {
            params: { path: { id: meetingType.id } },
          })
          setDaySlots(fresh.data?.filter((candidate) => slotDay(candidate, timeZone) === day) ?? [])
          onSlot(null)
        }
      }
    } catch {
      setFields({})
      setMessage('Не удалось отправить запрос. Попробуйте ещё раз')
    }
    setSubmitting(false)
  }

  return (
    <Stack mt="md">
      {slot && (
        <Text>
          {meetingType.name}: {slotRange(slot, timeZone)}
        </Text>
      )}
      {message && <Alert color="red">{message}</Alert>}
      {daySlots && (
        <SimpleGrid cols={4} spacing="xs">
          {daySlots.map((candidate) => (
            <Button
              key={candidate.start}
              variant={slot?.start === candidate.start ? 'filled' : 'default'}
              onClick={() => {
                setMessage(undefined)
                onSlot(candidate)
              }}
            >
              {slotTime(candidate, timeZone)}
            </Button>
          ))}
        </SimpleGrid>
      )}
      <TextInput
        label="Имя"
        required
        value={guestName}
        onChange={(event) => setGuestName(event.currentTarget.value)}
        error={fields.guestName}
      />
      <TextInput
        label="Email"
        required
        value={guestEmail}
        onChange={(event) => setGuestEmail(event.currentTarget.value)}
        error={fields.guestEmail}
      />
      <Group>
        <Button variant="default" onClick={onBack}>
          Назад
        </Button>
        <Button loading={submitting} disabled={!slot} onClick={submit}>
          Записаться
        </Button>
      </Group>
    </Stack>
  )
}

function Confirmation({ meeting, timeZone }: { meeting: Meeting; timeZone: string }) {
  return (
    <Stack mt="lg">
      <Title order={2}>Вы записаны</Title>
      <Text>{meeting.meetingType.name}</Text>
      <Text>{slotRange(meeting, timeZone)}</Text>
      <Text>{meeting.guestName}</Text>
      <Text>{meeting.guestEmail}</Text>
    </Stack>
  )
}

function Wizard({ id, owner }: { id?: string; owner?: Owner }) {
  const navigate = useNavigate()
  const [meetingType, setMeetingType] = useState<MeetingType | null>()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [onData, setOnData] = useState(false)
  const [meeting, setMeeting] = useState<Meeting>()
  const active = !id ? 0 : onData ? 2 : 1

  useEffect(() => {
    if (!id) return
    let current = true
    api.GET('/api/meeting-types/{id}', { params: { path: { id } } }).then(({ data }) => {
      if (current) setMeetingType(data ?? null)
    })
    return () => {
      current = false
    }
  }, [id])

  if (meeting && owner) return <Confirmation meeting={meeting} timeZone={owner.timeZone} />
  return (
    <Stepper
      active={active}
      mt="lg"
      onStepClick={(step) => {
        if (step >= active) return
        if (step === 0) void navigate('/book')
        else setOnData(false)
      }}
    >
      <Stepper.Step label="Тип встречи">
        <MeetingTypeList />
      </Stepper.Step>
      <Stepper.Step label="Время">
        {meetingType === null && (
          <Alert mt="md" color="red" title="Такого типа встречи нет">
            <Anchor component={Link} to="/book">
              К списку типов встреч
            </Anchor>
          </Alert>
        )}
        {meetingType && owner && (
          <TimeStep
            meetingType={meetingType}
            timeZone={owner.timeZone}
            slot={slot}
            onSlot={setSlot}
            onNext={() => setOnData(true)}
          />
        )}
      </Stepper.Step>
      <Stepper.Step label="Данные">
        {meetingType && owner && onData && (
          <DataStep
            meetingType={meetingType}
            timeZone={owner.timeZone}
            slot={slot}
            onSlot={setSlot}
            onBack={() => setOnData(false)}
            onBooked={setMeeting}
          />
        )}
      </Stepper.Step>
    </Stepper>
  )
}

function BookPage() {
  const { id } = useParams()
  const [owner, setOwner] = useState<Owner>()

  useEffect(() => {
    let active = true
    api.GET('/api/owner').then(({ data }) => {
      if (active) setOwner(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      {owner && (
        <>
          <Text mt="md">{owner.name}</Text>
          <Text c="dimmed">время по Москве</Text>
        </>
      )}
      <Wizard key={id ?? ''} id={id} owner={owner} />
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default BookPage
