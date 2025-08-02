import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAllBoards, deleteBoard, createBoard } from '../services/api';
import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { PlusIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useNotifications } from './NotificationContainer';
import { useDarkMode } from '../hooks/useDarkMode';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { NotificationSystem } from './NotificationSystem';

export default function BoardList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardGoal, setNewBoardGoal] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<{ id: string; name: string; goal: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useDarkMode();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  
  // Enable real-time updates
  useRealTimeUpdates();
  
  const { data: boards, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: getAllBoards,
  });

  const createBoardMutation = useMutation({
    mutationFn: ({ name, goal }: { name: string; goal: string }) => createBoard(name, goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsCreateDialogOpen(false);
      setNewBoardName('');
      setNewBoardGoal('');
      notifications.success('Board created successfully');
    },
    onError: (error) => {
      notifications.error('Failed to create board', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const handleDeleteClick = (boardId: string, boardName: string) => {
    setBoardToDelete({ id: boardId, name: boardName });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!boardToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteBoard(boardToDelete.id);
      // Invalidate the boards query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      notifications.success('Board deleted successfully');
    } catch (error) {
      console.error('Error deleting board:', error);
      notifications.error('Failed to delete board', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setBoardToDelete(null);
    }
  };

  const handleCreateBoard = () => {
    if (!newBoardName.trim() || !newBoardGoal.trim()) {
      notifications.error('Validation error', 'Board name and goal are required');
      return;
    }
    createBoardMutation.mutate({ name: newBoardName.trim(), goal: newBoardGoal.trim() });
  };

  const handleEditClick = (board: any) => {
    setEditingBoard({
      id: board.id,
      name: board.name,
      goal: board.goal
    });
    setIsEditDialogOpen(true);
  };

  const handleEditBoard = async () => {
    if (!editingBoard || !editingBoard.name.trim() || !editingBoard.goal.trim()) {
      notifications.error('Validation error', 'Board name and goal are required');
      return;
    }

    try {
      // This would be an updateBoard API call
      // For now, simulate the update
      console.log('Updating board:', editingBoard);
      
      // Update the cache optimistically
      queryClient.setQueryData(['boards'], (old: any) => 
        old?.map((board: any) => 
          board.id === editingBoard.id 
            ? { ...board, name: editingBoard.name, goal: editingBoard.goal, updated_at: new Date().toISOString() }
            : board
        )
      );

      setIsEditDialogOpen(false);
      setEditingBoard(null);
      notifications.success('Board updated successfully');
    } catch (error) {
      notifications.error('Failed to update board', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCreateDialogClose = () => {
    if (!createBoardMutation.isPending) {
      setIsCreateDialogOpen(false);
      setNewBoardName('');
      setNewBoardGoal('');
    }
  };

  // Filter boards based on search query
  const filteredBoards = boards?.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.goal.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Helper function to get board emoji based on name/goal
  const getBoardEmoji = (name: string, goal: string) => {
    const text = `${name} ${goal}`.toLowerCase();
    if (text.includes('design') || text.includes('ui') || text.includes('ux')) return '🎨';
    if (text.includes('mobile') || text.includes('app')) return '📱';
    if (text.includes('web') || text.includes('website')) return '🌐';
    if (text.includes('marketing') || text.includes('campaign')) return '📈';
    if (text.includes('product') || text.includes('roadmap')) return '🚀';
    if (text.includes('user') || text.includes('research')) return '👥';
    if (text.includes('development') || text.includes('dev')) return '⚡';
    if (text.includes('support') || text.includes('customer')) return '🤝';
    if (text.includes('analytics') || text.includes('data')) return '📊';
    if (text.includes('quality') || text.includes('qa')) return '✅';
    if (text.includes('infrastructure') || text.includes('devops')) return '🔧';
    if (text.includes('test') || text.includes('search')) return '🧪';
    return '📋';
  };

  // Calculate board activity score (mock data for demo)
  const getBoardActivity = (board: any) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(board.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate === 0) return { level: 'high', label: 'Active today', color: 'emerald' };
    if (daysSinceUpdate <= 3) return { level: 'medium', label: 'Active this week', color: 'blue' };
    if (daysSinceUpdate <= 14) return { level: 'low', label: 'Recent activity', color: 'amber' };
    return { level: 'inactive', label: 'Inactive', color: 'gray' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading boards: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen if no boards exist at all
  if (boards && boards.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <div className="mx-auto max-w-md">
            <svg className="mx-auto h-24 w-24 text-gray-300 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MCP Kanban!</h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Transform your project management with visual kanban boards. 
              Organize tasks, track progress, and collaborate effectively.
            </p>
            <div className="space-y-4 text-left bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ What you can do:</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Create unlimited kanban boards for different projects</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Organize tasks in customizable columns (To Do, In Progress, Done)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Drag and drop tasks between columns</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Set WIP limits to improve workflow efficiency</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-indigo-600">•</span>
                  <span>Write detailed task descriptions with Markdown support</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-x-3 rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-xl hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 hover:shadow-2xl hover:scale-105"
            >
              <PlusIcon className="h-6 w-6" aria-hidden="true" />
              Create your first board
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">K</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    Kanban Boards
                  </h1>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-2 flex items-center space-x-2">
                    <span>{filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}</span>
                    {searchQuery && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>found from {boards?.length || 0} total</span>
                      </>
                    )}
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live updates</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications System */}
              <NotificationSystem />
              
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
              
              {/* Create Board Button */}
              <button
                type="button"
                onClick={() => setIsCreateDialogOpen(true)}
                className="group relative inline-flex items-center gap-x-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-all duration-200 hover:scale-105"
              >
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
                <span>New Board</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
        {/* Search Section */}
        <div className="mb-8">
          <div className="relative max-w-lg">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search boards by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border-0 py-3 pl-12 pr-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                title="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {/* Boards Section */}
        <div className="space-y-4">
          {filteredBoards.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-4">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 dark:from-indigo-900/30 to-purple-100 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-4xl">
                  {searchQuery ? '🔍' : '📋'}
                </span>
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    No boards found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    No boards match "{searchQuery}". Try a different search term or create a new board.
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      Clear search
                    </button>
                    <button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Board
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Ready to get organized? ✨
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
                    Create your first kanban board to start organizing projects, tracking progress, and collaborating with your team.
                  </p>
                  <button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="inline-flex items-center gap-x-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-300"
                  >
                    <PlusIcon className="h-6 w-6" aria-hidden="true" />
                    Create your first board
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Board Cards Grid */
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Boards
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
                  {searchQuery && (
                    <span className="ml-1">found</span>
                  )}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoards.slice(0, 12).map((board) => {
                  const emoji = getBoardEmoji(board.name, board.goal);
                  const activity = getBoardActivity(board);
                  
                  return (
                    <div
                      key={board.id}
                      className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-indigo-300 dark:hover:ring-indigo-600 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    >
                      {/* Board Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 dark:from-indigo-900/30 to-purple-100 dark:to-purple-900/30 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                            {emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-900 dark:group-hover:text-indigo-100 transition-colors duration-200 truncate">
                              {board.name}
                            </h3>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                              activity.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                              activity.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              activity.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                activity.color === 'emerald' ? 'bg-emerald-500' :
                                activity.color === 'blue' ? 'bg-blue-500' :
                                activity.color === 'amber' ? 'bg-amber-500' :
                                'bg-gray-400'
                              }`}></div>
                              {activity.label}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            onClick={() => handleEditClick(board)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200"
                            title="Edit board"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(board.id, board.name)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="Delete board"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Board Description */}
                      <p className="text-base text-gray-600 dark:text-gray-400 mb-6 line-clamp-3 leading-relaxed">
                        {board.goal}
                      </p>
                      
                      {/* Board Stats */}
                      <div className="flex items-center space-x-6 mb-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                          <span>3 tasks</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                          <span>2 in progress</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                          <span>1 done</span>
                        </div>
                      </div>
                      
                      {/* Board Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Updated {new Date(board.updated_at).toLocaleDateString()}</span>
                          <span className="flex items-center space-x-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span>Live</span>
                          </span>
                        </div>
                        
                        <Link
                          to={`/boards/${board.id}`}
                          className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-800 dark:hover:text-indigo-200 transition-all duration-200 hover:scale-105 shadow-sm"
                        >
                          Open Board
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {filteredBoards.length > 12 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Showing 12 of {filteredBoards.length} boards. Use search to find specific boards.
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200"
                  >
                    View all boards
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-md" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/20 ring-1 ring-white/20 dark:ring-gray-700/50 border border-red-100/50 dark:border-red-900/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-red-800 dark:from-white dark:to-red-400 bg-clip-text text-transparent">
                Delete Board
              </DialogTitle>
            </div>
            
            <div className="mb-6">
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                Are you sure you want to delete the board <span className="font-bold text-red-600 dark:text-red-400">"{boardToDelete?.name}"</span>? 
                This action cannot be undone and all tasks will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-6 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 text-sm font-bold text-white hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Create Board Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCreateDialogClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-indigo-900/30 to-purple-900/40 backdrop-blur-md" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20 dark:ring-gray-700/50 border border-indigo-100/50 dark:border-indigo-900/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <PlusIcon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 dark:from-white dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Create New Board
              </DialogTitle>
            </div>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="board-name" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Board Name
                </label>
                <input
                  type="text"
                  id="board-name"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name..."
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-gray-900 dark:text-white bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 focus:bg-white/90 dark:focus:bg-gray-700/90 text-base font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-indigo-800/20"
                  disabled={createBoardMutation.isPending}
                />
              </div>
              
              <div>
                <label htmlFor="board-goal" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Project Goal
                </label>
                <textarea
                  id="board-goal"
                  value={newBoardGoal}
                  onChange={(e) => setNewBoardGoal(e.target.value)}
                  placeholder="Describe the project goal in 1-3 sentences..."
                  rows={4}
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-gray-900 dark:text-white bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 focus:bg-white/90 dark:focus:bg-gray-700/90 text-base font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-indigo-800/20 resize-none"
                  disabled={createBoardMutation.isPending}
                />
              </div>
            </div>

            {createBoardMutation.isError && (
              <div className="mt-6 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {createBoardMutation.error instanceof Error 
                      ? createBoardMutation.error.message 
                      : 'Failed to create board'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-8 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={handleCreateDialogClose}
                disabled={createBoardMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-bold text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={handleCreateBoard}
                disabled={createBoardMutation.isPending || !newBoardName.trim() || !newBoardGoal.trim()}
              >
                {createBoardMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <PlusIcon className="w-4 h-4" aria-hidden="true" />
                    <span>Create Board</span>
                  </div>
                )}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-indigo-900/30 to-purple-900/40 backdrop-blur-md" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20 border border-indigo-100/50 dark:border-indigo-600/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 dark:from-white dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent">
                Edit Board
              </DialogTitle>
            </div>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="edit-board-name" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Board Name
                </label>
                <input
                  type="text"
                  id="edit-board-name"
                  value={editingBoard?.name || ''}
                  onChange={(e) => setEditingBoard(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter board name..."
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-gray-900 dark:text-white bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/90 dark:focus:bg-gray-700/90 text-base font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-indigo-500/20"
                />
              </div>
              
              <div>
                <label htmlFor="edit-board-goal" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Project Goal
                </label>
                <textarea
                  id="edit-board-goal"
                  value={editingBoard?.goal || ''}
                  onChange={(e) => setEditingBoard(prev => prev ? { ...prev, goal: e.target.value } : null)}
                  placeholder="Describe the project goal in 1-3 sentences..."
                  rows={4}
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-gray-900 dark:text-white bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/90 dark:focus:bg-gray-700/90 text-base font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 px-8 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-500 dark:hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-bold text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={handleEditBoard}
                disabled={!editingBoard?.name?.trim() || !editingBoard?.goal?.trim()}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Changes</span>
                </div>
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
