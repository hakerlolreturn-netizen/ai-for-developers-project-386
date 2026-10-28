// PROTOTYPE: вариант C — одна форма в одну колонку, всё на одном экране.
import {
  Alert,
  Button,
  Chip,
  Container,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useMemo, useState } from 'react'
import { StateDump } from '../../components/PrototypeSwitcher.tsx'
import {
  type ApiError,
  type Meeting,
  createMeeting,
  formatDay,
  getSlots,
  groupByDay,
  meetingTypes,
  owner,
  timeLabel,
  windowBounds,
} from './stub.ts'

export const name = 'Одна форма'

export function VariantC() {
  const [typeId, setTypeId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [version, setVersion] = useState(0)

  const type = meetingTypes.find((t) => t.id === typeId)
  const byDay = useMemo(() => groupByDay(typeId ? getSlots(typeId) : []), [typeId, version])
  const daySlots = day ? (byDay.get(day) ?? []) : []
  const slot = daySlots.find((s) => s.start === start)
  const { min, max } = windowBounds()

  const submit = async () => {
    if (!typeId || !start) return
    const res = await createMeeting(typeId, start, guestName, guestEmail)
    if (res.ok) {
      setMeeting(res.meeting)
      setError(null)
    } else {
      setError(res.error)
      if (res.error.code !== 'validation_error') {
        setStart(null)
        setVersion((v) => v + 1)
      }
    }
  }

  const state = {
    typeId,
    day,
    start,
    guestName,
    guestEmail,
    error,
    meeting,
    slotsOnDay: daySlots.length,
  }

  if (meeting) {
    return (
      <Container size="xs" py="xl">
        <Alert color="green" title="Вы записаны">
          {meeting.meetingType.name}, {formatDay(meeting.start.slice(0, 10))},{' '}
          {timeLabel(meeting.start)}–{timeLabel(meeting.end)} по Москве
        </Alert>
        <Button
          mt="md"
          variant="default"
          onClick={() => {
            setMeeting(null)
            setStart(null)
            setVersion((v) => v + 1)
          }}
        >
          Записаться ещё
        </Button>
        <StateDump state={state} />
      </Container>
    )
  }

  return (
    <Container size="xs" py="xl">
      <Title order={2}>Запись на звонок</Title>
      <Text c="dimmed" mb="lg">
        {owner.name}. Время указано по Москве
      </Text>
      <Stack>
        <Radio.Group
          label="1. Тип встречи"
          value={typeId}
          onChange={(v) => {
            setTypeId(v)
            setDay(null)
            setStart(null)
          }}
        >
          <Stack gap="xs" mt="xs">
            {meetingTypes.map((t) => (
              <Radio.Card key={t.id} value={t.id} p="sm" radius="md">
                <Group wrap="nowrap" align="flex-start">
                  <Radio.Indicator />
                  <div>
                    <Text fw={600}>
                      {t.name} · {t.durationMinutes} мин
                    </Text>
                    {t.description && (
                      <Text size="sm" c="dimmed">
                        {t.description}
                      </Text>
                    )}
                  </div>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>

        <DatePickerInput
          label="2. День"
          placeholder={type ? 'Выберите день' : 'Сначала выберите тип встречи'}
          disabled={!type}
          value={day}
          onChange={(d) => {
            setDay(d)
            setStart(null)
          }}
          minDate={min}
          maxDate={max}
          excludeDate={(d) => !byDay.has(d)}
          valueFormat="dddd, D MMMM"
        />

        {day && (
          <div>
            <Text size="sm" fw={500} mb="xs">
              3. Время
            </Text>
            <Chip.Group multiple={false} value={start} onChange={setStart}>
              <Group gap="xs">
                {daySlots.map((s) => (
                  <Chip key={s.start} value={s.start}>
                    {timeLabel(s.start)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </div>
        )}

        <TextInput
          label="4. Имя"
          value={guestName}
          onChange={(e) => setGuestName(e.currentTarget.value)}
          error={error?.fields?.guestName}
        />
        <TextInput
          label="Email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.currentTarget.value)}
          error={error?.fields?.guestEmail}
        />

        {error && error.code !== 'validation_error' && (
          <Alert color="red" title={error.message}>
            Свободное время этого дня обновлено
          </Alert>
        )}

        <Button size="md" disabled={!slot} onClick={submit}>
          {slot && day
            ? `Записаться: ${formatDay(day)}, ${timeLabel(slot.start)}–${timeLabel(slot.end)}`
            : 'Записаться'}
        </Button>
      </Stack>
      <StateDump state={state} />
    </Container>
  )
}
