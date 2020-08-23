import { Table, Column, Model, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Card from './Card'

@Table({ timestamps: true })
export class File extends Model<File> {
  @Column({ primaryKey: true, autoIncrement: true })
  id: number

  @Column type: string
  @Column size: number
  @Column name: string

  @BelongsTo(() => Card)
  card: Card

  @ForeignKey(() => Card)
  @Column
  cardId: number
}

export default File
