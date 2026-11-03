'use client';
import { useState } from 'react';
/* eslint-disable @next/next/no-img-element */
import { imageUrl } from '@/trips/lib/image';
import { Section, Input, smallBtn } from './fields';
import type { TripFormState, Patch } from './types';

/** Fotos: subir a R2, texto alternativo, orden (la primera es la portada) y quitar. */
export function PhotosSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function upload(files: FileList | null) {
        if (!files?.length) return;
        setBusy(true);
        setError(null);
        const added: TripFormState['images'] = [];
        for (const file of Array.from(files)) {
            const body = new FormData();
            body.append('file', file);
            const res = await fetch('/api/admin/fotos', { method: 'POST', body });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setError(`${file.name}: ${json.error ?? 'no se pudo subir'}`); continue; }
            added.push({ key: json.key, alt: '' });
        }
        patch({ images: [...v.images, ...added] });
        setBusy(false);
    }

    const move = (i: number, to: number) => {
        const imgs = [...v.images];
        const [it] = imgs.splice(i, 1);
        imgs.splice(to, 0, it);
        patch({ images: imgs });
    };

    return (
        <Section n={5} title="Fotos">
            <label className={`${smallBtn} inline-block cursor-pointer`}>
                {busy ? 'Subiendo…' : 'Subir fotos (JPG, PNG o WebP, hasta 5 MB)'}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </label>
            {error && <p className="text-xs text-[#FF8A73]">{error}</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
                {v.images.map((img, i) => (
                    <li key={img.key} className="overflow-hidden rounded-xl border border-white/10">
                        <img src={imageUrl(img.key)} alt={img.alt} className="aspect-video w-full object-cover" />
                        <div className="space-y-2 p-3">
                            {i === 0 && <span className="font-data text-[10px] uppercase tracking-wider text-[#EAF54F]">Portada</span>}
                            <Input placeholder="Descripción de la foto" value={img.alt} onChange={(e) => patch({ images: v.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) })} />
                            <div className="flex gap-2">
                                <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, i - 1)}>←</button>
                                <button type="button" className={smallBtn} disabled={i === v.images.length - 1} onClick={() => move(i, i + 1)}>→</button>
                                <button type="button" className={smallBtn} onClick={() => patch({ images: v.images.filter((_, j) => j !== i) })}>Quitar</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
