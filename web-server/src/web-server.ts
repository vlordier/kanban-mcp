import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import path from "path";
import { KanbanDB } from "@kanban-mcp/db";

/**
 * WebServer class that handles the web server functionality
 */
class WebServer {
  private server: FastifyInstance;
  private kanbanDB: KanbanDB;

  /**
   * Creates a new WebServer instance
   * @param kanbanDB The KanbanDB instance to use
   */
  constructor(kanbanDB: KanbanDB) {
    this.kanbanDB = kanbanDB;

    // Create Fastify instance
    this.server = Fastify({
      logger: true
    });

    // Register CORS plugin with localhost-only configuration
    this.server.register(fastifyCors, {
      origin: ["http://localhost:8221", "http://127.0.0.1:8221"],
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      credentials: true,
    });

    this.setupRoutes();
    this.setupStaticFiles();
  }

  /**
   * Sets up the API routes
   */
  private setupRoutes(): void {
    // API Routes
    // Get all boards
    this.server.get(
      "/api/boards",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const boards = this.kanbanDB.getAllBoards();
          return reply.code(200).send(boards);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Get a specific board with its columns and tasks
    this.server.get(
      "/api/boards/:boardId",
      async (
        request: FastifyRequest<{ Params: { boardId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { boardId } = request.params;
          const boardData = this.kanbanDB.getBoardWithColumnsAndTasks(boardId);

          if (!boardData) {
            return reply.code(404).send({ error: "Board not found" });
          }

          return reply.code(200).send(boardData);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );

    // Get the task full info and content
    this.server.get(
      "/api/tasks/:taskId",
      async (
        request: FastifyRequest<{ Params: { taskId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { taskId } = request.params;
          const task = this.kanbanDB.getTaskById(taskId);

          if (!task) {
            return reply.code(404).send({ error: "Task not found" });
          }

          return reply.code(200).send(task);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send({ error: "Internal Server Error" });
        }
      }
    );
  }

  /**
   * Sets up the static file serving
   */
  private setupStaticFiles(): void {
    // Serve static files for the React app
    this.server.register(fastifyStatic, {
      root: path.join(__dirname, "../../../web-ui/dist"),
      prefix: "/"
    });

    

  }

  /**
   * Starts the web server
   */
  async start(): Promise<void> {
    try {
      await this.server.listen({ port: 8221, host: "localhost" });
      console.log(`Server is running at http://localhost:8221`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  /**
   * Closes the web server
   */
  async close(): Promise<void> {
    await this.server.close();
  }

  /**
   * Gets the server instance
   */
  getServer(): FastifyInstance {
    return this.server;
  }
}

// Create a function to start the web server
const start = async (kanbanDB: KanbanDB): Promise<WebServer> => {
  const webServer = new WebServer(kanbanDB);
  await webServer.start();
  return webServer;
};

// Export the WebServer class and start function
export { WebServer, start };
