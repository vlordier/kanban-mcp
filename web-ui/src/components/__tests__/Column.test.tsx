import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Column from '../Column';
import { ColumnWithTasks, TaskSummary } from '../../types';
import { DndContext } from '@dnd-kit/core';

// Mock the drag and drop hooks
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    useDroppable: () => ({
      setNodeRef: vi.fn(),
      isOver: false,
    }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
  };
});

// Mock the drag and drop context
vi.mock('../../contexts/DragAndDropContext', () => ({
  useDragAndDrop: () => ({
    isDragging: false,
  }),
}));

describe('Column', () => {
  const mockTasks: TaskSummary[] = [
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
  ];

  const mockColumn: ColumnWithTasks = {
    id: 'column-1',
    name: 'To Do',
    position: 1,
    wipLimit: 5,
    isLanding: false,
    tasks: mockTasks,
  };

  const mockOnTaskClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderColumn = (column = mockColumn, onTaskClick = mockOnTaskClick) => {
    return render(
      <DndContext>
        <Column column={column} onTaskClick={onTaskClick} />
      </DndContext>
    );
  };

  it('renders column name correctly', () => {
    renderColumn();
    expect(screen.getByRole('heading', { name: 'To Do' })).toBeInTheDocument();
  });

  it('displays task count and WIP limit', () => {
    renderColumn();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('displays task count without WIP limit when limit is 0', () => {
    const columnWithoutLimit: ColumnWithTasks = {
      ...mockColumn,
      wipLimit: 0,
    };
    renderColumn(columnWithoutLimit);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('shows landing badge for landing columns', () => {
    const landingColumn: ColumnWithTasks = {
      ...mockColumn,
      isLanding: true,
    };
    renderColumn(landingColumn);
    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('does not show landing badge for regular columns', () => {
    renderColumn();
    expect(screen.queryByText('Landing')).not.toBeInTheDocument();
  });

  it('renders all tasks in the column', () => {
    renderColumn();
    expect(screen.getByText('First Task')).toBeInTheDocument();
    expect(screen.getByText('Second Task')).toBeInTheDocument();
  });

  it('shows empty state when column has no tasks', () => {
    const emptyColumn: ColumnWithTasks = {
      ...mockColumn,
      tasks: [],
    };
    renderColumn(emptyColumn);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('calls onTaskClick when a task is clicked', () => {
    renderColumn();
    fireEvent.click(screen.getByText('First Task'));
    expect(mockOnTaskClick).toHaveBeenCalledWith('task-1');
  });

  it('applies capacity warning styles when at capacity', () => {
    const atCapacityColumn: ColumnWithTasks = {
      ...mockColumn,
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

  it('applies near capacity warning styles when near capacity', () => {
    const nearCapacityColumn: ColumnWithTasks = {
      ...mockColumn,
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

  it('applies normal styles when below capacity threshold', () => {
    renderColumn();
    const capacityIndicator = screen.getByText('2 / 5');
    expect(capacityIndicator).toHaveClass('bg-white/80', 'text-gray-700');
  });

  describe('Column header colors', () => {
    const testCases = [
      { 
        name: 'Landing Column', 
        column: { ...mockColumn, isLanding: true },
        expectedClasses: ['bg-blue-100', 'border-blue-200', 'text-blue-800'] 
      },
      { 
        name: 'Todo Column', 
        column: { ...mockColumn, name: 'Todo Tasks' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
      { 
        name: 'Backlog Column', 
        column: { ...mockColumn, name: 'Backlog' },
        expectedClasses: ['bg-gray-100', 'border-gray-200', 'text-gray-800'] 
      },
      { 
        name: 'In Progress Column', 
        column: { ...mockColumn, name: 'In Progress' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Development Column', 
        column: { ...mockColumn, name: 'Development' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Doing Column', 
        column: { ...mockColumn, name: 'Doing' },
        expectedClasses: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800'] 
      },
      { 
        name: 'Review Column', 
        column: { ...mockColumn, name: 'Review' },
        expectedClasses: ['bg-orange-100', 'border-orange-200', 'text-orange-800'] 
      },
      { 
        name: 'Testing Column', 
        column: { ...mockColumn, name: 'Testing' },
        expectedClasses: ['bg-orange-100', 'border-orange-200', 'text-orange-800'] 
      },
      { 
        name: 'Done Column', 
        column: { ...mockColumn, name: 'Done' },
        expectedClasses: ['bg-green-100', 'border-green-200', 'text-green-800'] 
      },
      { 
        name: 'Complete Column', 
        column: { ...mockColumn, name: 'Complete' },
        expectedClasses: ['bg-green-100', 'border-green-200', 'text-green-800'] 
      },
    ];

    testCases.forEach(({ name, column, expectedClasses }) => {
      it(`applies correct header colors for ${name}`, () => {
        const { container } = renderColumn(column);
        const header = container.querySelector('div[class*="border-t-4"]');
        expect(header).toBeInTheDocument();
        
        expectedClasses.forEach(className => {
          expect(header).toHaveClass(className);
        });
      });
    });
  });

  it('renders tasks in correct order', () => {
    renderColumn();
    const taskElements = screen.getAllByText(/Task/);
    expect(taskElements[0]).toHaveTextContent('First Task');
    expect(taskElements[1]).toHaveTextContent('Second Task');
  });

  it('applies correct minimum width', () => {
    const { container } = renderColumn();
    const columnElement = container.querySelector('[class*="min-w-[280px]"]');
    expect(columnElement).toBeInTheDocument();
  });
});