import Card from '../ui/Card';

/** Card on white + green auth background */
export default function AuthCard({ children, className = '' }) {
  return (
    <Card
      className={`border border-growe/25 bg-white/95 shadow-xl shadow-growe/10 backdrop-blur-sm dark:border-growe/30 dark:bg-white/95 dark:shadow-growe/15 ${className}`}
      padding
    >
      {children}
    </Card>
  );
}
