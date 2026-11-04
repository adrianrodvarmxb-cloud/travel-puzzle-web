'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DRIVE_SRC, shouldLoadDrive, type DriveConfig } from '@/affiliates/lib/drive';

/** REQ-027: inserta el script de Travelpayouts una sola vez, solo en las rutas permitidas. No pinta nada. */
export function AffiliateDrive({ config }: { config: DriveConfig }) {
    const pathname = usePathname() ?? '/';
    useEffect(() => {
        if (!shouldLoadDrive(pathname, config)) return;
        if (document.querySelector(`script[src="${DRIVE_SRC}"]`)) return;
        const s = document.createElement('script');
        s.async = true;
        s.src = DRIVE_SRC;
        s.setAttribute('data-cmp-ab', '2');
        document.head.appendChild(s);
    }, [pathname, config]);
    return null;
}
