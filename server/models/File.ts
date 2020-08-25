import { Table, Column, Model, HasMany, ForeignKey, BelongsTo, DefaultScope, HasOne } from 'sequelize-typescript'
import Card from './Card'

@Table({ timestamps: true })
export class File extends Model<File> {
  @Column({ primaryKey: true, autoIncrement: true })
  id: number

  @Column type: string
  @Column size: number
  @Column name: string

  @HasOne(() => Card, {
    onDelete: 'cascade',
    hooks: true
  })
  card: Card
}

export default File
