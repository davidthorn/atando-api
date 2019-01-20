export interface User {
    id: string
    name: string
    surname: string
    email: string
    options?: {
        vegan?: boolean
        vegetarian?: boolean
    }
}