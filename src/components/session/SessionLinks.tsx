import { Link as RouterLink, NavLink as RouterNavLink, useLocation } from 'react-router';
import type { ComponentProps } from 'react';

// Keep the session entry context through tabs and links to filtered solves.
export function Link(props: ComponentProps<typeof RouterLink>) {
  const { state } = useLocation();

  return <RouterLink state={state} {...props} />;
}

export function NavLink(props: ComponentProps<typeof RouterNavLink>) {
  const { state } = useLocation();

  return <RouterNavLink state={state} {...props} />;
}
