export const LS_KEYS = {
    selectedDates: 'selectedDates',
}

/**
 * Type for set-function from 'useState'
 */
export type StateAction<T> = React.Dispatch<React.SetStateAction<T>>