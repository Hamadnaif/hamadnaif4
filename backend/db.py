import os
from typing import Annotated
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def serialize(doc):
    """Convert a Mongo document into a JSON-safe dict (ObjectId -> str, _id -> id)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        else:
            out[k] = v
    return out


def to_oid(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


# Typed boundary for new persisted documents; legacy serializers remain unchanged.


def _object_id_text(value):
    text = str(value)
    if not ObjectId.is_valid(text):
        raise ValueError("Invalid document identifier")
    return text


PyObjectId = Annotated[str, BeforeValidator(_object_id_text)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")

    @classmethod
    def from_mongo(cls, document):
        return cls.model_validate(document)

    def to_mongo(self):
        document = self.model_dump(mode="python", by_alias=True)
        document["_id"] = ObjectId(self.id)
        return document

