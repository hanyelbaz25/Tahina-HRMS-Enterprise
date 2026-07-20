import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://tahina:tahina_dev_password@db:5432/tahina_hrms",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

class Base(DeclarativeBase):
    pass


def get_db():
    with Session(engine) as session:
        yield session
