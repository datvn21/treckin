import * as React from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn, getAvatarUrl } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  name: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

const Avatar: React.FC<AvatarProps> = ({
  className,
  src,
  name,
  size = 'md',
  ...props
}) => {
  const avatarSrc = src || getAvatarUrl(name);

  return (
    <RadixAvatar.Root
      className={cn(
        "avatar rounded-full overflow-hidden shrink-0 flex items-center justify-center font-semibold text-white",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <RadixAvatar.Image
        src={avatarSrc}
        alt={name}
        className="w-full h-full object-cover rounded-full"
      />
      <RadixAvatar.Fallback
        className="flex w-full h-full items-center justify-center rounded-full"
        delayMs={200}
      >
        <img
          src="/assets/user_default.jpg"
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
};

Avatar.displayName = 'Avatar';

export { Avatar };
