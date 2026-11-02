"""Grouping of the free-text "institution" answers.

People type the same institution many ways ("Politécnico Jaime Isaza
Cadavid", "Poli JIC", "politecnico colombiano jaime isaza"...). Known
institutions map to one canonical name; anything else is grouped by a
case/accent/spacing-insensitive key and keeps its most common spelling.
"""

import unicodedata

_FILLER_WORDS = {"universidad", "de", "del", "la", "las", "los", "el"}


def normalize_text(text):
    """Lowercase ASCII words separated by single spaces ("J.I.C" -> "j i c")."""
    ascii_text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return " ".join(ascii_text.lower().replace(".", " ").split())


def _is(*values):
    return lambda k: k in values


def _has(*fragments):
    return lambda k: any(f in k for f in fragments)


# (canonical name, matcher on the normalized text). First match wins.
KNOWN_INSTITUTIONS = [
    (
        "Politécnico Colombiano Jaime Isaza Cadavid",
        lambda k: "isaza" in k or "isaias" in k or "jic" in k.split() or "j i c" in k,
    ),
    ("Tecnológico de Artes Débora Arango", _has("debora")),
    ("Universidad EAFIT", _has("eafit")),
    ("Universidad de Medellín", lambda k: k.startswith("universidad de medellin") or k in {"udem", "udemedellin", "u de medellin"}),
    ("Universidad de Antioquia", lambda k: k.startswith("universidad de antioquia") or k in {"udea", "u de a"}),
    ("Universidad Pontificia Bolivariana", lambda k: "bolivariana" in k or k == "upb"),
    ("Universidad Católica Luis Amigó", _has("luis amigo")),
    ("ITM", lambda k: k == "itm" or "instituto tecnologico metropolitano" in k),
    ("Pascual Bravo", _has("pascual bravo")),
    ("SENA", _is("sena")),
    ("CESDE", _is("cesde")),
    ("Fundación Universitaria Bellas Artes de Medellín", _has("bellas artes")),
    ("Solución Adhesiva", _has("solucion adhesiva")),
]


def institution_group(raw):
    """Returns (group_key, canonical_label_or_None). The label is None for
    institutions we don't know, so the caller can pick a spelling."""
    text = " ".join((raw or "").split())
    if not any(ch.isalnum() for ch in text):
        return "", None

    key = normalize_text(text)
    for label, matches in KNOWN_INSTITUTIONS:
        if matches(key):
            return label, label

    meaningful = [w for w in key.split() if w not in _FILLER_WORDS]
    return " ".join(meaningful or key.split()), None
