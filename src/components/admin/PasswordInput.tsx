'use client';
import { useState, type InputHTMLAttributes } from 'react';
import { inputCls } from './trips/fields';

/** Campo de contraseña con botón de ojo para mostrarla u ocultarla. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={show ? 'text' : 'password'} className={`${inputCls} pr-12`} />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={show}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#9AAEE0] hover:text-white"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {show && <line x1="3" y1="3" x2="21" y2="21" />}
                </svg>
            </button>
        </div>
    );
}
