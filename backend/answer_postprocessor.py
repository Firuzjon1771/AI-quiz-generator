import re

BANNED_PHRASES = [
    "the page you were coming from",
    "click here",
    "back to",
    "article has been updated",
    "story has been amended",
    "no answer found",
    "unanswerable"
]

def clean_answer(answer: str) -> str:
    if not answer or not isinstance(answer, str):
        return ""

    cleaned = re.sub(r"\s+", " ", answer).strip()

    for phrase in BANNED_PHRASES:
        if phrase.lower() in cleaned.lower():
            return ""

    cleaned = re.sub(r"http[s]?://\S+", "", cleaned)

    cleaned = re.sub(r"\.+", ".", cleaned)
    cleaned = re.sub(r"[^\w\s.,:;!?()/-]", "", cleaned)

    if len(cleaned) < 5 or cleaned.lower() in ["n/a", "none", "unknown"]:
        return ""

    return cleaned