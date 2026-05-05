import { motion } from 'framer-motion';

interface Props {
  label?: string;
}

export function Loader({ label }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      minHeight: '100%',
      width: '100%',
    }}>
      <div className="mm-loader">
        <div className="mm-loader-box1" />
        <div className="mm-loader-box2" />
        <div className="mm-loader-box3" />
      </div>
      {label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: '#525252', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
