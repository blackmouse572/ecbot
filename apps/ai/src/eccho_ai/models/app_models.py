from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse


T = TypeVar('T')


class AppResponse(BaseModel, Generic[T]):
    status: int = Field(default=200, description="HTTP status code")
    msg: str = Field(default="OK", description="Response message")
    data: Optional[T] = Field(default=None, description="Response data")
    error: Optional[str] = Field(default=None, description="Error message")

    def as_json_response(self) -> JSONResponse:
        return JSONResponse(status_code=self.status, content=self.model_dump())
