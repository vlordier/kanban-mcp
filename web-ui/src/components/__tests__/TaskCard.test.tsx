import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import TaskCard from '../TaskCard';
import { TaskSummary, ColumnWithTasks } from '../../types';
import { DndContext } from '@dnd-kit/core';

// Mock the drag and drop hooks
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    useDraggable: vi.fn(),
  };
});

describe('TaskCard', () => {
  // Test data with various edge cases
  const baseTask: TaskSummary = {
    id: 'task-1',
    title: 'Test Task',
    position: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const baseColumn: ColumnWithTasks = {
    id: 'column-1',
    name: 'To Do',
    position: 1,
    wipLimit: 5,
    isLanding: false,
    tasks: [baseTask],
  };

  // Mock current time for consistent stale detection
  const MOCK_CURRENT_TIME = new Date('2024-01-15T00:00:00Z').getTime();

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.setSystemTime(MOCK_CURRENT_TIME);
    
    const { useDraggable } = await import('@dnd-kit/core');
    vi.mocked(useDraggable).mockReturnValue({
      active: null,
      activatorEvent: null,
      activeNodeRect: null,
      attributes: { 
        role: 'button', 
        'aria-describedby': 'DndDescribedBy-1', 
        tabIndex: 0,
        'aria-disabled': false,
        'aria-pressed': undefined,
        'aria-roledescription': 'Draggable'
      } as any,
      isDragging: false,
      listeners: { onPointerDown: vi.fn(), onKeyDown: vi.fn() },
      node: { current: null },
      over: null,
      setNodeRef: vi.fn(),
      transform: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const renderTaskCard = (
    task = baseTask, 
    column = baseColumn, 
    isMoving = false,
    contextProps = {}
  ) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    return {
      user,
      ...render(
        <DndContext {...contextProps}>
          <TaskCard task={task} column={column} isMoving={isMoving} />
        </DndContext>
      )
    };
  };

  // Basic rendering tests
  describe('Basic rendering', () => {
    it('renders task title correctly', () => {
      renderTaskCard();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('renders task title as a heading with correct hierarchy', () => {
      renderTaskCard();
      const title = screen.getByRole('heading', { level: 4 });
      expect(title).toHaveTextContent('Test Task');
      expect(title).toHaveClass('text-sm', 'font-semibold');
    });

    it('displays formatted update date with correct locale formatting', () => {
      renderTaskCard();
      const expectedDate = new Date('2024-01-01T00:00:00Z').toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it('applies proper semantic structure with correct ARIA attributes', () => {
      renderTaskCard();
      const taskCard = screen.getByRole('button');
      expect(taskCard).toHaveAttribute('tabIndex', '0');
      expect(taskCard).toHaveAttribute('aria-describedby');
    });

    it('has proper cursor styling for interactivity', () => {
      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="cursor-pointer"]');
      expect(taskCard).toBeInTheDocument();
    });
  });

  // Edge cases and data validation
  describe('Edge cases and data handling', () => {
    it('handles empty task title gracefully', () => {
      const emptyTitleTask: TaskSummary = { ...baseTask, title: '' };
      renderTaskCard(emptyTitleTask);
      const titleElement = screen.getByRole('heading', { level: 4 });
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toBeEmptyDOMElement();
    });

    it('handles very long task titles with proper truncation', () => {
      const longTitleTask: TaskSummary = {
        ...baseTask,
        title: 'This is an extremely long task title that should be handled properly with ellipsis and responsive design considerations'
      };
      renderTaskCard(longTitleTask);
      const titleElement = screen.getByRole('heading', { level: 4 });
      expect(titleElement).toHaveClass('leading-tight', 'flex-1', 'pr-2');
    });

    it('handles invalid date strings gracefully', () => {
      const invalidDateTask: TaskSummary = {
        ...baseTask,
        updatedAt: 'invalid-date-string'
      };
      renderTaskCard(invalidDateTask);
      // Should not crash and should display "Invalid Date"
      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });

    it('handles missing task properties', () => {
      const minimalTask = {
        id: 'minimal-task',
        title: 'Minimal Task',
        position: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      } as TaskSummary;
      
      expect(() => renderTaskCard(minimalTask)).not.toThrow();
      expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    });

    it('handles special characters in task title', () => {
      const specialCharTask: TaskSummary = {
        ...baseTask,
        title: 'Task with émojis 🚀 & special chars: <>&"\'`'
      };
      renderTaskCard(specialCharTask);
      expect(screen.getByText('Task with émojis 🚀 & special chars: <>&"\'`')).toBeInTheDocument();
    });
  });

  // Stale detection with precise timing
  describe('Stale task detection', () => {
    it('shows stale badge for tasks exactly 8 days old', () => {
      const exactlyStaleTask: TaskSummary = {
        ...baseTask,
        updatedAt: new Date(MOCK_CURRENT_TIME - 8 * 24 * 60 * 60 * 1000).toISOString(),
      };
      renderTaskCard(exactlyStaleTask);
      expect(screen.getByText('Stale')).toBeInTheDocument();
    });

    it('does not show stale badge for tasks exactly 7 days old', () => {
      const exactlySevenDaysTask: TaskSummary = {
        ...baseTask,
        updatedAt: new Date(MOCK_CURRENT_TIME - 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      renderTaskCard(exactlySevenDaysTask);
      expect(screen.queryByText('Stale')).not.toBeInTheDocument();
    });

    it('shows stale badge for very old tasks', () => {
      const veryOldTask: TaskSummary = {
        ...baseTask,
        updatedAt: '2020-01-01T00:00:00Z',
      };
      renderTaskCard(veryOldTask);
      const staleBadge = screen.getByText('Stale');
      expect(staleBadge).toBeInTheDocument();
      expect(staleBadge).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('does not show stale badge for future dates', () => {
      const futureTask: TaskSummary = {
        ...baseTask,
        updatedAt: new Date(MOCK_CURRENT_TIME + 24 * 60 * 60 * 1000).toISOString(),
      };
      renderTaskCard(futureTask);
      expect(screen.queryByText('Stale')).not.toBeInTheDocument();
    });

    it('applies stale border styling correctly', () => {
      const staleTask: TaskSummary = {
        ...baseTask,
        updatedAt: new Date(MOCK_CURRENT_TIME - 10 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { container } = renderTaskCard(staleTask);
      const taskCard = container.querySelector('[class*="border-r-2 border-r-red-300"]');
      expect(taskCard).toBeInTheDocument();
    });
  });

  // Column information display
  describe('Column information display', () => {
    it('displays column name badge with correct styling', () => {
      renderTaskCard();
      const columnBadge = screen.getByText('To Do');
      expect(columnBadge).toHaveClass('inline-flex', 'items-center', 'px-2', 'py-1', 'rounded-md', 'bg-gray-100', 'text-gray-600', 'font-medium');
    });

    it('updates column name when column changes', () => {
      const { rerender } = renderTaskCard();
      expect(screen.getByText('To Do')).toBeInTheDocument();

      const newColumn: ColumnWithTasks = { ...baseColumn, name: 'In Progress' };
      rerender(
        <DndContext>
          <TaskCard task={baseTask} column={newColumn} isMoving={false} />
        </DndContext>
      );
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.queryByText('To Do')).not.toBeInTheDocument();
    });

    it('handles very long column names appropriately', () => {
      const longNameColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'This is a very long column name that might cause layout issues'
      };
      renderTaskCard(baseTask, longNameColumn);
      expect(screen.getByText('This is a very long column name that might cause layout issues')).toBeInTheDocument();
    });
  });

  // Update reason indicators
  describe('Update reason indicators', () => {
    it('shows update reason indicator with correct attributes', () => {
      const taskWithReason: TaskSummary = {
        ...baseTask,
        updateReason: 'Task was updated due to requirements change',
      };
      renderTaskCard(taskWithReason);
      const indicator = screen.getByTitle('Has update reason');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('w-2', 'h-2', 'bg-blue-400', 'rounded-full');
    });

    it('does not show indicator for undefined update reason', () => {
      renderTaskCard();
      expect(screen.queryByTitle('Has update reason')).not.toBeInTheDocument();
    });

    it('does not show indicator for empty update reason', () => {
      const taskWithEmptyReason: TaskSummary = {
        ...baseTask,
        updateReason: '',
      };
      renderTaskCard(taskWithEmptyReason);
      expect(screen.queryByTitle('Has update reason')).not.toBeInTheDocument();
    });

    it('shows indicator for whitespace-only update reason', () => {
      const taskWithWhitespaceReason: TaskSummary = {
        ...baseTask,
        updateReason: '   ',
      };
      renderTaskCard(taskWithWhitespaceReason);
      expect(screen.getByTitle('Has update reason')).toBeInTheDocument();
    });
  });

  // Status color comprehensive testing
  describe('Status color detection', () => {
    const colorTestCases = [
      // Landing column
      { 
        columnProps: { isLanding: true, name: 'Any Name' }, 
        expectedClass: 'border-l-blue-400',
        description: 'landing column regardless of name'
      },
      // Todo/Backlog variations
      { 
        columnProps: { isLanding: false, name: 'todo' }, 
        expectedClass: 'border-l-gray-400',
        description: 'lowercase todo'
      },
      { 
        columnProps: { isLanding: false, name: 'TODO ITEMS' }, 
        expectedClass: 'border-l-gray-400',
        description: 'uppercase todo'
      },
      { 
        columnProps: { isLanding: false, name: 'Product Backlog' }, 
        expectedClass: 'border-l-gray-400',
        description: 'backlog column'
      },
      // In-progress variations
      { 
        columnProps: { isLanding: false, name: 'In Progress' }, 
        expectedClass: 'border-l-yellow-400',
        description: 'in progress column'
      },
      { 
        columnProps: { isLanding: false, name: 'Development' }, 
        expectedClass: 'border-l-yellow-400',
        description: 'development column'
      },
      { 
        columnProps: { isLanding: false, name: 'Currently Doing' }, 
        expectedClass: 'border-l-yellow-400',
        description: 'doing column'
      },
      // Review/Testing variations
      { 
        columnProps: { isLanding: false, name: 'Code Review' }, 
        expectedClass: 'border-l-orange-400',
        description: 'review column'
      },
      { 
        columnProps: { isLanding: false, name: 'Testing Phase' }, 
        expectedClass: 'border-l-orange-400',
        description: 'testing column'
      },
      // Done/Complete variations
      { 
        columnProps: { isLanding: false, name: 'Done' }, 
        expectedClass: 'border-l-green-400',
        description: 'done column'
      },
      { 
        columnProps: { isLanding: false, name: 'Completed Tasks' }, 
        expectedClass: 'border-l-green-400',
        description: 'complete column'
      },
      // Default case
      { 
        columnProps: { isLanding: false, name: 'Unknown Column Type' }, 
        expectedClass: 'border-l-gray-400',
        description: 'unknown column type defaults to gray'
      },
    ];

    colorTestCases.forEach(({ columnProps, expectedClass, description }) => {
      it(`applies ${expectedClass} for ${description}`, () => {
        const testColumn: ColumnWithTasks = { ...baseColumn, ...columnProps };
        const { container } = renderTaskCard(baseTask, testColumn);
        const taskCard = container.querySelector(`[class*="${expectedClass}"]`);
        expect(taskCard).toBeInTheDocument();
      });
    });

    it('applies background color matching the border color', () => {
      const inProgressColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'In Progress',
      };
      const { container } = renderTaskCard(baseTask, inProgressColumn);
      const taskCard = container.querySelector('[class*="bg-yellow-50/30"]');
      expect(taskCard).toBeInTheDocument();
    });
  });

  // Drag and drop integration
  describe('Drag and drop integration', () => {
    it('applies dragging styles when isDragging is true', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      vi.mocked(useDraggable).mockReturnValue({
        active: null,
        activatorEvent: null,
        activeNodeRect: null,
        attributes: { 
          role: 'button', 
          'aria-describedby': 'DndDescribedBy-1', 
          tabIndex: 0,
          'aria-disabled': false,
          'aria-pressed': undefined,
          'aria-roledescription': 'Draggable'
        } as any,
        listeners: { onPointerDown: vi.fn(), onKeyDown: vi.fn() },
        node: { current: null },
        over: null,
        setNodeRef: vi.fn(),
        transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
        isDragging: true,
      } as any);

      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="opacity-50"]');
      expect(taskCard).toBeInTheDocument();
    });

    it('applies transform styles during drag', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      vi.mocked(useDraggable).mockReturnValue({
        active: null,
        activatorEvent: null,
        activeNodeRect: null,
        attributes: { 
          role: 'button', 
          'aria-describedby': 'DndDescribedBy-1', 
          tabIndex: 0,
          'aria-disabled': false,
          'aria-pressed': undefined,
          'aria-roledescription': 'Draggable'
        } as any,
        listeners: { onPointerDown: vi.fn(), onKeyDown: vi.fn() },
        node: { current: null },
        over: null,
        setNodeRef: vi.fn(),
        transform: { x: 50, y: 100, scaleX: 1, scaleY: 1 },
        isDragging: false,
      } as any);

      const { container } = renderTaskCard();
      const taskCard = container.firstChild as HTMLElement;
      expect(taskCard.style.transform).toBe('translate3d(50px, 100px, 0)');
    });

    it('applies moving animation when isMoving prop is true', () => {
      const { container } = renderTaskCard(baseTask, baseColumn, true);
      const taskCard = container.querySelector('[class*="ring-2 ring-indigo-500 animate-pulse"]');
      expect(taskCard).toBeInTheDocument();
    });

    it('calls setNodeRef on mount', async () => {
      const { useDraggable } = await import('@dnd-kit/core');
      const mockSetNodeRef = vi.fn();
      vi.mocked(useDraggable).mockReturnValue({
        attributes: { 
          role: 'button', 
          'aria-describedby': 'DndDescribedBy-1', 
          tabIndex: 0,
          'aria-disabled': false,
          'aria-pressed': undefined,
          'aria-roledescription': 'Draggable'
        } as any,
        listeners: { onPointerDown: vi.fn(), onKeyDown: vi.fn() },
        setNodeRef: mockSetNodeRef,
        transform: null,
        isDragging: false,
      } as any);

      renderTaskCard();
      expect(mockSetNodeRef).toHaveBeenCalled();
    });

    it('provides correct drag data to useDraggable', async () => {
      renderTaskCard();
      const { useDraggable } = await import('@dnd-kit/core');
      expect(vi.mocked(useDraggable)).toHaveBeenCalledWith({
        id: baseTask.id,
        data: {
          task: baseTask,
          sourceColumn: baseColumn,
        },
      });
    });
  });

  // Performance and accessibility
  describe('Performance and accessibility', () => {
    it('has proper touch target size for mobile interaction', () => {
      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="touch-manipulation"]');
      expect(taskCard).toBeInTheDocument();
    });

    it('has proper focus management for keyboard navigation', () => {
      renderTaskCard();
      const taskCard = screen.getByRole('button');
      expect(taskCard).toHaveAttribute('tabIndex', '0');
    });

    it('applies smooth transitions for visual feedback', () => {
      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="transition-all"]');
      expect(taskCard).toBeInTheDocument();
    });

    it('provides proper hover states', () => {
      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="hover:shadow-md"]');
      expect(taskCard).toBeInTheDocument();
    });

    it('maintains proper aspect ratio and spacing', () => {
      const { container } = renderTaskCard();
      const taskCard = container.querySelector('[class*="p-4"]');
      expect(taskCard).toBeInTheDocument();
      
      const contentArea = container.querySelector('[class*="mb-2"]');
      expect(contentArea).toBeInTheDocument();
    });
  });

  // Component composition and layout
  describe('Component composition and layout', () => {
    it('maintains proper layout hierarchy', () => {
      renderTaskCard();
      
      // Main container
      const mainContainer = screen.getByRole('button');
      expect(mainContainer).toBeInTheDocument();
      
      // Header section with title and stale badge
      const headerSection = mainContainer.querySelector('[class*="flex items-start justify-between mb-2"]');
      expect(headerSection).toBeInTheDocument();
      
      // Footer section with column badge and date
      const footerSection = mainContainer.querySelector('[class*="flex items-center justify-between text-xs"]');
      expect(footerSection).toBeInTheDocument();
    });

    it('properly spaces elements within the card', () => {
      const { container } = renderTaskCard();
      
      // Check for proper spacing classes
      expect(container.querySelector('[class*="mb-2"]')).toBeInTheDocument(); // Header spacing
      expect(container.querySelector('[class*="space-x-2"]')).toBeInTheDocument(); // Horizontal spacing
      expect(container.querySelector('[class*="pr-2"]')).toBeInTheDocument(); // Title padding
    });

    it('handles multiple badges and indicators correctly', () => {
      const complexTask: TaskSummary = {
        ...baseTask,
        updatedAt: new Date(MOCK_CURRENT_TIME - 10 * 24 * 60 * 60 * 1000).toISOString(), // Stale
        updateReason: 'Has update reason',
      };

      const { container } = renderTaskCard(complexTask);
      
      // Should have both stale badge and update reason indicator
      expect(screen.getByText('Stale')).toBeInTheDocument();
      expect(screen.getByTitle('Has update reason')).toBeInTheDocument();
      
      // Should maintain proper layout
      const staleBadge = container.querySelector('[class*="bg-red-100"]');
      const updateIndicator = container.querySelector('[class*="bg-blue-400 rounded-full"]');
      expect(staleBadge).toBeInTheDocument();
      expect(updateIndicator).toBeInTheDocument();
    });
  });
});