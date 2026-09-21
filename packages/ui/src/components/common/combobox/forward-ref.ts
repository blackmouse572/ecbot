import {
  type PropsWithoutRef,
  type ReactNode,
  type Ref,
  type RefAttributes,
  forwardRef,
} from "react";

export function genericForwardRef<T, P>(
  render: (props: PropsWithoutRef<P>, ref: Ref<T>) => ReactNode,
): (props: P & RefAttributes<T>) => ReactNode {
  return forwardRef(render) as any;
}
