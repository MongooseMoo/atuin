import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { lock } from "proper-lockfile";
import { WorldObject } from "./object";
import { Program } from "./program";
import { Repository } from "./repository";
import { loadWorld, serializeWorld } from "./serialize";
import { Events, World } from "./world";

class WorldStorageManager {
  private _world?: World;
  private repository?: Repository;
  private unlock?: () => void;
  private readonly lockfileName = "/world.lock";

  constructor(public basePath: string) {}

  async open() {
    if (!existsSync(this.basePath)) {
      throw new Error("World" + this.basePath + " does not exist");
    }
    await this.lock();
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
      "noone@example.com", // Need dirty object set for authors
      message
    );
  }

  async close() {
    this.unlock && (await this.unlock());
  }

  get world(): World {
    if (!this._world) {
      throw new Error("No world");
    }
    return this._world;
  }

  set world(world: World) {
    this._world = world;
    world.on(
      Events.objectCreated,
      async (object: WorldObject) =>
        await this.snapshotWorld(`Object ${object?.oid} created`)
    );

    world.on(
      Events.objectDestroyed,
      async (object: WorldObject) =>
        await this.snapshotWorld(`Object ${object?.oid} deleted`)
    );

    world.on(
      Events.programAdded,
      async (program: Program) =>
        await this.snapshotWorld(`Program ${program.name} added`)
    );

    world.on(
      Events.programDeleted,
      async (program: Program) =>
        await this.snapshotWorld(`Program ${program.name} removed`)
    );
  }

  public static async createEmptyWorldRepository(
    path: string
  ): Promise<WorldStorageManager> {
    if (existsSync(path)) {
      throw new Error("Repository already exists");
    }
    const manager = new WorldStorageManager(path);
    await mkdir(path, { recursive: true });
    manager.world = new World("unnamed");
    await manager.lock;
    await manager.repository?.initialize();
    return manager;
  }

  async resetToSnapshot(hash: string) {
    this.world.reset();
    await this.repository?.checkout(hash);
    await loadWorld(this.basePath, this.world);
  }

  private async lock() {
    this.unlock = await lock(this.basePath + this.lockfileName, {
      retries: 5,
    });
  }
}
