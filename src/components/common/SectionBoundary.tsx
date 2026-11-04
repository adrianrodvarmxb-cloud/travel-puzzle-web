'use client';
import { Component, type ReactNode } from 'react';

/**
 * REQ-002: si una sección falla en el navegador, se oculta y el resto de la página sigue (INC-001).
 * `name` aparece en la consola para encontrar la sección que falló.
 */
export class SectionBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error) {
        console.error(`[sección ${this.props.name}] se ocultó por un error:`, error.message);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}
