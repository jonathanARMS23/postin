import { Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export default class Table {
    @PrimaryGeneratedColumn()
    id: number
}
