import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export function lower(email: AnyPgColumn): SQL {
    return sql`lower(${email})`;
}

export function upper(email: AnyPgColumn): SQL {
    return sql`upper(${email})`;
}
