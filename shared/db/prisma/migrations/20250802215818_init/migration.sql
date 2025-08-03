-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "landing_column_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "boards_landing_column_id_fkey" FOREIGN KEY ("landing_column_id") REFERENCES "columns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_boards" ("created_at", "goal", "id", "landing_column_id", "name", "updated_at") SELECT "created_at", "goal", "id", "landing_column_id", "name", "updated_at" FROM "boards";
DROP TABLE "boards";
ALTER TABLE "new_boards" RENAME TO "boards";
CREATE TABLE "new_database_info" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "schema_version" TEXT NOT NULL,
    "last_migration" DATETIME,
    "health_check" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_database_info" ("health_check", "id", "last_migration", "schema_version") SELECT "health_check", "id", "last_migration", "schema_version" FROM "database_info";
DROP TABLE "database_info";
ALTER TABLE "new_database_info" RENAME TO "database_info";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
