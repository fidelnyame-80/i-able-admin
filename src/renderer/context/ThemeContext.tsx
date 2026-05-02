import React from 'react'

export interface Theme {
  isDark: boolean
}

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined,
)

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const stored = localStorage.getItem('i-able-admin-theme')
    return stored ? JSON.parse(stored) : { isDark: true }
  })

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = { isDark: !prev.isDark }
      localStorage.setItem('i-able-admin-theme', JSON.stringify(next))
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
