'use client';

import { isValidElement, type ReactNode } from 'react';
import { motion } from 'framer-motion';

type AnimatedListProps = {
  children: ReactNode[];
  className?: string;
  /** Delay base entre items en segundos (default: 0.06) */
  staggerDelay?: number;
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wrapper que anima la aparición de cada hijo con un stagger escalonado.
 * Ideal para listas de DoctorCards, resultados de búsqueda, etc.
 *
 * @example
 * <AnimatedList className="grid gap-6 lg:grid-cols-2">
 *   {doctors.map(d => <DoctorCard key={d.id} ... />)}
 * </AnimatedList>
 */
export function AnimatedList({ children, className, staggerDelay = 0.06 }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children.map((child, index) => {
        const isElement = isValidElement<{ variant?: string; isSelected?: boolean }>(child);
        const key = isElement ? child.key || index : index;
        const isExpanded = isElement && (child.props.variant === 'expanded' || Boolean(child.props.isSelected));

        return (
          <motion.div
            key={key}
            layout
            variants={itemVariants}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={isExpanded ? 'col-span-1 md:col-span-2 w-full h-full' : 'w-full h-full'}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
