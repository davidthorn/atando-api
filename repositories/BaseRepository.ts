import fs from 'fs';
import path from 'path';
import uuid from 'uuid';
import { formatWithOptions } from 'util';

export interface ModelIdentifable {
    id: string
    [key:string] : any
}

export interface ModelData {
    [key:string] : any
}

export interface OptionalModelData {
    [key:string] : any | undefined
}

export class BaseRepository {

    databaseName: string

    file: string

    filePath: string

    constructor (databaseName: string) {
        this.databaseName = databaseName
        this.file = `${databaseName}.json`
        this.filePath = path.join(__dirname, this.file)
        if(!fs.existsSync(this.filePath)) {
            this.write([])
        }
    }

    async create<Model extends ModelData, T extends  ModelIdentifable>(data: Model ): Promise<T> {

        const model: ModelData = {
            ...data,
            id: uuid.v4()
        }

        let models = this.all()
        models.push(<T> model)
        this.write(models)

        class D implements ModelIdentifable {
            id: string

            constructor(id: string) {
                this.id = id
            }
        } 

        return <T> model

    }

    all<T extends ModelIdentifable>(): T[] {
        let models = fs.readFileSync(this.filePath, {
            encoding: 'utf8'
        })
        let json: T[] = JSON.parse(models)
        return json
    }

    get<T extends ModelIdentifable>(id: string): T | undefined {
        const _models = this.all().filter(i => i.id === id)
        return _models.length === 1 ? <T> _models[0] : undefined
    }

    update<T extends ModelIdentifable>(id: string, data: OptionalModelData ): T | undefined {

        let model = this.get(id)

        if(model === undefined) return undefined

        let modelData = model

        Object.keys(data).forEach(k => {
            if(modelData[k] === undefined) return
            modelData[k] = data[k]
        })


        const models = this.all().map(i => {
            if (i.id === id) {
                return modelData
            }

            return i
        })

        this.write(models)

        return <T> modelData
    }

    delete<T extends ModelIdentifable>(id: string): T | undefined {

        const model = this.get(id)

        if (model === undefined) return undefined

        const models = this.all().filter(i => i.id !== id)

        this.write(models)

        return <T> model
    }

    write<T extends ModelIdentifable>(data: T[]) {
        fs.writeFileSync(this.filePath , JSON.stringify(data , null , 4) , {
            encoding: 'utf8'
        })
    }

}
