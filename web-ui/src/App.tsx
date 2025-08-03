import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import BoardList from './components/BoardList';
import BoardDetail from './components/BoardDetail';
import NotificationContainer from './components/NotificationContainer';

function App() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when no input is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Focus search input if it exists
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape to clear search or close modals
      if (event.key === 'Escape') {
        // Clear search if search input is focused
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]'
        ) as HTMLInputElement;
        if (searchInput && searchInput === document.activeElement) {
          // Use React's way to trigger onChange
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(searchInput, '');
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <NotificationContainer />
      <header className="bg-gray-50 border-gray-200 shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">MCP Kanban</h1>
            <div className="hidden sm:flex items-center space-x-4 text-xs text-gray-500">
              <span>⌘K Search</span>
              <span>ESC Clear</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="/boards" element={<BoardList />} />
          <Route path="/boards/:boardId" element={<BoardDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
