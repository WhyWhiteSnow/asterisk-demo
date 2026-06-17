import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import Role, User

logger = logging.getLogger(__name__)


def ensure_default_user(
    db: Session,
    *,
    login: str,
    password: str,
    name: str,
) -> User | None:
    existing_user = db.query(User).filter(User.login == login).first()
    if existing_user:
        logger.info("Default user %r already exists, skipping creation", login)
        return None

    user = User(
        login=login,
        password_hash=get_password_hash(password),
        name=name,
        role=Role.ADMIN,
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        logger.info("Default user %r was created by another worker", login)
        return None

    logger.info("Default user %r created", login)
    return user
