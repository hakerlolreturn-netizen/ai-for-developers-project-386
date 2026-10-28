// PROTOTYPE: три варианта потока гостя на /book, переключаются через ?variant=A|B|C.
import { useSearchParams } from 'react-router'
import { PrototypeSwitcher } from '../components/PrototypeSwitcher.tsx'
import * as A from './book-prototype/VariantA.tsx'
import * as B from './book-prototype/VariantB.tsx'
import * as C from './book-prototype/VariantC.tsx'

const variants = [
  { key: 'A', name: A.name },
  { key: 'B', name: B.name },
  { key: 'C', name: C.name },
]

function BookPage() {
  const [params] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  return (
    <>
      {variant === 'A' && <A.VariantA key="A" />}
      {variant === 'B' && <B.VariantB key="B" />}
      {variant === 'C' && <C.VariantC key="C" />}
      <PrototypeSwitcher variants={variants} current={variant} />
    </>
  )
}

export default BookPage
