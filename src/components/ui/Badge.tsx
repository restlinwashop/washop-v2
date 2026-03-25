import { cn } from '@/lib/utils'

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'

const variantClasses: Record<BadgeVariant, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-700',
  gray:   'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'gray', className, children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}
