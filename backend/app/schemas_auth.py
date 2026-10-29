from pydantic import BaseModel, Field, field_validator

class RegisterRequest(BaseModel):
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    migrate_from_user_id: int | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Введите имя.")
        return name

class LoginRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)
    migrate_from_user_id: int | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip()

class UserSettingsUpdate(BaseModel):
    tokens_left: int | None = Field(default=None, ge=0, le=99999)
    generations_left: int | None = Field(default=None, ge=0, le=9999)

class AuthResponse(BaseModel):
    is_admin: bool = False
    premium_until: str | None = None
    user_id: int
    email: str
    display_name: str
    tokens_left: int = 125
    generations_left: int = 5
    is_premium: bool = False  # ← НОВОЕ ПОЛЕ
    referral_code: str | None = None
    referrals_count: int = 0
class ApplyReferralRequest(BaseModel):
    referral_code: str = Field(min_length=4, max_length=12)