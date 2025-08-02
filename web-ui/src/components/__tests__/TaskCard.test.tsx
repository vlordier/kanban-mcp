import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskCard from '../TaskCard';
import { TaskSummary, ColumnWithTasks } from '../../types';
import { DndContext } from '@dnd-kit/core';

// Mock the drag and drop hooks
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
  };
});

describe('TaskCard', () => {
  const mockTask: TaskSummary = {
    id: 'task-1',
    title: 'Test Task',
    position: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockColumn: ColumnWithTasks = {
    id: 'column-1',
    name: 'To Do',
    position: 1,
    wipLimit: 5,
    isLanding: false,
    tasks: [mockTask],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTaskCard = (task = mockTask, column = mockColumn, isMoving = false) => {
    return render(
      <DndContext>
        <TaskCard task={task} column={column} isMoving={isMoving} />
      </DndContext>
    );
  };

  it('renders task title correctly', () => {
    renderTaskCard();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('displays formatted update date', () => {
    renderTaskCard();
    const expectedDate = new Date('2024-01-01T00:00:00Z').toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('shows stale badge for tasks older than 7 days', () => {
    const staleTask: TaskSummary = {
      ...mockTask,
      updatedAt: '2023-01-01T00:00:00Z', // Very old date
    };
    renderTaskCard(staleTask);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('does not show stale badge for recent tasks', () => {
    const recentTask: TaskSummary = {
      ...mockTask,
      updatedAt: new Date().toISOString(), // Today
    };
    renderTaskCard(recentTask);
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  it('displays column name badge', () => {
    renderTaskCard();
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('shows update reason indicator when task has update reason', () => {
    const taskWithReason: TaskSummary = {
      ...mockTask,
      updateReason: 'Task was updated due to requirements change',
    };
    renderTaskCard(taskWithReason);
    const indicator = screen.getByTitle('Has update reason');
    expect(indicator).toBeInTheDocument();
  });

  it('does not show update reason indicator when task has no update reason', () => {
    renderTaskCard();
    expect(screen.queryByTitle('Has update reason')).not.toBeInTheDocument();
  });

  it('applies correct status color for landing column', () => {
    const landingColumn: ColumnWithTasks = {
      ...mockColumn,
      isLanding: true,
    };
    const { container } = renderTaskCard(mockTask, landingColumn);
    const taskCard = container.querySelector('[class*="border-l-blue-400"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies correct status color for todo column', () => {
    const todoColumn: ColumnWithTasks = {
      ...mockColumn,
      name: 'Todo Tasks',
    };
    const { container } = renderTaskCard(mockTask, todoColumn);
    const taskCard = container.querySelector('[class*="border-l-gray-400"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies correct status color for in-progress column', () => {
    const inProgressColumn: ColumnWithTasks = {
      ...mockColumn,
      name: 'In Progress',
    };
    const { container } = renderTaskCard(mockTask, inProgressColumn);
    const taskCard = container.querySelector('[class*="border-l-yellow-400"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies correct status color for review column', () => {
    const reviewColumn: ColumnWithTasks = {
      ...mockColumn,
      name: 'Code Review',
    };
    const { container } = renderTaskCard(mockTask, reviewColumn);
    const taskCard = container.querySelector('[class*="border-l-orange-400"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies correct status color for done column', () => {
    const doneColumn: ColumnWithTasks = {
      ...mockColumn,
      name: 'Done',
    };
    const { container } = renderTaskCard(mockTask, doneColumn);
    const taskCard = container.querySelector('[class*="border-l-green-400"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies moving styles when isMoving is true', () => {
    const { container } = renderTaskCard(mockTask, mockColumn, true);
    const taskCard = container.querySelector('[class*="ring-2 ring-indigo-500 animate-pulse"]');
    expect(taskCard).toBeInTheDocument();
  });

  it('applies stale indicator border for stale tasks', () => {
    const staleTask: TaskSummary = {
      ...mockTask,
      updatedAt: '2023-01-01T00:00:00Z',
    };
    const { container } = renderTaskCard(staleTask);
    const taskCard = container.querySelector('[class*="border-r-2 border-r-red-300"]');
    expect(taskCard).toBeInTheDocument();
  });

  describe('Status color detection', () => {
    const testCases = [
      { columnName: 'Backlog', expectedClass: 'border-l-gray-400' },
      { columnName: 'Development', expectedClass: 'border-l-yellow-400' },
      { columnName: 'Doing Something', expectedClass: 'border-l-yellow-400' },
      { columnName: 'Testing Phase', expectedClass: 'border-l-orange-400' },
      { columnName: 'Complete Tasks', expectedClass: 'border-l-green-400' },
    ];

    testCases.forEach(({ columnName, expectedClass }) => {
      it(`applies ${expectedClass} for column "${columnName}"`, () => {
        const testColumn: ColumnWithTasks = {
          ...mockColumn,
          name: columnName,
        };
        const { container } = renderTaskCard(mockTask, testColumn);
        const taskCard = container.querySelector(`[class*="${expectedClass}"]`);
        expect(taskCard).toBeInTheDocument();
      });
    });
  });
});