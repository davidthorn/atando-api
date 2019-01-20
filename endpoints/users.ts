
export interface User {
    id: string
    name: string
    surname: string
    email: string
    options?: {
        vegan?: boolean
        vegetarian?: boolean
    },
    deleted: boolean

}

const users: User[] = [];

export { users }