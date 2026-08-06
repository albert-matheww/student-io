"""Every router filters by the requesting user's id — this pins down that
behavior at the HTTP layer for the endpoint most users touch first, using a
direct get_current_user override so the test doesn't depend on whichever
auth mode happens to be configured in the environment running it.
"""

from app.core.auth import get_current_user
from app.main import app
from app.models import Course, LearningMode, User


def _make_user(db, suffix: str) -> User:
    user = User(clerk_user_id=f"pytest-user-{suffix}", email=f"pytest-{suffix}@test.io")
    db.add(user)
    db.flush()
    return user


def test_courses_endpoint_only_returns_the_requesting_users_courses(client, db):
    owner = _make_user(db, "owner")
    other = _make_user(db, "other")
    db.add(Course(user_id=owner.id, name="Owner's Course", learning_mode=LearningMode.guided))
    db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: other
        resp = client.get("/courses")
        assert resp.status_code == 200
        assert resp.json() == []

        app.dependency_overrides[get_current_user] = lambda: owner
        resp = client.get("/courses")
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert names == ["Owner's Course"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_course_detail_404s_for_a_non_owner_rather_than_leaking_it(client, db):
    owner = _make_user(db, "owner2")
    other = _make_user(db, "other2")
    course = Course(user_id=owner.id, name="Private Course", learning_mode=LearningMode.guided)
    db.add(course)
    db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: other
        resp = client.get(f"/courses/{course.id}")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
