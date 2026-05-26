// ============================================
// PAGINATION UTILITY
// ============================================

const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(total / limit),
      total_records: total,
      limit,
      has_more: page < Math.ceil(total / limit)
    }
  };
};

const addPaginationToQuery = (baseQuery, params) => {
  return `${baseQuery} LIMIT ? OFFSET ?`;
};

const getPaginationValues = ({ offset, limit }) => {
  return [limit, offset];
};

module.exports = {
  getPaginationParams,
  buildPaginationResponse,
  addPaginationToQuery,
  getPaginationValues
};
