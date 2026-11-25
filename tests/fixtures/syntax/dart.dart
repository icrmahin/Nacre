enum ThemeMode { core, flavor }

class PaletteToken {
  const PaletteToken(this.name, this.value);

  final String name;
  final String value;
}

String resolveToken(PaletteToken token, {String fallback = '#15191B'}) {
  if (token.value.isEmpty) return fallback;
  return token.value;
}

void main() {
  const accent = '#F16B52';
  print('Nacre signal: $accent');
}
