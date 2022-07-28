import { Entity, Column, OneToMany } from 'typeorm'
import Account from './Accounts'
import Table from './Table'

@Entity()
export default class Clients extends Table {
    @Column()
    username: string

    @Column()
    email: string

    @Column()
    password: string

    @Column()
    company: string

    @Column({
        nullable: true
    })
    date_start: Date

    @Column({
        nullable: true
    })
    duration: string

    @Column()
    tacite: number

    @Column()
    fiche: string

    @Column()
    activite: string

    @Column()
    etat: string

    @Column()
    interest: string

    @Column({
        nullable: true
    })
    flate_rate: string

    @Column()
    createdAt: Date 

    @Column()
    updatedAt: Date 

    // eslint-disable-next-line no-unused-vars
    @OneToMany(type => Account, account => account.client)
    accounts: Account[]
}