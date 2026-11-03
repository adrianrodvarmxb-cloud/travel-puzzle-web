import Link from 'next/link';
import { LEGAL_PATHS, legalLabels } from '@/legal/lib/labels';
import { PRIVACIDAD_SIMPLIFICADO } from '@/legal/lib/privacidad';
import { toBlocks } from '@/legal/lib/blocks';

/** Aviso corto junto a un formulario: enlaces a T&C y privacidad + aviso simplificado desplegable. */
export function PrivacyFormNotice({ lang = 'es' }: { lang?: string }) {
  const l = legalLabels(lang);
  const blocks = toBlocks(PRIVACIDAD_SIMPLIFICADO);

  return (
    <div className="text-xs text-muted-foreground">
      <p>
        {l.formNotice}{' '}
        <Link href={LEGAL_PATHS.terms} target="_blank" className="underline hover:text-foreground">{l.terms}</Link>{' '}
        {l.and}{' '}
        <Link href={LEGAL_PATHS.privacy} target="_blank" className="underline hover:text-foreground">{l.privacy}</Link>.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer hover:text-foreground">{l.simplifiedTitle}</summary>
        <div className="mt-2 space-y-2">
          {blocks.map((b, i) =>
            b.type === 'list' ? null : <p key={i} className={b.type === 'p' ? undefined : 'font-semibold'}>{b.text}</p>
          )}
        </div>
      </details>
    </div>
  );
}
