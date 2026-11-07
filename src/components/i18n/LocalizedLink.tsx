'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLocalizedHref } from './useLocalizedHref';

type Props = ComponentProps<typeof NextLink>;

/**
 * REQ-655: `next/link` que conserva el idioma de la URL (LSP: mismas props y mismo comportamiento que Link).
 * Solo cambia el href cuando es texto y el idioma sale de la URL; un href objeto (UrlObject) pasa igual.
 */
export default function LocalizedLink({ href, ...rest }: Props) {
  const localize = useLocalizedHref();
  return <NextLink href={typeof href === 'string' ? localize(href) : href} {...rest} />;
}
