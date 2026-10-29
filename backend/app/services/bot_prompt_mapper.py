from app.schemas import BotPromptData, PromptGenerateRequest

_DEFAULT_STACK = "Не указан — предложи подходящий стек под задачу"
_DEFAULT_STYLE = "production-ready, чистая структура"
_DEFAULT_OUTPUT = "План, код по файлам, тесты, команды запуска"


def _strip_answer(answers: dict[str, str], key: str) -> str:
    raw = answers.get(key, "")
    if not isinstance(raw, str):
        return ""
    return raw.strip()


def _normalize_goal(answers: dict[str, str], category: str) -> str:
    goal = _strip_answer(answers, "1")
    if len(goal) >= 10:
        return goal

    parts: list[str] = []
    if goal:
        parts.append(goal)
    for key in ("2", "3", "4", "5", "6", "7", "8"):
        value = _strip_answer(answers, key)
        if value:
            parts.append(value)

    merged = ". ".join(parts)
    if len(merged) >= 10:
        return merged

    label = category.strip() or "проект"
    fallback = f"Сделать {label} по ответам опроса (часть полей пропущена)."
    return fallback if len(fallback) >= 10 else f"{fallback} Уточни детали по контексту."


def _build_constraints(answers: dict[str, str], category: str) -> str:
    if category == "promo":
        labeled = [
            ("2", "Аудитория"),
            ("3", "Площадки"),
            ("6", "Бюджет"),
            ("7", "Дополнительно"),
        ]
    else:
        labeled = [
            ("4", "Развёртывание"),
            ("5", "База данных"),
            ("6", "Дизайн"),
            ("7", "Дополнительно"),
        ]

    lines: list[str] = []
    if category:
        lines.append(f"Категория: {category}")

    level = _strip_answer(answers, "3")
    if level and category != "promo":
        lines.append(f"Уровень кода: {level}")

    for key, label in labeled:
        value = _strip_answer(answers, key)
        if value:
            lines.append(f"{label}: {value}")

    return "\n".join(lines)


def answers_to_generate_request(data: BotPromptData) -> PromptGenerateRequest:
    answers = data.answers
    category = data.category.strip() if data.category else "dev"

    goal = _normalize_goal(answers, category)
    stack = _strip_answer(answers, "2") or _DEFAULT_STACK
    constraints = _build_constraints(answers, category)

    if category == "promo":
        style = _strip_answer(answers, "4") or _DEFAULT_STYLE
        output_format = _strip_answer(answers, "5") or _DEFAULT_OUTPUT
    else:
        style = _strip_answer(answers, "3") or _DEFAULT_STYLE
        output_format = _DEFAULT_OUTPUT

    return PromptGenerateRequest(
        goal=goal,
        stack=stack,
        constraints=constraints,
        style=style,
        output_format=output_format,
    )
