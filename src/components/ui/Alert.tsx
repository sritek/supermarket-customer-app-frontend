import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          {
            'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200': variant === 'destructive',
            'border-border bg-background text-foreground': variant === 'default',
          },
          className
        )}
        {...props}
      >
        {variant === 'destructive' && (
          <AlertCircle className="h-4 w-4 absolute top-4 left-4 text-red-600 dark:text-red-400" />
        )}
        <div className={variant === 'destructive' ? 'pl-7' : ''}>
          {children}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;

