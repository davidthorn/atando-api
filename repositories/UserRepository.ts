import fs from 'fs';
import path from 'path';
import uuid from 'uuid';
import { User } from './User';

export class UserRepository {

    constructor () { }

    async create(data: { name: string, surname: string, email: string }): Promise<User> {

        const user: User = {
            ...data,
            id: uuid.v4()
        }

        
        let users = this.all()
        
        if(users.filter( i => i.email.toLowerCase() === user.email.toLowerCase() ).length === 1) {
            return Promise.reject({
                message: 'ALREADY_EXIST'
            })
        }
        
        users.push(user)
        const usersPath = path.join(__dirname, 'users.json')
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 4))

        return user

    }

    all(): User[] {
        const usersPath = path.join(__dirname, 'users.json')
        let users = fs.readFileSync(usersPath, {
            encoding: 'utf8'
        })
        let json: User[] = JSON.parse(users)
        return json
    }

    get(id: string): User | undefined {
        const _users = this.all().filter(i => i.id === id)
        return _users.length === 1 ? _users[0] : undefined
    }

    update(id: string, data: { name?: string, surname?: string }): User | undefined {

        let user = this.get(id)

        if (user === undefined) return undefined

        if (data.name !== undefined) {
            user.name = data.name
        }

        if (data.surname !== undefined) {
            user.surname = data.surname
        }

        const users = this.all().map(i => {
            if (i.id === id) {
                return user!
            }

            return i
        })

        const usersPath = path.join(__dirname, 'users.json')
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 4))

        return user
    }

    delete(id: string): User | undefined {

        const user = this.get(id)

        if (user === undefined) return undefined

        const users = this.all().filter(i => i.id !== id)

        const usersPath = path.join(__dirname, 'users.json')
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 4))

        return user
    }

}
