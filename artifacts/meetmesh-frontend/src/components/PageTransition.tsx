import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const ROUTE_DEPTH: Record<string, number> = {
  '/':        0,
  '/join':    1,
  '/waiting': 2,
  '/meeting': 3,
  '/manage':  3,
  '/present': 4,
};

function routeDepth(pathname: string): number {
  const segments = pathname.split('/').filter(Boolean);
  const base = '/' + (segments[0] ?? '');
  if (base === '/join' && segments[2] === 'waiting') return ROUTE_DEPTH['/waiting'];
  return ROUTE_DEPTH[base] ?? 1;
}

let _prevDepth = 0;

const variants = {
  initial: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? 18 : -18,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? -12 : 12,
    scale: 0.985,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  }),
};

interface PageTransitionProps {
  children: ReactNode;
  pathname: string;
}

export function PageTransition({ children, pathname }: PageTransitionProps) {
  const depth = routeDepth(pathname);
  const dir = depth - _prevDepth >= 0 ? 1 : -1;
  _prevDepth = depth;

  return (
    <motion.div
      key={pathname}
      custom={dir}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'contents' }}
    >
      {children}
    </motion.div>
  );
}
