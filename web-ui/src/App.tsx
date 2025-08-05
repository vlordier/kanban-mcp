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
    <div className="min-h-screen bg-white vscode-compact vscode-webview">
      <NotificationContainer />
      <header className="bg-gray-50 border-b border-gray-200" style={{ borderBottomWidth: '1px' }}>
        <div className="px-2 py-1">
          <div className="flex justify-between items-center">
            <h1 className="text-xs font-medium text-gray-900">MCP Kanban</h1>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500">
              <span>⌘K Search</span>
              <span>ESC Clear</span>
            </div>
          </div>
        </div>
      </header>
      <main className="px-2 py-1">
        <Routes>
          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="/boards" element={<BoardList />} />
          <Route path="/boards/:boardId" element={<BoardDetail />} />
          {/* Catch-all route for webview context */}
          <Route path="*" element={<Navigate to="/boards" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
