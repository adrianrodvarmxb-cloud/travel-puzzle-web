import { StateAction } from "@/globals";

export interface IFormAndErrorMap<Form, Errors, Handlers = any, T = any> {
    form: Form,
    error: Errors,
    handlers: (
        setForm: StateAction<Form>,
        setErrors: StateAction<Errors>
    ) => Handlers,
    validateForm?: (form: Form, errors: Errors, extras?: T) => Errors | undefined,
    labels?: Partial<Record<keyof Form, string>>
}

export type ExtractForm<T> = T extends IFormAndErrorMap<infer F, any, any> ? F : never;
export type ExtractErrors<T> = T extends IFormAndErrorMap<any, infer E, any> ? E : never;
export type ExtractHandlers<T> = T extends IFormAndErrorMap<any, any, infer H> ? H : never;

export type UseFormBuilderArgs<T extends IFormAndErrorMap<any, any, any>> = {
    builderService: T;
};

export type UseFormBuilderReturn<T> = {
    form: ExtractForm<T>;
    setForm: React.Dispatch<React.SetStateAction<ExtractForm<T>>>;
    errors: ExtractErrors<T>;
    setErrors: React.Dispatch<React.SetStateAction<ExtractErrors<T>>>;
    handlers: ExtractHandlers<T>;
    resetForm: () => void;
    isFormValid: () => boolean;
    labels?: Partial<Record<keyof ExtractForm<T>, string>>;
    isReady: boolean;
};