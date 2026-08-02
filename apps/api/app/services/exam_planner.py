"""Turns an exam date + daily study budget into a day-by-day schedule:
new lessons in syllabus order, weak topics folded in for quick revision,
and the final stretch reserved as buffer/mock-test days.
"""

from datetime import date, timedelta

from app.models import Course, Lesson

MOCK_TEST_DAYS = 1
BUFFER_DAY_RATIO = 0.1  # ~10% of remaining days kept free as slack


def build_schedule(course: Course, daily_minutes: int) -> tuple[list[dict], int]:
    if course.exam_date is None:
        return [], 0

    today = date.today()
    days_until_exam = (course.exam_date - today).days
    if days_until_exam <= 0:
        return [], days_until_exam

    all_lessons = [lesson for module in course.modules for lesson in module.lessons]
    incomplete = sorted(
        [l for l in all_lessons if not l.is_completed],
        key=lambda l: (l.module.order_index, l.order_index),
    )
    weak = sorted(
        [l for l in all_lessons if l.is_completed and l.confidence_score < 60],
        key=lambda l: l.confidence_score,
    )

    buffer_days = max(1, round(days_until_exam * BUFFER_DAY_RATIO))
    study_days = max(0, days_until_exam - buffer_days - MOCK_TEST_DAYS)

    schedule: list[dict] = []
    lesson_queue = list(incomplete)
    weak_queue = list(weak)

    for day_offset in range(days_until_exam):
        day = today + timedelta(days=day_offset + 1)
        is_mock_test_day = day_offset >= days_until_exam - MOCK_TEST_DAYS
        is_buffer_day = not is_mock_test_day and day_offset >= study_days

        items: list[dict] = []
        remaining_minutes = daily_minutes

        if not is_mock_test_day and not is_buffer_day:
            if weak_queue and remaining_minutes > 10:
                lesson = weak_queue.pop(0)
                minutes = min(15, remaining_minutes)
                items.append({"lesson": lesson, "kind": "revision", "minutes": minutes})
                remaining_minutes -= minutes

            while lesson_queue and remaining_minutes > 0:
                lesson = lesson_queue[0]
                cost = lesson.estimated_minutes or 20
                if cost > remaining_minutes and items:
                    break
                lesson_queue.pop(0)
                items.append({"lesson": lesson, "kind": "new", "minutes": cost})
                remaining_minutes -= cost

        schedule.append(
            {
                "day": day,
                "items": items,
                "is_buffer_day": is_buffer_day,
                "is_mock_test_day": is_mock_test_day,
            }
        )

    return schedule, days_until_exam
