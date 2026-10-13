import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  onMount,
  type JSX,
} from "solid-js";

export type Theme = "oled" | "dark" | "sepia" | "light";

interface ThemeContextType {
  theme: () => Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>();

export function ThemeProvider(props: { children: JSX.Element }) {
  const [theme, setThemeState] = createSignal<Theme>("oled");

  onMount(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (
      saved &&
      (saved === "oled" || saved === "dark" || saved === "sepia" || saved === "light")
    ) {
      setThemeState(saved);
    } else {
      setThemeState("oled");
    }
  });

  createEffect(() => {
    const current = theme();
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", current);
      localStorage.setItem("theme", current);
    }
  });

  const cycleTheme = () => {
    const current = theme();
    if (current === "oled") setThemeState("dark");
    else if (current === "dark") setThemeState("sepia");
    else if (current === "sepia") setThemeState("light");
    else setThemeState("oled");
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
