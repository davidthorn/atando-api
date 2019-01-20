import uuid from 'uuid';
import { BaseRepository } from './BaseRepository';
import { User } from './User';

export class UserRepository extends BaseRepository {

    constructor () {
        super('users')
    }

    async createIfNotExists(data: { name: string, surname: string, email: string }): Promise<User> {

        const user: User = {
            ...data,
            id: uuid.v4()
        }


        let users = this.all()

        if (users.filter(i => i.email.toLowerCase() === user.email.toLowerCase()).length === 1) {
            return Promise.reject({
                message: 'ALREADY_EXIST'
            })
        }


        return this.create(user)

    }

}
