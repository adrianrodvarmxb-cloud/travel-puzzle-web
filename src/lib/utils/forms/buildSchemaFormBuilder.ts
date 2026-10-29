import { StateAction } from "@/globals";
import { build_UpdateForm, build_UpdateNestedForm, getDefaults, SchemaGetDescriptions, SchemaToString, ZodMapErrors } from "@/lib/utils/zod-utils";
import { IFormAndErrorMap } from "@/types/IFormAndErrorMap";
import z from "zod";

/**
 * Creates error map type from a Zod schema type (recursive for nested objects)
 */
export type SchemaErrorsMap<T> = {
    [P in keyof T]: T[P] extends (infer U)[]
        ? SchemaErrorsMap<U>[]
        : T[P] extends object
        ? SchemaErrorsMap<T[P]>
        : string;
};

/**
 * Helper type to check if a type is a primitive (not an object or array)
 */
type IsPrimitive<T> = T extends string | number | boolean | null | undefined | Date
    ? true
    : T extends (infer U)[]
    ? false
    : T extends object
    ? false
    : true;

/**
 * Creates handlers type from a Zod schema type (recursive for nested objects and arrays)
 * - For primitives: creates direct handler functions
 * - For objects: creates nested handler objects
 * - For arrays: creates array handler with index access
 * - Handlers are always defined, even for optional fields
 */
export type SchemaHandlers<T> = {
    [P in keyof T]-?: T[P] extends (infer U)[]
        ? {
              (index: number): SchemaHandlers<U>;
          }
        : T[P] extends object
        ? IsPrimitive<T[P]> extends true
            ? (value: T[P]) => void
            : SchemaHandlers<T[P]>
        : (value: T[P]) => void;
};

/**
 * Extracts the handlers type from a schema builder result
 * Similar to ExtractHandlers but for schema builders
 * 
 * @example
 * ```ts
 * type MyHandlers = ExtractSchemaHandlers<ReturnType<typeof buildFTBookingDTO>>;
 * ```
 */
export type ExtractSchemaHandlers<T> = T extends IFormAndErrorMap<any, any, infer H>
    ? H
    : never;

/**
 * Unwraps optional, nullable, or default wrappers to get the inner type
 */
function unwrapZodType(schema: any): any {
    if (schema instanceof z.ZodOptional || schema?._def?.typeName === 'ZodOptional') {
        return unwrapZodType(schema._def.innerType);
    }
    if (schema instanceof z.ZodNullable || schema?._def?.typeName === 'ZodNullable') {
        return unwrapZodType(schema._def.innerType);
    }
    if (schema instanceof z.ZodDefault || schema?._def?.typeName === 'ZodDefault') {
        return unwrapZodType(schema._def.innerType);
    }
    return schema;
}

/**
 * Checks if a Zod type is an object (after unwrapping)
 */
function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<any, any> {
    const unwrapped = unwrapZodType(schema);
    return unwrapped instanceof z.ZodObject;
}

/**
 * Checks if a Zod type is an array (after unwrapping)
 */
function isZodArray(schema: z.ZodTypeAny): schema is z.ZodArray<any> {
    const unwrapped = unwrapZodType(schema);
    return unwrapped instanceof z.ZodArray;
}

/**
 * Builds form handlers automatically from schema shape (recursive for nested objects and arrays)
 */
