import { customType } from "drizzle-orm/pg-core";

/** Postgres full-text search vector. Always a generated column; never written by the app. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
