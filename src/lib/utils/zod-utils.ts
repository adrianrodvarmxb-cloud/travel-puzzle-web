import z from "zod";
import { get, has, set } from "lodash";

// Type for Zod v4 safeParse return value
type ZodSafeParseResult<T> =
    | { success: true; data: T }
    | { success: false; error: z.ZodError<T> };

export const datelike = z.union([z.number(), z.string(), z.date()]);
export const datelikeToDate = datelike.pipe(z.coerce.date());
export type IDatelike = z.infer<typeof datelike>;

// Helper to transform numeric booleans (0/1) to JavaScript booleans
export const numericBoolean = z.union([z.literal(0), z.literal(1)]).transform((val) => val === 1);


// We take 'setters' from --useState()-- to build a function
// that updates the value from the FORM object
//          AND clear the error messages too
export function build_UpdateForm<FormFunc, ErrFunc, T>(
    setForm: React.Dispatch<React.SetStateAction<FormFunc>>,
    setErrors: React.Dispatch<React.SetStateAction<ErrFunc>>,
) {
    return (v: T) => {
        // 
        setForm((original) => { return { ...original, ...v } })

        const [key] = Object.keys(v as any);
        setErrors((original) => {
            if (has(original, key))
                original = { ...original, ...{ [key]: '' } }
            return original;
        })
    }
}

/**
 * Builds a function that updates nested form values using lodash path notation
 * This function handles deeply nested objects and arrays (e.g., 'customer.firstName' or 'items[0].name')
 * 
 * @param setForm - React state setter for form
 * @param setErrors - React state setter for errors
 * @returns A function that accepts a path (string or array) and value to update
 * 
 * @example
 * ```ts
 * const updateNested = build_UpdateNestedForm(setForm, setErrors);
 * updateNested('customer.firstName', 'John');
 * updateNested('items[0].name', 'Item 1');
 * ```
 */
export function build_UpdateNestedForm<FormFunc, ErrFunc>(
    setForm: React.Dispatch<React.SetStateAction<FormFunc>>,
    setErrors: React.Dispatch<React.SetStateAction<ErrFunc>>,
) {
    return (path: string | (string | number)[], value: any) => {
        // Update form using lodash.set for nested path support
        setForm((original) => {
            const updated = { ...original } as any;
            set(updated, path, value);
            return updated;
        });

        // Clear error at the same path if it exists
        setErrors((original) => {
            if (has(original, path)) {
                const updated = { ...original } as any;
                set(updated, path, '');
                return updated;
            }
            return original;
        });
    };
}

/**
 * Returns a maped object with the errors found from --Zod Schema--
 * 
 * @param data Zod response of 'parse' method ( z.object({}).parse() )
 * @param originalErrMap Object of actual errors displaying on screen...
 * @returns the same 'originalErrMap' structure with messages updated
 */
export function ZodMapErrors<T>(
    data: ZodSafeParseResult<any>,
    originalErrMap: T
): T | undefined {
    if (data.success) return undefined;
    const { issues } = data.error;

    let res: any = { ...originalErrMap };
    issues.forEach((i: z.ZodIssue) => {
        // @var path :-example-: ['tabs', 'victimas', 0, 'nombre']
        const { path } = i

        // Use lib 'lodash' to to access 'originalErrMap'. And set the error message.
        set(res, path, i.message)
    })
    return res as T
}


// Helper to safely extract default value from ZodDefault
// In Zod v4, _def.defaultValue is a getter property that returns the default value or function
function getDefaultValue(zodDefault: z.ZodDefault<any>): any {
    const defaultValue = zodDefault._def.defaultValue;
    // defaultValue can be a function (for dynamic defaults like .default(() => value)) or a static value
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
}

/**
 * Recursively gets default values from a Zod schema, handling nested objects
 */
function getDefaultValueForField(fieldSchema: any): any {
    // Unwrap optional, nullable, default wrappers
    let unwrapped = fieldSchema;
    while (unwrapped?._def) {
        if (unwrapped instanceof z.ZodOptional || unwrapped?._def?.typeName === 'ZodOptional') {
            unwrapped = unwrapped._def.innerType;
        } else if (unwrapped instanceof z.ZodNullable || unwrapped?._def?.typeName === 'ZodNullable') {
            unwrapped = unwrapped._def.innerType;
        } else if (unwrapped instanceof z.ZodDefault || unwrapped?._def?.typeName === 'ZodDefault') {
            return getDefaultValue(unwrapped);
        } else {
            break;
        }
    }

    // Handle nested objects recursively
    if (unwrapped instanceof z.ZodObject) {
        return getDefaults(unwrapped);
    }

    // Handle arrays
    if (unwrapped instanceof z.ZodArray) {
        return [];
    }

    // Handle primitives
    if (unwrapped instanceof z.ZodString) return '';
    if (unwrapped instanceof z.ZodNumber) return 0;
    if (unwrapped instanceof z.ZodBoolean) return false;
    
    return undefined;
}

export function getDefaults<T, Schema extends z.ZodObject<any, any> = any>(schema: Schema): T {
    const res = Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => {
            return [key, getDefaultValueForField(value)];
        })
    );
    return res as T;
}

/**
 * Recursively builds error object structure for nested schemas
 */
function buildErrorObject(schema: z.ZodObject<any, any>): any {
    const errObj: any = {};
    Object.entries(schema.shape).forEach(([key, value]) => {
        // Unwrap optional, nullable, default wrappers
        let unwrapped = value as any;
        while (unwrapped?._def) {
            if (unwrapped instanceof z.ZodOptional || unwrapped?._def?.typeName === 'ZodOptional') {
                unwrapped = unwrapped._def.innerType;
            } else if (unwrapped instanceof z.ZodNullable || unwrapped?._def?.typeName === 'ZodNullable') {
                unwrapped = unwrapped._def.innerType;
            } else if (unwrapped instanceof z.ZodDefault || unwrapped?._def?.typeName === 'ZodDefault') {
                unwrapped = unwrapped._def.innerType;
            } else {
                break;
            }
        }

        // Check if it's a nested object
        if (unwrapped instanceof z.ZodObject) {
            errObj[key] = buildErrorObject(unwrapped);
        } else if (unwrapped instanceof z.ZodArray) {
            // For arrays, we'll use an empty array structure
            // The actual errors will be set by ZodMapErrors using lodash.set
            errObj[key] = [];
        } else {
            // Primitive field
            errObj[key] = '';
        }
    });
    return errObj;
}

export function SchemaToString<Schema extends z.ZodObject<any, any> = any>(schema: Schema) {
    let zodObject = z.object({});
    const errObj = buildErrorObject(schema);
    
    // Also build the zodObject for validation (keeping original behavior)
    Object.entries(schema.shape).forEach(([key]) => {
        zodObject = zodObject.merge(z.object({
            [key]: z.string().default("")
        }));
    });
    
    return { zodObject, errObj };
}

export function SchemaGetDescriptions<Schema extends z.ZodObject<any, any> = any>(schema: Schema) {
    const DESCRIPTIONS = Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => {
            if (value instanceof z.ZodDefault) {
                // Description is on the inner schema, not on the ZodDefault wrapper
                const innerType = value._def.innerType;
                const description = (innerType as any)._def?.description || '';
                return [key, description];
            }
            // For non-ZodDefault schemas, try to access description directly
            const description = (value as any)._def?.description || '';
            return [key, description];
        })
    )
    return DESCRIPTIONS;
}