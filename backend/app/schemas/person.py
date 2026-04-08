from typing import Optional

from pydantic import BaseModel


class PersonCreate(BaseModel):
    first_name: str
    last_name: str
    is_living: Optional[bool] = None
    birth_place_id: Optional[str] = None
    description: Optional[str] = None
    gramps_id: Optional[str] = None


class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_living: Optional[bool] = None
    birth_place_id: Optional[str] = None
    description: Optional[str] = None
    gramps_id: Optional[str] = None


class PersonOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    first_name: str
    last_name: str
    is_living: Optional[bool]
    birth_place_id: Optional[str]
    description: Optional[str]
    gramps_id: Optional[str]
