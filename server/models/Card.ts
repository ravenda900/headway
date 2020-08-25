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
  },
  includeFiles: {
    include: [{
      model: () => File,
      as: 'media'
    }, {
      model: () => File,
      as: 'audio'
    }, {
      model: () => File,
      as: 'video'
    }]
  }
})

@Table({ timestamps: true })
export class Card extends Model<Card> {
  @Column name: string
  @Column slug: string
  @Column(DataType.TEXT({ length: 'long' })) content: string
  @Column evidence_task: string
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
  mediaId: number
  @BelongsTo(() => File, 'mediaId')
  media: File

  @ForeignKey(() => File)
  @Column
  audioId: number
  @BelongsTo(() => File, 'audioId')
  audio: File

  @ForeignKey(() => File)
  @Column
  videoId: number 
  @BelongsTo(() => File, 'videoId')
  video: File

}

export default Card
