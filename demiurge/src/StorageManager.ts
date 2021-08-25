import { existsSync } from "fs";
import { lock } from "proper-lockfile";
import { Repository } from "./repository";
import { loadWorld, serializeWorld } from "./serialize";
import { World } from "./world";

class WorldStorageManager {
  public world?: World;
  private unlock?: () => void;
  private repository?: Repository;

  private readonly lockfileName = "/world.lock";

  constructor(public basePath: string) {}

  async open() {
    this.unlock = await lock(this.basePath + this.lockfileName, {
      retries: 10,
    });
    this.repository = new Repository(this.basePath);
    this.world = await loadWorld(this.basePath);
  }

  async snapshotWorld(message: string) {
    if (!this.world) {
      throw new Error("No world to snapshot");
    }
    await serializeWorld(this.world, this.basePath);
    await this.repository?.add(this.basePath);
    await this.repository?.commit(
      "Storage Manager",
      "noone@example.com",
      message
    );
  }

  async close() {
    this.unlock && (await this.unlock());
  }

  public static async createEmptyWorldRepository(
    path: string
  ): Promise<WorldStorageManager> {
    if (existsSync(path)) {
      throw new Error("Repository already exists");
    }
    const manager = new WorldStorageManager(path);
    manager.world = new World("unnamed");
    await manager.repository?.initialize();
    return manager;
  }
}
