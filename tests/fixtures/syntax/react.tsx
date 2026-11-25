import { useMemo, useState } from "react";

type ThemeMode = "core" | "flavor";

interface ThemeCardProps {
    label: string;
    accent: string;
}

export function ThemeCard({ label, accent }: ThemeCardProps) {
    const [active, setActive] = useState(false);
    const style = useMemo(() => ({ borderColor: accent }), [accent]);

    return (
        <button aria-pressed={active} onClick={() => setActive(!active)} style={style}>
            <span className="theme-card__label">{label}</span>
            {active && <span className="theme-card__status">Active</span>}
        </button>
    );
}
