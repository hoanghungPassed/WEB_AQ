import mongoose from "mongoose";

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Paginate a Mongoose query object using standard skip, limit, and sort pipeline.
 *
 * @param query The Mongoose query object (e.g. `Task.find({...})`)
 * @param page Current page number (1-based)
 * @param limit Number of records per page
 * @param sortBy Field name to sort by
 * @param sortOrder Sorting order direction ('asc' or 'desc')
 */
export async function paginate<T>(
  query: any,
  page: number = 1,
  limit: number = 10,
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc"
): Promise<PaginatedResponse<T>> {
  const skip = (page - 1) * limit;

  // Use Promise.all to fetch the paginated page slice and the count in parallel
  const [data, total] = await Promise.all([
    query
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .lean(),
    query.model.countDocuments(query.getFilter())
  ]);

  return {
    success: true,
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    }
  };
}
