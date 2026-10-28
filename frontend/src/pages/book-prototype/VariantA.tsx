// PROTOTYPE: вариант A — пошаговый мастер (Stepper), каждый шаг отдельным экраном.
import {
  Alert,
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
import { useMemo, useState } from 'react'
import { StateDump } from '../../components/PrototypeSwitcher.tsx'
import {
  type ApiError,
  type Meeting,
  type Slot,
  createMeeting,
  formatDay,
  getSlots,
  groupByDay,
  meetingTypes,
  owner,
  timeLabel,
  windowBounds,
} from './stub.ts'

export const name = 'Пошаговый мастер'

export function VariantA() {
  const [step, setStep] = useState(0)
  const [typeId, setTypeId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [version, setVersion] = useState(0)

  const type = meetingTypes.find((t) => t.id === typeId)
  // version обновляет слоты после конфликта
  const byDay = useMemo(() => groupByDay(typeId ? getSlots(typeId) : []), [typeId, version])
  const daySlots = day ? (byDay.get(day) ?? []) : []
  const { min, max } = windowBounds()

  const submit = async () => {
    if (!typeId || !slot) return
    const res = await createMeeting(typeId, slot.start, guestName, guestEmail)
    if (res.ok) {
      setMeeting(res.meeting)
      setError(null)
      setStep(3)
    } else {
      setError(res.error)
      if (res.error.code === 'slot_taken' || res.error.code === 'slot_unavailable') {
        setSlot(null)
        setVersion((v) => v + 1)
      }
    }
  }

  const slotButtons = (
    <SimpleGrid cols={4} spacing="xs">
      {daySlots.map((s) => (
        <Button
          key={s.start}
          variant={slot?.start === s.start ? 'filled' : 'default'}
          onClick={() => setSlot(s)}
        >
          {timeLabel(s.start)}
        </Button>
      ))}
    </SimpleGrid>
  )

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      <Text c="dimmed" mb="lg">
        {owner.name} · время по Москве
      </Text>
      <Stepper active={step} onStepClick={(s) => s < step && step < 3 && setStep(s)}>
        <Stepper.Step label="Тип встречи">
          <Stack mt="md">
            {meetingTypes.map((t) => (
              <Paper
                key={t.id}
                withBorder
                p="md"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setTypeId(t.id)
                  setDay(null)
                  setSlot(null)
                  setStep(1)
                }}
              >
                <Group justify="space-between">
                  <Text fw={600}>{t.name}</Text>
                  <Badge variant="light">{t.durationMinutes} мин</Badge>
                </Group>
                {t.description && (
                  <Text size="sm" c="dimmed" mt={4}>
                    {t.description}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Время">
          <Stack mt="md">
            <Text>
              {type?.name}, {type?.durationMinutes} мин
            </Text>
            <Group align="flex-start" gap="xl">
              <DatePicker
                value={day}
                onChange={(d) => {
                  setDay(d)
                  setSlot(null)
                }}
                minDate={min}
                maxDate={max}
                excludeDate={(d) => !byDay.has(d)}
              />
              <Stack style={{ flex: 1 }}>
                {day ? (
                  <>
                    <Text fw={600}>{formatDay(day)}</Text>
                    {slotButtons}
                  </>
                ) : (
                  <Text c="dimmed">Выберите день</Text>
                )}
              </Stack>
            </Group>
            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setStep(0)}>
                Назад
              </Button>
              <Button disabled={!slot} onClick={() => setStep(2)}>
                Далее
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Данные">
          <Stack mt="md">
            {slot && day && (
              <Text>
                {type?.name}: {formatDay(day)}, {timeLabel(slot.start)}–{timeLabel(slot.end)}
              </Text>
            )}
            {error && error.code !== 'validation_error' && (
              <Alert color="red" title={error.message}>
                Слоты этого дня обновлены
                {day && <Text mt="xs">{formatDay(day)}</Text>}
                <Stack mt="xs">{slotButtons}</Stack>
              </Alert>
            )}
            <TextInput
              label="Имя"
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
            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setStep(1)}>
                Назад
              </Button>
              <Button disabled={!slot} onClick={submit}>
                Записаться
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
        <Stepper.Completed>
          {meeting && (
            <Alert color="green" title="Вы записаны" mt="md">
              {meeting.meetingType.name}: {formatDay(meeting.start.slice(0, 10))},{' '}
              {timeLabel(meeting.start)}–{timeLabel(meeting.end)} по Москве. {meeting.guestName},{' '}
              {meeting.guestEmail}
            </Alert>
          )}
        </Stepper.Completed>
      </Stepper>
      <StateDump
        state={{
          step,
          typeId,
          day,
          slot,
          guestName,
          guestEmail,
          error,
          meeting,
          slotsOnDay: daySlots.length,
        }}
      />
    </Container>
  )
}
