import { Entity, Column, ManyToMany, JoinTable } from 'typeorm'
import Table from './Table'
import Account from './Accounts'

@Entity()
export default class Users extends Table {
    @Column()
    matricule: number

    @Column()
    username: string

    @Column()
    email: string

    @Column({
        nullable: true
    })
    client_id: number

    @Column()
    password: string

    @Column()
    passwordVisible: string

    @Column()
    active: number

    @Column()
    createdAt: Date 

    @Column()
    updatedAt: Date 

    // eslint-disable-next-line no-unused-vars
    @ManyToMany(type => Account, account => account.users)
    @JoinTable()
    accounts: Account[]
}