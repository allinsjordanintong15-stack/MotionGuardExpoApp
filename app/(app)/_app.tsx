import { ThemeProvider } from "../config/ThemeContext";

export default function App({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
