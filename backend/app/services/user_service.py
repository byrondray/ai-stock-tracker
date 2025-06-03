from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime

from app.models import User
from app.schemas import UserCreate, UserUpdate
from app.core.password import get_password_hash, verify_password


class UserService:
    """Service for user operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()
    
    async def create(self, user_data: UserCreate) -> User:
        """Create a new user."""
        hashed_password = get_password_hash(user_data.password)
        
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            risk_profile=user_data.risk_profile.value,
            is_active=True,
            is_verified=False
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    async def update(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Update user information."""
        db_user = await self.get_by_id(user_id)
        if not db_user:
            return None
        
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    async def authenticate(self, email_or_username: str, password: str) -> Optional[User]:
        """Authenticate user by email/username and password."""
        user = self.db.query(User).filter(
            or_(
                User.email == email_or_username,
                User.username == email_or_username
            )
        ).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def activate_user(self, user_id: int) -> bool:
        """Activate user account."""
        db_user = await self.get_by_id(user_id)
        if not db_user:
            return False
        
        db_user.is_active = True
        db_user.is_verified = True
        self.db.commit()
        return True
    
    async def deactivate_user(self, user_id: int) -> bool:
        """Deactivate user account."""
        db_user = await self.get_by_id(user_id)
        if not db_user:
            return False
        
        db_user.is_active = False
        self.db.commit()
        return True
