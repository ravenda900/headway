import * as slug from 'slug'
import { Table, Column, Model, HasMany, ForeignKey, HasOne, BelongsTo, BelongsToMany, BeforeUpdate, BeforeCreate, DataType, Scopes, DefaultScope } from 'sequelize-typescript'
import Unit from './Unit'
import Activity from './Activity'
import Student from './Student'
import { Course } from './Course'
import File from './File'

@Scopes({
  includeCourse: {
    include: [{
      model: () => Unit,
      include: [
        {
          model: () => Course
        }
      ]
    }]
  }
})
@DefaultScope({
  include: [{
    model: () => File,
    as: 'Audio',
    where: { type: 'audio' }
  }, {
    model: () => File,
    as: 'Video',
    where: { type: 'video' }
  }]
})

@Table({ timestamps: true })
export class Card extends Model<Card> {
  @Column name: string
  @Column slug: string
  @Column(DataType.TEXT({ length: 'long' })) content: string
  @Column evidence_task: string
  @Column media: string
  @Column(DataType.TEXT) quiz: string

  @BeforeUpdate
  @BeforeCreate
  static slugify(instance: Card) {
    instance.slug = slug(instance.name)
  }

  @ForeignKey(() => Unit)
  @Column
  unitId: number

  @BelongsTo(() => Unit)
  unit: Unit

  @ForeignKey(() => File)
  @Column
  audioId: number
  @HasOne(() => File)
  audio: File

  @ForeignKey(() => File)
  @Column
  videoId: number
  @HasOne(() => File)
  video: File

}

export default Card
