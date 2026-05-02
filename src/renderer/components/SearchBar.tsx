import { useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const { theme } = useTheme()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-4 border-b ${
        theme.isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`flex items-center border rounded-lg px-3 py-2 ${
          theme.isDark
            ? 'bg-gray-800 border-gray-700 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      >
        <Search size={20} className={theme.isDark ? 'text-gray-500' : 'text-gray-400'} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, or service..."
          className={`ml-3 w-full bg-transparent outline-none text-sm ${
            theme.isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {query && (
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full mt-2 py-2 rounded font-medium text-sm transition-all ${
            theme.isDark
              ? 'bg-yellow-600 hover:bg-yellow-700 text-black disabled:opacity-50'
              : 'bg-yellow-500 hover:bg-yellow-600 text-black disabled:opacity-50'
          }`}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      )}
    </form>
  )
}
