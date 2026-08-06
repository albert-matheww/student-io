"""Test fixtures.

`db` wraps each test in a SAVEPOINT: the app's own `session.commit()` calls
(there are many, throughout the routers) only release the savepoint, while
the outer transaction is rolled back at the end of the test — so nothing
written during a test ever persists in the dev database.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.main import app


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    def _override_get_db():
        yield session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    return TestClient(app)
