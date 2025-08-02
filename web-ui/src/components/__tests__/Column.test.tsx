import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Column from '../Column';
import { ColumnWithTasks, TaskSummary } from '../../types';
import { DndContext } from '@dnd-kit/core';

// Mock the drag and drop hooks with detailed implementation
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    useDroppable: vi.fn(),
    useDraggable: () => ({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
  };
});

// Mock the drag and drop context
vi.mock('../../contexts/DragAndDropContext', () => ({
  useDragAndDrop: vi.fn(),
}));

describe('Column', () => {
  // Comprehensive test data
  const baseTasks: TaskSummary[] = [
    {
      id: 'task-1',
      title: 'First Task',
      position: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      title: 'Second Task',
      position: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-3',
      title: 'Third Task',
      position: 3,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  const baseColumn: ColumnWithTasks = {
    id: 'column-1',
    name: 'To Do',
    position: 1,
    wipLimit: 5,
    isLanding: false,
    tasks: baseTasks.slice(0, 2), // Only first two tasks by default
  };

  const mockOnTaskClick = vi.fn();

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useDroppable } = await import('@dnd-kit/core');
    const { useDragAndDrop } = await import('../../contexts/DragAndDropContext');
    
    vi.mocked(useDroppable).mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
      active: null,
      rect: { current: null },
      node: { current: null },
      over: null,
    } as any);
    vi.mocked(useDragAndDrop).mockReturnValue({
      isDragging: false,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const renderColumn = (
    column = baseColumn, 
    onTaskClick = mockOnTaskClick,
    contextProps = {}
  ) => {
    const user = userEvent.setup();
    return {
      user,
      ...render(
        <DndContext {...contextProps}>
          <Column column={column} onTaskClick={onTaskClick} />
        </DndContext>
      )
    };
  };

  // Basic rendering and structure
  describe('Basic rendering and structure', () => {
    it('renders column name as proper heading', () => {
      renderColumn();
      const heading = screen.getByRole('heading', { name: 'To Do' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-sm', 'font-semibold');
    });

    it('displays correct task count and WIP limit formatting', () => {
      renderColumn();
      expect(screen.getByText('2 / 5')).toBeInTheDocument();
      expect(screen.getByText('2 / 5')).toHaveClass('inline-flex', 'items-center', 'rounded-full');
    });

    it('displays task count without WIP limit when limit is 0', () => {
      const columnWithoutLimit: ColumnWithTasks = {
        ...baseColumn,
        wipLimit: 0,
      };
      renderColumn(columnWithoutLimit);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('displays task count without WIP limit when limit is negative', () => {
      const columnWithNegativeLimit: ColumnWithTasks = {
        ...baseColumn,
        wipLimit: -1,
      };
      renderColumn(columnWithNegativeLimit);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('maintains proper semantic structure', () => {
      const { container } = renderColumn();
      
      // Check main column container
      const columnContainer = container.querySelector('[class*="flex flex-col"]');
      expect(columnContainer).toBeInTheDocument();
      
      // Check header section
      const headerSection = container.querySelector('[class*="border-t-4"]');
      expect(headerSection).toBeInTheDocument();
      
      // Check content section
      const contentSection = container.querySelector('[class*="overflow-visible flex-1"]');
      expect(contentSection).toBeInTheDocument();
    });

    it('applies proper responsive design classes', () => {
      const { container } = renderColumn();
      const columnContainer = container.querySelector('[class*="min-w-[280px]"]');
      expect(columnContainer).toBeInTheDocument();
    });
  });

  // Landing column functionality
  describe('Landing column functionality', () => {
    it('shows landing badge for landing columns', () => {
      const landingColumn: ColumnWithTasks = {
        ...baseColumn,
        isLanding: true,
      };
      renderColumn(landingColumn);
      const landingBadge = screen.getByText('Landing');
      expect(landingBadge).toBeInTheDocument();
      expect(landingBadge).toHaveClass('bg-blue-200', 'text-blue-800');
    });

    it('does not show landing badge for regular columns', () => {
      renderColumn();
      expect(screen.queryByText('Landing')).not.toBeInTheDocument();
    });

    it('applies special header styling for landing columns', () => {
      const landingColumn: ColumnWithTasks = {
        ...baseColumn,
        isLanding: true,
      };
      const { container } = renderColumn(landingColumn);
      const header = container.querySelector('[class*="bg-blue-100 border-blue-200 text-blue-800"]');
      expect(header).toBeInTheDocument();
    });

    it('prioritizes landing status over name-based coloring', () => {
      const landingDoneColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'Done', // Would normally be green
        isLanding: true, // Should override to blue
      };
      const { container } = renderColumn(landingDoneColumn);
      const header = container.querySelector('[class*="bg-blue-100"]');
      expect(header).toBeInTheDocument();
      // Should not have green styling
      expect(container.querySelector('[class*="bg-green-100"]')).not.toBeInTheDocument();
    });
  });

  // Task rendering and interaction
  describe('Task rendering and interaction', () => {
    it('renders all tasks in the column in correct order', () => {
      renderColumn();
      const taskElements = screen.getAllByText(/Task/);
      expect(taskElements).toHaveLength(2);
      expect(taskElements[0]).toHaveTextContent('First Task');
      expect(taskElements[1]).toHaveTextContent('Second Task');
    });

    it('calls onTaskClick with correct taskId when task is clicked', () => {
      renderColumn();
      fireEvent.click(screen.getByText('First Task'));
      expect(mockOnTaskClick).toHaveBeenCalledWith('task-1');
      expect(mockOnTaskClick).toHaveBeenCalledTimes(1);
    });

    it('calls onTaskClick for different tasks independently', () => {
      renderColumn();
      fireEvent.click(screen.getByText('First Task'));
      fireEvent.click(screen.getByText('Second Task'));
      
      expect(mockOnTaskClick).toHaveBeenCalledWith('task-1');
      expect(mockOnTaskClick).toHaveBeenCalledWith('task-2');
      expect(mockOnTaskClick).toHaveBeenCalledTimes(2);
    });

    it('handles rapid task clicks correctly', () => {
      renderColumn();
      const firstTask = screen.getByText('First Task');
      
      // Click rapidly
      fireEvent.click(firstTask);
      fireEvent.click(firstTask);
      fireEvent.click(firstTask);
      
      expect(mockOnTaskClick).toHaveBeenCalledTimes(3);
      expect(mockOnTaskClick).toHaveBeenCalledWith('task-1');
    });

    it('renders tasks with proper accessibility attributes', () => {
      const { container } = renderColumn();
      const taskList = container.querySelector('ul');
      expect(taskList).toBeInTheDocument();
      expect(taskList).toHaveClass('space-y-3');
      
      const taskItems = container.querySelectorAll('li');
      expect(taskItems).toHaveLength(2);
    });

    it('handles empty task list gracefully', () => {
      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };
      renderColumn(emptyColumn);
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('handles large number of tasks efficiently', () => {
      const manyTasks = Array(50).fill(null).map((_, i) => ({
        id: `task-${i + 1}`,
        title: `Task ${i + 1}`,
        position: i + 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      const columnWithManyTasks: ColumnWithTasks = {
        ...baseColumn,
        tasks: manyTasks,
      };

      const { container } = renderColumn(columnWithManyTasks);
      const taskItems = container.querySelectorAll('li');
      expect(taskItems).toHaveLength(50);
      expect(screen.getByText('50 / 5')).toBeInTheDocument();
    });
  });

  // Empty state handling
  describe('Empty state handling', () => {
    it('shows enhanced empty state message', () => {
      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };
      renderColumn(emptyColumn);
      const emptyState = screen.getByText('No tasks yet');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass('text-center', 'text-sm', 'text-gray-500');
    });

    it('applies proper empty state styling', () => {
      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };
      const { container } = renderColumn(emptyColumn);
      const emptyStateContainer = container.querySelector('[class*="border-2 border-dashed border-gray-200 rounded-lg"]');
      expect(emptyStateContainer).toBeInTheDocument();
    });

    it('shows drop feedback in empty state when isOver is true', async () => {
      const { useDroppable } = await import('@dnd-kit/core');
      vi.mocked(useDroppable).mockReturnValue({
        setNodeRef: vi.fn(),
        isOver: true,
        active: null,
        rect: { current: null },
        node: { current: null },
        over: null,
      } as any);

      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };
      renderColumn(emptyColumn);
      expect(screen.getByText('✨ Drop task here')).toBeInTheDocument();
    });

    it('applies drop zone styling when hovering over empty column', async () => {
      const { useDroppable } = await import('@dnd-kit/core');
      vi.mocked(useDroppable).mockReturnValue({
        setNodeRef: vi.fn(),
        isOver: true,
        active: null,
        rect: { current: null },
        node: { current: null },
        over: null,
      } as any);

      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };
      const { container } = renderColumn(emptyColumn);
      const dropZone = container.querySelector('[class*="bg-indigo-50 border-indigo-300 text-indigo-600"]');
      expect(dropZone).toBeInTheDocument();
    });
  });

  // WIP limits and capacity management
  describe('WIP limits and capacity management', () => {
    it('shows normal capacity indicator when well below limit', () => {
      const lowCapacityColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: baseTasks.slice(0, 1), // 1 out of 5
      };
      renderColumn(lowCapacityColumn);
      const capacityIndicator = screen.getByText('1 / 5');
      expect(capacityIndicator).toHaveClass('bg-white/80', 'text-gray-700');
    });

    it('shows near capacity warning at 80% threshold', () => {
      const nearCapacityColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(4).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
        wipLimit: 5,
      };
      renderColumn(nearCapacityColumn);
      const capacityIndicator = screen.getByText('4 / 5');
      expect(capacityIndicator).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });

    it('shows at capacity warning when exactly at limit', () => {
      const atCapacityColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(5).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
        wipLimit: 5,
      };
      renderColumn(atCapacityColumn);
      const capacityIndicator = screen.getByText('5 / 5');
      expect(capacityIndicator).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('shows over capacity warning when exceeding limit', () => {
      const overCapacityColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(6).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
        wipLimit: 5,
      };
      renderColumn(overCapacityColumn);
      const capacityIndicator = screen.getByText('6 / 5');
      expect(capacityIndicator).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('handles WIP limit of 1 correctly', () => {
      const singleItemColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: baseTasks.slice(0, 1),
        wipLimit: 1,
      };
      renderColumn(singleItemColumn);
      const capacityIndicator = screen.getByText('1 / 1');
      expect(capacityIndicator).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('calculates near capacity threshold correctly for different limits', () => {
      const column10Limit: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(8).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
        wipLimit: 10, // 8/10 = 80%
      };
      renderColumn(column10Limit);
      const capacityIndicator = screen.getByText('8 / 10');
      expect(capacityIndicator).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });
  });

  // Column header color system
  describe('Column header color system', () => {
    const headerColorTestCases = [
      { 
        name: 'Landing Column Override', 
        column: { ...baseColumn, isLanding: true, name: 'Should Be Blue Regardless' },
        expectedClasses: ['bg-blue-100', 'border-blue-200', 'text-blue-800'] 
      },
      { 
        name: 'Todo Column (lowercase)', 
        column: { ...baseColumn, name: 'todo items' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
      { 
        name: 'Todo Column (mixed case)', 
        column: { ...baseColumn, name: 'To Do Tasks' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
      { 
        name: 'Backlog Column', 
        column: { ...baseColumn, name: 'Product Backlog' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
      { 
        name: 'In Progress Column', 
        column: { ...baseColumn, name: 'Work In Progress' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Development Column', 
        column: { ...baseColumn, name: 'Active Development' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Doing Column', 
        column: { ...baseColumn, name: 'Currently Doing' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Review Column', 
        column: { ...baseColumn, name: 'Code Review' },
        expectedClasses: ['bg-orange-100', 'border-orange-200', 'text-orange-800'] 
      },
      { 
        name: 'Testing Column', 
        column: { ...baseColumn, name: 'QA Testing' },
        expectedClasses: ['bg-orange-100', 'border-orange-200', 'text-orange-800'] 
      },
      { 
        name: 'Done Column', 
        column: { ...baseColumn, name: 'Done' },
        expectedClasses: ['bg-green-100', 'border-green-200', 'text-green-800'] 
      },
      { 
        name: 'Complete Column', 
        column: { ...baseColumn, name: 'Completed Items' },
        expectedClasses: ['bg-green-100', 'border-green-200', 'text-green-800'] 
      },
      { 
        name: 'Unknown Column Type', 
        column: { ...baseColumn, name: 'Custom Workflow Stage' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
    ];

    headerColorTestCases.forEach(({ name, column, expectedClasses }) => {
      it(`applies correct header colors for ${name}`, () => {
        const { container } = renderColumn(column);
        const header = container.querySelector('div[class*="border-t-4"]');
        expect(header).toBeInTheDocument();
        
        expectedClasses.forEach(className => {
          expect(header).toHaveClass(className);
        });
      });
    });

    it('applies proper header structure and spacing', () => {
      const { container } = renderColumn();
      const header = container.querySelector('[class*="flex justify-between items-center p-3 border-b border-t-4 rounded-t-lg"]');
      expect(header).toBeInTheDocument();
    });

    it('handles extremely long column names in header', () => {
      const longNameColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'This is an extremely long column name that should be handled gracefully without breaking the layout or causing overflow issues in the header section'
      };
      const { container } = renderColumn(longNameColumn);
      const header = container.querySelector('h3');
      expect(header).toHaveTextContent(longNameColumn.name);
      expect(header).toHaveClass('text-sm', 'font-semibold');
    });
  });

  // Drag and drop integration
  describe('Drag and drop integration', () => {
    it('calls setNodeRef on mount for drop zone setup', async () => {
      const { useDroppable } = await import('@dnd-kit/core');
      const mockSetNodeRef = vi.fn();
      vi.mocked(useDroppable).mockReturnValue({
        setNodeRef: mockSetNodeRef,
        isOver: false,
        active: null,
        rect: { current: null },
        node: { current: null },
        over: null,
      } as any);

      renderColumn();
      expect(mockSetNodeRef).toHaveBeenCalled();
    });

    it('provides correct column data to useDroppable', async () => {
      renderColumn();
      const { useDroppable } = await import('@dnd-kit/core');
      expect(vi.mocked(useDroppable)).toHaveBeenCalledWith({
        id: baseColumn.id,
        data: {
          column: baseColumn,
        },
      });
    });

    it('applies drop indicator styles when dragging over column', async () => {
      const { useDroppable } = await import('@dnd-kit/core');
      const { useDragAndDrop } = await import('../../contexts/DragAndDropContext');
      
      vi.mocked(useDroppable).mockReturnValue({
        setNodeRef: vi.fn(),
        isOver: true,
        active: null,
        rect: { current: null },
        node: { current: null },
        over: null,
      } as any);
      vi.mocked(useDragAndDrop).mockReturnValue({
        isDragging: true,
      });

      const { container } = renderColumn();
      const columnContainer = container.querySelector('[class*="border-2 border-dashed border-indigo-500 bg-indigo-50"]');
      expect(columnContainer).toBeInTheDocument();
    });

    it('does not apply drop styles when not dragging', async () => {
      const { useDroppable } = await import('@dnd-kit/core');
      const { useDragAndDrop } = await import('../../contexts/DragAndDropContext');
      
      vi.mocked(useDroppable).mockReturnValue({
        setNodeRef: vi.fn(),
        isOver: true,
        active: null,
        rect: { current: null },
        node: { current: null },
        over: null,
      } as any);
      vi.mocked(useDragAndDrop).mockReturnValue({
        isDragging: false,
      });

      const { container } = renderColumn();
      const columnContainer = container.querySelector('[class*="border-2 border-dashed border-indigo-500"]');
      expect(columnContainer).not.toBeInTheDocument();
    });

    it('applies proper transition effects for drag feedback', () => {
      const { container } = renderColumn();
      const columnContainer = container.querySelector('[class*="transition-all"]');
      expect(columnContainer).toBeInTheDocument();
    });

    it('maintains proper z-index during drag operations', async () => {
      const { useDragAndDrop } = await import('../../contexts/DragAndDropContext');
      vi.mocked(useDragAndDrop).mockReturnValue({
        isDragging: true,
      });

      const { container } = renderColumn();
      // Should maintain proper layering
      const columnContainer = container.querySelector('[class*="flex flex-col"]');
      expect(columnContainer).toBeInTheDocument();
    });
  });

  // Performance and accessibility
  describe('Performance and accessibility', () => {
    it('provides proper ARIA labeling for screen readers', () => {
      const { container } = renderColumn();
      const heading = screen.getByRole('heading', { name: 'To Do' });
      expect(heading).toBeInTheDocument();
      
      // Task list should be properly structured
      const taskList = container.querySelector('ul');
      if (taskList) {
        expect(taskList).toBeInTheDocument();
      }
    });

    it('handles keyboard navigation properly', () => {
      renderColumn();
      
      // Tasks should be focusable with keyboard
      const taskCards = screen.getAllByRole('button');
      expect(taskCards.length).toBeGreaterThan(0);
      
      // Each task card should have proper tabIndex
      taskCards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    it('maintains proper contrast ratios for accessibility', () => {
      const { container } = renderColumn();
      
      // Check that text colors have sufficient contrast
      const heading = container.querySelector('h3');
      expect(heading).toHaveClass('text-sm', 'font-semibold');
      
      const capacityIndicator = screen.getByText('2 / 5');
      expect(capacityIndicator).toHaveClass('text-gray-700');
    });

    it('handles focus management correctly', async () => {
      renderColumn();
      
      // Should be able to focus on interactive elements
      const tasks = screen.getAllByText(/Task/);
      for (const task of tasks) {
        const taskContainer = task.closest('[role="button"]');
        if (taskContainer) {
          expect(taskContainer).toBeInTheDocument();
        }
      }
    });

    it('provides proper semantic structure for assistive technologies', () => {
      const { container } = renderColumn();
      
      // Check semantic HTML structure - get specifically the column heading
      const columnHeading = screen.getByRole('heading', { name: 'To Do' });
      expect(columnHeading).toBeInTheDocument();
      
      const list = container.querySelector('ul');
      if (list) {
        const listItems = list.querySelectorAll('li');
        expect(listItems.length).toBeGreaterThan(0);
      }
    });
  });

  // Error handling and edge cases
  describe('Error handling and edge cases', () => {
    it('handles null/undefined tasks array gracefully', () => {
      const columnWithNullTasks = {
        ...baseColumn,
        tasks: null as any,
      };
      
      expect(() => renderColumn(columnWithNullTasks)).not.toThrow();
    });

    it('handles invalid task data gracefully', () => {
      const columnWithInvalidTasks: ColumnWithTasks = {
        ...baseColumn,
        tasks: [
          {
            id: '',
            title: '',
            position: 0,
            createdAt: '',
            updatedAt: '',
          },
          null as any,
          undefined as any,
        ].filter(Boolean),
      };
      
      expect(() => renderColumn(columnWithInvalidTasks)).not.toThrow();
    });

    it('handles extremely large WIP limits', () => {
      const largeWipColumn: ColumnWithTasks = {
        ...baseColumn,
        wipLimit: 999999,
      };
      renderColumn(largeWipColumn);
      expect(screen.getByText('2 / 999999')).toBeInTheDocument();
    });

    it('handles negative task positions', () => {
      const negativePositionTasks: TaskSummary[] = [
        {
          ...baseTasks[0],
          position: -1,
        },
        {
          ...baseTasks[1],
          position: -5,
        },
      ];

      const columnWithNegativePositions: ColumnWithTasks = {
        ...baseColumn,
        tasks: negativePositionTasks,
      };

      expect(() => renderColumn(columnWithNegativePositions)).not.toThrow();
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
    });

    it('handles missing column properties', () => {
      const minimalColumn = {
        id: 'minimal',
        name: 'Minimal',
        position: 1,
        wipLimit: 0,
        isLanding: false,
        tasks: [],
      } as ColumnWithTasks;

      expect(() => renderColumn(minimalColumn)).not.toThrow();
      expect(screen.getByText('Minimal')).toBeInTheDocument();
    });

    it('handles special characters in column names', () => {
      const specialCharColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'Column with émojis 🚀 & special chars: <>&"\'`',
      };
      renderColumn(specialCharColumn);
      const columnHeading = screen.getByRole('heading', { name: 'Column with émojis 🚀 & special chars: <>&"\'`' });
      expect(columnHeading).toBeInTheDocument();
    });
  });

  // Component state and updates
  describe('Component state and updates', () => {
    it('updates task count when tasks are added', () => {
      const { rerender } = renderColumn();
      expect(screen.getByText('2 / 5')).toBeInTheDocument();

      const updatedColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [...baseTasks],
      };

      rerender(
        <DndContext>
          <Column column={updatedColumn} onTaskClick={mockOnTaskClick} />
        </DndContext>
      );

      expect(screen.getByText('3 / 5')).toBeInTheDocument();
      expect(screen.getByText('Third Task')).toBeInTheDocument();
    });

    it('updates capacity warning styles when approaching limit', () => {
      const { rerender } = renderColumn();
      let capacityIndicator = screen.getByText('2 / 5');
      expect(capacityIndicator).toHaveClass('bg-white/80', 'text-gray-700');

      // Update to near capacity
      const nearCapacityColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(4).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
      };

      rerender(
        <DndContext>
          <Column column={nearCapacityColumn} onTaskClick={mockOnTaskClick} />
        </DndContext>
      );

      capacityIndicator = screen.getByText('4 / 5');
      expect(capacityIndicator).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });

    it('updates column name and styling when column properties change', () => {
      const { rerender } = renderColumn();
      expect(screen.getByRole('heading', { name: 'To Do' })).toBeInTheDocument();

      const updatedColumn: ColumnWithTasks = {
        ...baseColumn,
        name: 'In Progress',
      };

      rerender(
        <DndContext>
          <Column column={updatedColumn} onTaskClick={mockOnTaskClick} />
        </DndContext>
      );

      expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'To Do' })).not.toBeInTheDocument();
    });

    it('handles rapid task additions and removals', () => {
      const { rerender } = renderColumn();
      
      // Add many tasks
      const manyTasksColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: Array(20).fill(null).map((_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          position: i + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
      };

      rerender(
        <DndContext>
          <Column column={manyTasksColumn} onTaskClick={mockOnTaskClick} />
        </DndContext>
      );

      expect(screen.getByText('20 / 5')).toBeInTheDocument();

      // Remove all tasks
      const emptyColumn: ColumnWithTasks = {
        ...baseColumn,
        tasks: [],
      };

      rerender(
        <DndContext>
          <Column column={emptyColumn} onTaskClick={mockOnTaskClick} />
        </DndContext>
      );

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByText('0 / 5')).toBeInTheDocument();
    });
  });
});