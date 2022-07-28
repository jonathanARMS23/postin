import { Entity, Column, ManyToOne } from 'typeorm'
import Table from './Table'
import Waitingposts from './WaitingPosts'

@Entity()
export default class Postfiles extends Table {
    @Column()
    filename: string

    @Column()
    type: string

    @Column()
    extension: string

    @Column()
    path: string

    // eslint-disable-next-line no-unused-vars
    @ManyToOne(type => Waitingposts, waitingpost => waitingpost.files, {
        onDelete: 'CASCADE'
    })
    post: Waitingposts 
}