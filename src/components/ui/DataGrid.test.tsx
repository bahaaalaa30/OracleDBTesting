import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataGrid } from './DataGrid';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'count', label: 'Count', align: 'right' as const },
];

const rows = [
  { id: 'a', name: 'Patients', count: 12 },
  { id: 'b', name: 'Visits', count: 25 },
];

afterEach(() => cleanup());

describe('DataGrid', () => {
  it('renders column headers and row values', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} />);
    const grid = within(container);

    expect(grid.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(grid.getByRole('columnheader', { name: 'Count' })).toBeTruthy();
    expect(grid.getByText('Patients')).toBeTruthy();
    expect(grid.getByText('25')).toBeTruthy();
  });

  it('renders the configured empty message when there are no rows', () => {
    const { container } = render(
      <DataGrid columns={columns} rows={[]} emptyMessage="No database objects found" />,
    );

    expect(within(container).getByText('No database objects found')).toBeTruthy();
  });

  it('shows the loading state instead of stale rows', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} loading />);
    const grid = within(container);

    expect(grid.getByText('Loading…')).toBeTruthy();
    expect(grid.queryByText('Patients')).toBeNull();
  });

  it('uses a custom cell renderer and passes the complete row', () => {
    const renderCell = vi.fn((value: unknown, row: Record<string, unknown>) =>
      `${String(value)} from ${String(row.name)}`,
    );

    const { container } = render(
      <DataGrid
        columns={[{ key: 'count', label: 'Count', render: renderCell }]}
        rows={[{ name: 'Patients', count: 12 }]}
      />,
    );

    expect(within(container).getByText('12 from Patients')).toBeTruthy();
    expect(renderCell).toHaveBeenCalledWith(12, { name: 'Patients', count: 12 });
  });

  it('uses the provided row key callback', () => {
    const rowKey = vi.fn((row: Record<string, unknown>) => String(row.id));

    render(<DataGrid columns={columns} rows={rows} rowKey={rowKey} />);

    expect(rowKey).toHaveBeenNthCalledWith(1, rows[0], 0);
    expect(rowKey).toHaveBeenNthCalledWith(2, rows[1], 1);
  });

  it('calls the sort callback with the selected column', () => {
    const onSort = vi.fn();
    const { container } = render(
      <DataGrid columns={columns} rows={rows} onSort={onSort} />,
    );

    fireEvent.click(within(container).getByRole('columnheader', { name: 'Name' }));

    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('shows pagination range and moves to the next page', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <DataGrid
        columns={columns}
        rows={rows}
        page={1}
        pageSize={10}
        totalRows={45}
        onPageChange={onPageChange}
      />,
    );
    const grid = within(container);

    expect(grid.getByText('1–10 of 45')).toBeTruthy();
    expect(grid.getByText('1 / 5')).toBeTruthy();

    const buttons = grid.getAllByRole('button');
    expect(buttons[0].hasAttribute('disabled')).toBe(true);
    fireEvent.click(buttons[1]);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next-page navigation on the last page', () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        rows={rows}
        page={5}
        pageSize={10}
        totalRows={45}
        onPageChange={vi.fn()}
      />,
    );
    const grid = within(container);

    const buttons = grid.getAllByRole('button');
    expect(buttons[1].hasAttribute('disabled')).toBe(true);
    expect(grid.getByText('41–45 of 45')).toBeTruthy();
  });
});
