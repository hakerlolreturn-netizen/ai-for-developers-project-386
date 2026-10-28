// PROTOTYPE: переключатель вариантов прототипа, в production-сборке не рендерится.
import { ActionIcon, Checkbox, Code, Group, Paper, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { sim } from '../pages/book-prototype/stub.ts'

type Props = { variants: { key: string; name: string }[]; current: string }

export function PrototypeSwitcher({ variants, current }: Props) {
  const [, setParams] = useSearchParams()
  const [conflict, setConflict] = useState(sim.conflictNext)
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )

  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length]
    setParams({ variant: next.key }, { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (el instanceof HTMLElement && el.isContentEditable) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const id = setInterval(() => setConflict(sim.conflictNext), 300)
    return () => clearInterval(id)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <Paper
      shadow="xl"
      radius="xl"
      px="md"
      py={6}
      bg="dark.7"
      c="white"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <Group gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray.0"
          onClick={() => go(-1)}
          aria-label="Предыдущий вариант"
        >
          ←
        </ActionIcon>
        <Text size="sm" fw={600}>
          {variants[index].key} ({variants[index].name})
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray.0"
          onClick={() => go(1)}
          aria-label="Следующий вариант"
        >
          →
        </ActionIcon>
        <Checkbox
          size="xs"
          color="red"
          label={
            <Text size="xs" c="white">
              Следующая запись — конфликт
            </Text>
          }
          checked={conflict}
          onChange={(e) => {
            sim.conflictNext = e.currentTarget.checked
            setConflict(sim.conflictNext)
          }}
        />
      </Group>
    </Paper>
  )
}

export function StateDump({ state }: { state: unknown }) {
  if (!import.meta.env.DEV) return null
  return (
    <Code block mt="xl" mb={80} fz="xs">
      {JSON.stringify(state, null, 2)}
    </Code>
  )
}
