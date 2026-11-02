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
  Title,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'

type Owner = components['schemas']['Owner']
type MeetingType = components['schemas']['MeetingType']
type Slot = components['schemas']['Slot']

const WINDOW_DAYS = 14

// Slot times carry the owner's offset, so the date and time are read from the string as is.
const slotDay = (slot: Slot) => slot.start.slice(0, 10)
const slotTime = (slot: Slot) => slot.start.slice(11, 16)

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
  const [day, setDay] = useState<string | null>(slot ? slotDay(slot) : null)

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
  const freeDays = new Set(slots?.map(slotDay))
  const daySlots = slots?.filter((candidate) => slotDay(candidate) === day) ?? []

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
              {slotTime(candidate)}
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

function SelectedMeetingType({
  id,
  timeZone,
  slot,
  onSlot,
  onNext,
}: {
  id: string
  timeZone: string
  slot: Slot | null
  onSlot: (slot: Slot) => void
  onNext: () => void
}) {
  const [meetingType, setMeetingType] = useState<MeetingType | null>()

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types/{id}', { params: { path: { id } } }).then(({ data }) => {
      if (active) setMeetingType(data ?? null)
    })
    return () => {
      active = false
    }
  }, [id])

  if (meetingType === undefined) return null
  if (meetingType === null) {
    return (
      <Alert mt="md" color="red" title="Такого типа встречи нет">
        <Anchor component={Link} to="/book">
          К списку типов встреч
        </Anchor>
      </Alert>
    )
  }
  return (
    <TimeStep
      meetingType={meetingType}
      timeZone={timeZone}
      slot={slot}
      onSlot={onSlot}
      onNext={onNext}
    />
  )
}

function Wizard({ id, owner }: { id?: string; owner?: Owner }) {
  const navigate = useNavigate()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [onData, setOnData] = useState(false)
  const active = !id ? 0 : onData ? 2 : 1

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
        {id && owner && (
          <SelectedMeetingType
            id={id}
            timeZone={owner.timeZone}
            slot={slot}
            onSlot={setSlot}
            onNext={() => setOnData(true)}
          />
        )}
      </Stepper.Step>
      <Stepper.Step label="Данные" />
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
