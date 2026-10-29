from dataclasses import dataclass
import re


@dataclass
class PromptPayload:
    goal: str
    stack: str
    constraints: str
    style: str
    output_format: str


def _clean(value: str | None, fallback: str = "не указано") -> str:
    text = (value or "").strip()
    return text if text else fallback


def infer_role(payload: PromptPayload) -> str:
    blob = " ".join(
        [
            payload.goal or "",
            payload.stack or "",
            payload.constraints or "",
            payload.style or "",
            payload.output_format or "",
        ]
    ).lower()

    # Сначала категория/стек — «лендинг» в dev не должен становиться маркетингом
    if re.search(r"категория:\s*promo|маркетинг|реклам|копирайт|smm|контент|продаж", blob) and not re.search(
        r"категория:\s*dev|node\.?js|express|react|python|fastapi|firebase|shadcn", blob
    ):
        return "профессиональный маркетолог и копирайтер"
    if re.search(r"дизайн|figma|ui/?ux|интерфейс|макет|shadcn|tailwind", blob):
        return "профессиональный UI/UX-дизайнер и фронтенд-разработчик"
    if re.search(r"данн|sql|аналитик|dataset|bi|метрик", blob):
        return "профессиональный аналитик данных"
    if re.search(r"devops|kubernetes|ci/cd|инфраструктур|vps|ubuntu", blob):
        return "профессиональный DevOps-инженер"
    if re.search(r"тест|qa|автотест", blob):
        return "профессиональный QA-инженер"
    if re.search(
        r"категория:\s*dev|код|разработ|api|backend|frontend|python|js|react|fastapi|сайт|приложен|node|express|firebase",
        blob,
    ):
        return "профессиональный разработчик программного обеспечения"
    return "опытный эксперт-практик по поставленной задаче"


class PromptComposerService:
    def summary_and_tags(self, payload: PromptPayload) -> tuple[str, list[str]]:
        summary = f"{payload.goal[:120]}{'...' if len(payload.goal) > 120 else ''}"
        tag_pool = [payload.stack, payload.style, payload.output_format]
        tags = [tag.strip().lower().replace(" ", "-") for tag in tag_pool if tag.strip()]
        return summary, tags

    def build_fallback_prompt(self, payload: PromptPayload) -> str:
        """Универсальный шаблон из ответов квиза — если нейросеть недоступна."""
        role = infer_role(payload)
        goal = _clean(payload.goal, "выполнить задачу пользователя")
        stack = _clean(payload.stack, "подбери подходящие инструменты сам")
        constraints = _clean(payload.constraints, "без дополнительных ограничений")
        style = _clean(payload.style, "чёткий, практичный, без воды")
        output_format = _clean(payload.output_format, "структурированный результат с пояснениями")

        return (
            f"Ты — {role}. Работай профессионально, по шагам и с вниманием к деталям.\n\n"
            f"РОЛЬ\n"
            f"- Действуй строго в рамках роли: {role}.\n"
            f"- Не уходи в общие рассуждения — сразу давай применимый результат.\n\n"
            f"КОНТЕКСТ ЗАДАЧИ\n"
            f"{goal}\n\n"
            f"ТЕХНОЛОГИИ / ИНСТРУМЕНТЫ\n"
            f"{stack}\n\n"
            f"ОГРАНИЧЕНИЯ И УСЛОВИЯ\n"
            f"{constraints}\n\n"
            f"СТИЛЬ И ТОН\n"
            f"{style}\n\n"
            f"ТРЕБУЕМЫЙ ФОРМАТ РЕЗУЛЬТАТА\n"
            f"{output_format}\n\n"
            f"ИНСТРУКЦИИ К ВЫПОЛНЕНИЮ\n"
            f"1. Кратко зафиксируй понимание задачи (2–4 пункта).\n"
            f"2. Сделай разумные допущения, если данных не хватает, и явно их перечисли.\n"
            f"3. Выполни задачу полностью, опираясь на стек и ограничения выше.\n"
            f"4. Структурируй ответ понятными блоками и списками.\n"
            f"5. В конце добавь чеклист проверки: что получилось и что стоит уточнить.\n\n"
            f"КРИТЕРИИ КАЧЕСТВА\n"
            f"- Весь ответ на русском языке.\n"
            f"- Соответствие стеку, стилю и формату.\n"
            f"- Практическая применимость без лишней теории.\n"
            f"- Если чего-то нет во входных данных — помечай как «нужно уточнить», не выдумывай факты.\n"
        )
