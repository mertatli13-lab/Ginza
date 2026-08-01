import type { CourseData, CourseId } from '../courseTypes'
import { TOY_CHEST_COURSE } from './toyChest'
import { MAGICAL_VALLEY_COURSE } from './magicalValley'

export const COURSES: Record<CourseId, CourseData> = {
  toyChest: TOY_CHEST_COURSE,
  magicalValley: MAGICAL_VALLEY_COURSE,
}

export const COURSE_LIST: readonly CourseData[] = [TOY_CHEST_COURSE, MAGICAL_VALLEY_COURSE]

export function getCourseData(id: CourseId): CourseData {
  return COURSES[id]
}
