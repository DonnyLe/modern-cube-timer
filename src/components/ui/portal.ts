import { createRef } from 'react';

// Portaled layers render inside the themed app root so they inherit its CSS variables.
export const portalContainer = createRef<HTMLDivElement>();
