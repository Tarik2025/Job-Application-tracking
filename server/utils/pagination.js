export function paginate(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildSort(query, allowedFields, defaultField = 'created_at', defaultDir = 'DESC') {
  const field = allowedFields.includes(query.sort_by) ? query.sort_by : defaultField;
  const dir = query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : defaultDir;
  return `${field} ${dir}`;
}

export function paginatedResponse(rows, total, page, limit) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    }
  };
}
