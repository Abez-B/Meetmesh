import { motion, HTMLMotionProps } from 'framer-motion';

interface Props extends HTMLMotionProps<"button"> {
  text: string;
  tooltip?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'success';
}

export function TooltipButton({ text, tooltip, icon, variant = 'default', className = '', style, ...props }: Props) {
  const vClass = variant === 'default' || variant === 'primary' ? '' : `btn-31--${variant}`;
  
  return (
    <motion.button 
      className={`btn-31 ${vClass} ${className}`} 
      title={tooltip}
      style={{ ...style } as any}
      whileTap={{ scale: 0.97 }}
      {...props as any}
    >
      <span className="text-container">
        <span className="text">{text}</span>
      </span>
    </motion.button>
  );
}
