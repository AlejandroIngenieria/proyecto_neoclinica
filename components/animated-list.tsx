'use client';

import { isValidElement, type ReactNode } from 'react';
import { motion } from 'framer-motion';

type AnimatedListProps = {
  children: ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  /** Delay base entre items en segundos (default: 0.015) */
  staggerDelay?: number;
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wrapper que anima la aparición de cada hijo con un stagger escalonado rápido.
 * Ideal para listas de DoctorCards, resultados de búsqueda, etc.
 *
 * @example
 * <AnimatedList className="grid gap-6 lg:grid-cols-2">
 *   {doctors.map(d => <DoctorCard key={d.id} ... />)}
 * </AnimatedList>
 */
export function AnimatedList({ children, className, style, staggerDelay = 0.015 }: AnimatedListProps) {
  return (
    <motion.div
      layout
      className={className}
      style={style}
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
        const isElement = isValidElement<{ variant?: string; isSelected?: boolean; isExpanded?: boolean; className?: string }>(child);
        const key = isElement ? child.key || index : index;
        const isExpanded = isElement && (
          child.props.variant === 'expanded' ||
          Boolean(child.props.isSelected) ||
          Boolean(child.props.isExpanded) ||
          child.props.className?.includes('col-span-full')
        );

        return (
          <motion.div
            key={key}
            layout
            variants={itemVariants}
            transition={{ layout: { type: "spring", stiffness: 220, damping: 26, mass: 0.8 }, duration: 0.25 }}
            className={isExpanded ? 'col-span-full w-full h-full' : 'w-full h-full'}
            style={isExpanded ? { gridColumn: '1 / -1' } : undefined}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