function buildFormHandlers<Form, Errors, PartialForm>(
    schema: z.ZodObject<any, any>,
    setForm: StateAction<Form>,
    setErrors: StateAction<Errors>,
    useNested: boolean = false,
    basePath: string = ''
): SchemaHandlers<Form> {
    const handlers = {} as SchemaHandlers<Form>;
    const updateFunc = useNested
        ? build_UpdateNestedForm<Form, Errors>(setForm, setErrors)
        : build_UpdateForm<Form, Errors, PartialForm>(setForm, setErrors);

    // Iterate over schema shape to create handlers for each field
    Object.keys(schema.shape).forEach((key) => {
        const typedKey = key as keyof Form;
        const fieldSchema = schema.shape[key];
        const unwrappedSchema = unwrapZodType(fieldSchema);
        const currentPath = basePath ? `${basePath}.${key}` : key;

        if (isZodObject(unwrappedSchema)) {
            // Nested object: create nested handler object
            if (useNested) {
                // Recursively build nested handlers
                handlers[typedKey] = buildFormHandlers(
                    unwrappedSchema,
                    setForm,
                    setErrors,
                    true,
                    currentPath
                ) as SchemaHandlers<Form>[typeof typedKey];
            } else {
                // Non-nested mode: create handler that takes full object
                handlers[typedKey] = ((value: Form[typeof typedKey]) => {
                    (updateFunc as ReturnType<typeof build_UpdateForm>)({ [key]: value } as PartialForm);
                }) as SchemaHandlers<Form>[typeof typedKey];
            }
        } else if (isZodArray(unwrappedSchema)) {
            // Array: create handler that accepts index and returns nested handlers
            const zodArray = unwrappedSchema as z.ZodArray<any>;
            const elementSchema = zodArray._def.type as any;
            if (elementSchema && isZodObject(elementSchema)) {
                // Array of objects: create index-based handler
                handlers[typedKey] = ((index: number) => {
                    return buildFormHandlers(
                        elementSchema,
                        setForm,
                        setErrors,
                        true,
                        `${currentPath}[${index}]`
                    ) as any;
                }) as SchemaHandlers<Form>[typeof typedKey];
            } else {
                // Array of primitives: create handler that updates array element
                if (useNested) {
                    handlers[typedKey] = ((index: number) => {
                        return (value: any) => {
                            (updateFunc as ReturnType<typeof build_UpdateNestedForm>)(`${currentPath}[${index}]`, value);
                        };
                    }) as unknown as SchemaHandlers<Form>[typeof typedKey];
                } else {
                    // For non-nested mode, arrays are handled as full array updates
                    handlers[typedKey] = ((value: Form[typeof typedKey]) => {
                        (updateFunc as ReturnType<typeof build_UpdateForm>)({ [key]: value } as PartialForm);
                    }) as SchemaHandlers<Form>[typeof typedKey];
                }
            }
        } else {
            // Primitive field: create direct handler
            if (useNested) {
                handlers[typedKey] = ((value: Form[typeof typedKey]) => {
                    (updateFunc as ReturnType<typeof build_UpdateNestedForm>)(currentPath, value);
                }) as SchemaHandlers<Form>[typeof typedKey];
            } else {
                handlers[typedKey] = ((value: Form[typeof typedKey]) => {
                    (updateFunc as ReturnType<typeof build_UpdateForm>)({ [key]: value } as PartialForm);
                }) as SchemaHandlers<Form>[typeof typedKey];
            }
        }
    });

    return handlers;
}

/**
 * Generic function to build a form builder from a Zod schema
 * 
 * @param schema - Zod schema object
 * @param options - Optional configuration
 * @param options.nestedForm - If true, enables nested handler access (e.g., handlers.customer.firstName())
 * @param options.customHandlers - Custom handler builder function (overrides auto-generation)
 * @returns IFormAndErrorMap with form, errors, handlers, and validation
 * 
 * @example
 * ```ts
 * // Non-nested mode (default, backward compatible)
 * const bookingBuilder = buildSchemaFormBuilder(zFTBookingDTO);
 * 
 * // Nested mode (enables handlers.customer.firstName())
 * const bookingBuilder = buildSchemaFormBuilder(zFTBookingDTO, { nestedForm: true });
 * ```
 */
export function buildSchemaFormBuilder<
    Schema extends z.ZodObject<any, any>,
    Form extends z.infer<Schema> = z.infer<Schema>
>(
    schema: Schema,
    options?: {
        nestedForm?: boolean;
        customHandlers?: (
            setForm: StateAction<Form>,
            setErrors: StateAction<SchemaErrorsMap<Form>>
        ) => SchemaHandlers<Form>;
    }
): IFormAndErrorMap<Form, SchemaErrorsMap<Form>, SchemaHandlers<Form>> {
    type Errors = SchemaErrorsMap<Form>;
    type Handlers = SchemaHandlers<Form>;
    type PartialForm = Partial<Form>;

    const useNested = options?.nestedForm ?? false;

    // Build handlers - use custom if provided, otherwise auto-generate
    const buildHandlers = (
        setForm: StateAction<Form>,
        setErrors: StateAction<Errors>
    ): Handlers => {
        if (options?.customHandlers) {
            return options.customHandlers(setForm, setErrors);
        }
        return buildFormHandlers<Form, Errors, PartialForm>(schema, setForm, setErrors, useNested);
    };

    return {
        form: getDefaults<Form>(schema),
        error: SchemaToString(schema).errObj as Errors,
        handlers: buildHandlers,
        validateForm: (form, errors) => ZodMapErrors(schema.safeParse(form), errors),
        labels: SchemaGetDescriptions(schema) as Partial<Record<keyof Form, string>>,
    };
}