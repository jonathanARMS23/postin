import { Column, Entity, OneToMany, ManyToOne } from 'typeorm'
import Accounts from './Accounts'
import Table from './Table'
import Postfiles from './PostFiles'

@Entity()
export default class Waitingposts extends Table {
    @Column({ nullable: true })
    postId: string

    @Column()
    type: string // link or message or Photo or video

    @Column()
    accountType: string // page or standard

    @Column({ nullable: true })
    pageId: string

    @Column({ nullable: true })
    title: string

    @Column({ nullable: true })
    link: string

    @Column({ type: 'longtext' })
    description: string // message

    @Column()
    publishDate: Date

    // eslint-disable-next-line no-unused-vars
    @OneToMany(type => Postfiles, postfile => postfile.post)
    files: Postfiles[]

    // eslint-disable-next-line no-unused-vars
    @ManyToOne(type => Accounts, account => account, {
        onDelete: 'CASCADE'
    })
    account: Accounts
}