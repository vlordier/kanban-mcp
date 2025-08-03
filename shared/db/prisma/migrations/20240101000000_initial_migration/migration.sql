-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "landing_column_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "columns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wip_limit" INTEGER NOT NULL,
    "is_done_column" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "column_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "update_reason" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "columns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "database_info" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schema_version" TEXT NOT NULL,
    "last_migration" DATETIME,
    "health_check" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "columns_board_id_idx" ON "columns"("board_id");

-- CreateIndex
CREATE INDEX "columns_position_idx" ON "columns"("position");

-- CreateIndex
CREATE INDEX "tasks_column_id_idx" ON "tasks"("column_id");

-- CreateIndex
CREATE INDEX "tasks_position_idx" ON "tasks"("position");

-- Insert initial database info
INSERT INTO "database_info" ("id", "schema_version") VALUES ("singleton", "2.0.0");