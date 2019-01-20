import fs from 'fs';
import path from 'path';
import uuid from 'uuid';
import { Company } from './Company';

export class CompanyRepository {

    constructor () { }

    create(data: { name: string, address: string, phone: string }): Company {

        const company: Company = {
            ...data,
            id: uuid.v4()
        }

        let companies = this.all()
        companies.push(company)
        const companiesPath = path.join(__dirname, 'companies.json')
        fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 4))

        return company

    }

    all(): Company[] {
        const companiesPath = path.join(__dirname, 'companies.json')
        let companies = fs.readFileSync(companiesPath, {
            encoding: 'utf8'
        })
        let json: Company[] = JSON.parse(companies)
        return json
    }

    get(id: string): Company | undefined {
        const _companies = this.all().filter(i => i.id === id)
        return _companies.length === 1 ? _companies[0] : undefined
    }

    update(id: string, data: { name?: string, address?: string, phone?: string }): Company | undefined {

        let company = this.get(id)

        if (company === undefined) return undefined

        if (data.name !== undefined) {
            company.name = data.name
        }

        if (data.address !== undefined) {
            company.address = data.address
        }

        if (data.phone !== undefined) {
            company.phone = data.phone
        }

        const companies = this.all().map(i => {
            if (i.id === id) {
                return company!
            }

            return i
        })

        const companiesPath = path.join(__dirname, 'companies.json')
        fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 4))

        return company
    }

    delete(id: string): Company | undefined {

        const company = this.get(id)

        if (company === undefined) return undefined

        const companies = this.all().filter(i => i.id !== id)

        const companiesPath = path.join(__dirname, 'companies.json')
        fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 4))

        return company
    }

}
