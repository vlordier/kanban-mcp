import { Routes, Route, Navigate } from 'react-router-dom';
import BoardList from './components/BoardList';
import BoardDetail from './components/BoardDetail';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-gray-200 shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">MCP Kanban</h1>
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
