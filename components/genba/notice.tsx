import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type NoticeVariant = 'info' | 'success' | 'warning' | 'destructive'

export function Notice({
  variant = 'info',
  title,
  lines,
}: {
  variant?: NoticeVariant;
  title: string;
  lines: string[];
}) {
  if (!lines.length) return null

  return (
    <Alert variant={variant}>
      <AlertTitle className='mb-2'>{title}</AlertTitle>
      <AlertDescription>
        <ul className="space-y-0.5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
