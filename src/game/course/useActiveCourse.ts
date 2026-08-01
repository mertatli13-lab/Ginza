import { useFlowStore } from '../flow/flowStore'
import { getCourseData } from './courses/registry'
import type { CourseData } from './courseTypes'

/** The course actually in play right now — the player's selectedCourse in
 * local mode, always Toy Chest Tumble online (see flowStore's comment on
 * selectedCourse for why). Every component that needs course geometry reads
 * it through here instead of importing a specific course module directly. */
export function useActiveCourse(): CourseData {
  const mode = useFlowStore((s) => s.mode)
  const selectedCourse = useFlowStore((s) => s.selectedCourse)
  return getCourseData(mode === 'online' ? 'toyChest' : selectedCourse)
}
