import redis.asyncio as redis
from typing import Optional, Any
import json
import pickle
from datetime import timedelta

from app.core.config import settings


class RedisClient:
    """Redis client wrapper with async support."""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False
        )
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
    
    async def ping(self) -> bool:
        """Test Redis connection."""
        if not self.redis:
            await self.connect()
        return await self.redis.ping()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis."""
        if not self.redis:
            await self.connect()
        
        value = await self.redis.get(key)
        if value is None:
            return None
        
        try:
            # Try to deserialize as JSON first
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            try:
                # Fall back to pickle
                return pickle.loads(value)
            except (pickle.PickleError, TypeError):
                # Return raw string
                return value.decode('utf-8') if isinstance(value, bytes) else value
    
    async def set(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """Set value in Redis."""
        if not self.redis:
            await self.connect()
        
        # Serialize value
        if isinstance(value, (dict, list)):
            serialized_value = json.dumps(value)
        elif isinstance(value, str):
            serialized_value = value
        else:
            serialized_value = pickle.dumps(value)
        
        return await self.redis.set(key, serialized_value, ex=expire)
    
    async def setex(self, key: str, seconds: int, value: Any) -> bool:
        """Set value with expiration."""
        return await self.set(key, value, expire=seconds)
    
    async def delete(self, key: str) -> int:
        """Delete key from Redis."""
        if not self.redis:
            await self.connect()
        return await self.redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        if not self.redis:
            await self.connect()
        return bool(await self.redis.exists(key))
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for key."""
        if not self.redis:
            await self.connect()
        return await self.redis.expire(key, seconds)
    
    async def ttl(self, key: str) -> int:
        """Get time to live for key."""
        if not self.redis:
            await self.connect()
        return await self.redis.ttl(key)
    
    async def close(self):
        """Close Redis connection."""
        await self.disconnect()


# Global Redis client instance
redis_client = RedisClient()


def get_redis() -> RedisClient:
    """Dependency for getting Redis client."""
    return redis_client
