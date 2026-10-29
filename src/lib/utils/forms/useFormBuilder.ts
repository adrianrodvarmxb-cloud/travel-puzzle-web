import { IFormAndErrorMap } from "@/types/IFormAndErrorMap"
import { ExtractErrors, ExtractForm, ExtractHandlers, UseFormBuilderArgs, UseFormBuilderReturn } from "@/types/IFormAndErrorMap";
import { isEmpty } from "lodash";
import { useState, useEffect } from "react";
// import { toast } from "react-toastify";

export function useFormBuilder<T extends IFormAndErrorMap<any, any, any>>(
    { builderService }: UseFormBuilderArgs<T>
): UseFormBuilderReturn<T> {
    type Form = ExtractForm<T>;
    type Errors = ExtractErrors<T>;
    type Handlers = ExtractHandlers<T>;

    const [form, setForm] = useState<Form>(builderService.form);
    const [errors, setErrors] = useState<Errors>(builderService.error);
    const [isReady, setIsReady] = useState(false);
    const handlers: Handlers = builderService.handlers(setForm, setErrors);

    // Mark form as ready after initialization
    // This ensures all nested objects are properly initialized before rendering
    useEffect(() => {
        setIsReady(true);
    }, []);

    const isFormValid = (): boolean => {
        if (builderService.validateForm) {
            console.log('validateForm');
            console.log(form);
            console.log(errors);
            const res = builderService.validateForm(form, errors)
            console.log('validateForm res');
            console.log(res);

            if (res && !isEmpty(res)) {
                setErrors(res)
                console.error('Invalid form', res);
                // toast.error(D.errors.invalidForm);
                return false
            }
        }
        return true
    }

    const resetForm = () => {
        setForm(builderService.form)
        setErrors(builderService.error)
    }


    return {
        form,
        setForm,
        errors,
        setErrors,
        handlers,
        isFormValid,
        labels: builderService.labels,
        resetForm,
        isReady,
    }
}