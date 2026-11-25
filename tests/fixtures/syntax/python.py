from dataclasses import dataclass

@dataclass(frozen=True)
class PaletteToken:
    name: str
    value: str

def resolve_token(token: PaletteToken, fallback: str = "#15191B") -> str:
    """Return a palette value, or a stable fallback."""
    if not token.value:
        return fallback
    return token.value

if __name__ == "__main__":
    signal = PaletteToken("signal", "#F16B52")
    print(resolve_token(signal))
