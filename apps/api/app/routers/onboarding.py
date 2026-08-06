import re

from fastapi import APIRouter, Depends, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.queue import get_queue
from app.models import Course, Lesson, Module, Resource, ResourceStatus, ResourceType, User
from app.schemas import CourseDetailOut, OnboardingProfileIn, ResourceOut, SyllabusImportIn, UserOut
from app.services.pipeline import process_resource
from app.services.storage import store_resource_file
from app.services.syllabus import generate_course_outline

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

_EXT_TO_TYPE = {
    "pdf": ResourceType.pdf,
    "docx": ResourceType.docx,
    "doc": ResourceType.docx,
    "ppt": ResourceType.ppt,
    "pptx": ResourceType.ppt,
    "txt": ResourceType.txt,
    "png": ResourceType.image,
    "jpg": ResourceType.image,
    "jpeg": ResourceType.image,
    "heic": ResourceType.image,
    "mp3": ResourceType.audio,
    "wav": ResourceType.audio,
    "m4a": ResourceType.audio,
    "mp4": ResourceType.video,
    "mov": ResourceType.video,
}


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserOut)
def save_profile(
    payload: OnboardingProfileIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.name = payload.name
    user.school = payload.school
    user.course_name = payload.course_name
    user.degree = payload.degree
    user.semester = payload.semester
    user.subjects = payload.subjects
    user.learning_style = payload.learning_style
    user.difficulty_preference = payload.difficulty_preference
    db.commit()
    db.refresh(user)
    return user


@router.post("/syllabus", response_model=CourseDetailOut)
@limiter.limit("10/hour")
def import_syllabus(
    request: Request,
    payload: SyllabusImportIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Parses syllabus text (or generates a standard outline) into a Course
    with Modules and Lessons. This is the AI Course Generator entry point —
    resource upload + processing fills in each lesson's content afterward."""
    outline = generate_course_outline(payload.course_name, payload.raw_text)

    course = Course(user_id=user.id, name=payload.course_name, learning_mode=payload.learning_mode)
    db.add(course)
    db.flush()

    previous_lesson_id: str | None = None
    for m_idx, module_data in enumerate(outline.get("modules", [])):
        module = Module(
            course_id=course.id,
            title=module_data["title"],
            order_index=m_idx,
            estimated_hours=module_data.get("estimated_hours"),
        )
        db.add(module)
        db.flush()

        module_lessons: list[Lesson] = []
        for l_idx, lesson_data in enumerate(module_data.get("lessons", [])):
            slug = re.sub(r"[^a-z0-9]+", "-", lesson_data["title"].lower()).strip("-")[:80]
            lesson = Lesson(
                module_id=module.id,
                title=lesson_data["title"],
                slug=f"{slug}-{l_idx}",
                order_index=l_idx,
                difficulty=lesson_data.get("difficulty", "beginner"),
                estimated_minutes=lesson_data.get("estimated_minutes", 20),
                # Each lesson's prerequisite is the one immediately before it
                # in study order — the simplest useful knowledge-graph edge,
                # forming a single linear chain across the whole course.
                prerequisite_lesson_ids=[previous_lesson_id] if previous_lesson_id else None,
            )
            db.add(lesson)
            db.flush()
            previous_lesson_id = lesson.id
            module_lessons.append(lesson)

        # Related concepts: siblings within the same module — the other edge
        # of the knowledge graph, alongside the prerequisite chain above.
        for lesson in module_lessons:
            lesson.related_lesson_ids = [l.id for l in module_lessons if l.id != lesson.id] or None

    db.commit()
    db.refresh(course)
    return course


@router.post("/courses/{course_id}/resources", response_model=ResourceOut)
@limiter.limit("20/hour")
async def upload_resource(
    request: Request,
    course_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Uploads a learning resource and hands it to the AI processing
    pipeline (OCR → speech-to-text → chunking → embeddings) via the RQ job
    queue, so the upload responds immediately and processing runs on a
    separate worker rather than contending with other users' requests."""
    content = await file.read()
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    resource_type = _EXT_TO_TYPE.get(ext, ResourceType.txt)
    storage_path = store_resource_file(course_id, file.filename or "upload", content)

    resource = Resource(
        course_id=course_id,
        filename=file.filename or "upload",
        resource_type=resource_type,
        storage_path=storage_path,
        status=ResourceStatus.uploaded,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    get_queue().enqueue(process_resource, resource.id)
    return resource


@router.post("/complete", response_model=UserOut)
def complete_onboarding(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    return user
