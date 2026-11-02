import { Anchor, Badge, Container, Group, List, Stack, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'

type Meeting = components['schemas']['Meeting']

// Meeting times carry the owner's offset, so the day and time are read from the string as is.
const meetingDay = (meeting: Meeting) => meeting.start.slice(0, 10)
const timeRange = (meeting: Meeting) =>
  `${meeting.start.slice(11, 16)}–${meeting.end.slice(11, 16)}`

function groupByDay(meetings: Meeting[]) {
  const days = new Map<string, Meeting[]>()
  for (const meeting of meetings) {
    const day = meetingDay(meeting)
    days.set(day, [...(days.get(day) ?? []), meeting])
  }
  return [...days]
}

function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>()
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    api.GET('/api/meetings').then(({ data }) => {
      if (active) setMeetings(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Предстоящие встречи · время по Москве</Title>
      {meetings?.length === 0 && <Text mt="md">Предстоящих встреч нет</Text>}
      <Stack mt="md" gap="lg">
        {groupByDay(meetings ?? []).map(([day, dayMeetings]) => (
          <div key={day}>
            <Title order={2} size="h4">
              {dayjs(day).locale('ru').format('dddd, D MMMM')}
            </Title>
            <List listStyleType="none" mt="xs" spacing="xs">
              {dayMeetings.map((meeting) => (
                <List.Item key={meeting.id}>
                  <Group gap="xs">
                    <Text>
                      {`${timeRange(meeting)} · ${meeting.meetingType.name} · ${meeting.guestName} · ${meeting.guestEmail}`}
                    </Text>
                    {new Date(meeting.start).getTime() <= now && (
                      <Badge color="green">идёт сейчас</Badge>
                    )}
                  </Group>
                </List.Item>
              ))}
            </List>
          </div>
        ))}
      </Stack>
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default MeetingsPage
