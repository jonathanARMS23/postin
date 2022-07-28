import { Entity, Column, ManyToOne, ManyToMany, OneToMany } from 'typeorm'
import Table from './Table'
import Client from './Clients'
import User from './Users'
import Waitingposts from './WaitingPosts'

@Entity()
export default class Accounts extends Table {
    @Column()
    type: string

    @Column({ nullable: true })
    accountId: string

    @Column({ nullable: true })
    accountName: string

    @Column({ type: 'longtext' })
    token: string

    @Column({ type: 'longtext' })
    refreshToken: string

    @Column({ nullable: true, type: 'longtext' })
    idToken: string

    @Column({ nullable: true })
    expireIn: number

    // eslint-disable-next-line no-unused-vars
    @ManyToOne(type => Client, client => client.accounts, {
        onDelete: 'CASCADE'
    })
    client: Client

    // eslint-disable-next-line no-unused-vars
    @ManyToMany(type => User, user => user.accounts)
    users: User[]

    // eslint-disable-next-line no-unused-vars
    @OneToMany(type => Waitingposts, waitingpost => waitingpost.account)
    posts: Waitingposts[]
}