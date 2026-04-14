import Image from 'next/image';
import clsx from 'clsx';
import styles from './Avatar.module.css';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64,
};

interface AvatarProps {
  size?: AvatarSize;
  name: string;
  src?: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  size = 'md',
  name,
  src,
  className,
}: AvatarProps) {
  if (!src) {
    return (
      <span
        className={clsx(styles.avatar, styles.fallback, styles[size], className)}
        role="img"
        aria-label={name}
      >
        {getInitials(name)}
      </span>
    );
  }

  const px = sizeMap[size];

  return (
    <Image
      src={src}
      alt={name}
      width={px}
      height={px}
      className={clsx(styles.avatar, styles[size], className)}
    />
  );
}
