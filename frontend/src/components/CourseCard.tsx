import { PhoneIcon, PinIcon } from './Icons'
import type { Course } from '../types'

/** Name, address, phone and photo all come from the course document in Mongo. */
export function CourseCard({ course }: { course: Course }) {
  return (
    <section className="course-card">
      {course.image_url ? (
        <img
          className="course-photo"
          src={course.image_url}
          alt={`${course.name} course preview`}
        />
      ) : (
        <div className="course-photo course-photo-missing" />
      )}

      <div className="course-overlay">
        <h2 className="course-name">{course.name}</h2>
        <p className="course-line">
          <PinIcon className="course-icon" />
          <span>{course.address || course.city_state}</span>
        </p>
        {course.phone && (
          <p className="course-line">
            <PhoneIcon className="course-icon" />
            <span>{course.phone}</span>
          </p>
        )}
      </div>
    </section>
  )
}
