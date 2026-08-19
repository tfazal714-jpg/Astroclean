import { Children, cloneElement, isValidElement } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { cn } from '../../utils/cn.js'

/**
 * Reveals its children one after another with a small step delay once the
 * container scrolls into view. Children are plain elements; each receives a
 * fade-up animation via a wrapper.
 */
export default function Stagger({
  children,
  className,
  step = 45,
  baseDelay = 0,
  once = true,
  as: Tag = 'div',
  ...props
}) {
  const { ref, inView } = useInView({ once })
  const count = Children.count(children)

  return (
    <Tag ref={ref} className={cn(className)} {...props}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child
        const delay = baseDelay + i * step
        return cloneElement(child, {
          style: {
            ...(child.props.style ?? {}),
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'translateY(14px)',
            transition: `opacity 450ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 450ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
          },
        })
      })}
      {/* eslint-disable-next-line react/no-unknown-property -- hidden counter used by tests */}
      <span data-stagger-count={count} className="hidden" aria-hidden="true" />
    </Tag>
  )
}
