export * from './github.js'
export * from './dockerhub.js'

export interface ShorthandTag {
  tag: string
  shorthand: string
}

export interface Registry {
  registry: string
  repository: string
  username: string
  secret: string
}
