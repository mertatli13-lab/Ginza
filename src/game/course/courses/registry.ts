import type { CourseData, CourseId } from '../courseTypes'
import { TOY_CHEST_COURSE } from './toyChest'
import { MAGICAL_VALLEY_COURSE } from './magicalValley'
import { TAVSANYA_COURSE } from './tavsanya'

export const COURSES: Record<CourseId, CourseData> = {
  toyChest: TOY_CHEST_COURSE,
  magicalValley: MAGICAL_VALLEY_COURSE,
  tavsanya: TAVSANYA_COURSE,
}

export const COURSE_LIST: readonly CourseData[] = [TOY_CHEST_COURSE, MAGICAL_VALLEY_COURSE, TAVSANYA_COURSE]

export function getCourseData(id: CourseId): CourseData {
  return COURSES[id]
}
