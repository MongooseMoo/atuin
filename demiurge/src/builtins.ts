import { Actions } from "./object";
import { ExecutionContext } from "./program";
import { TaskKilled, TaskStatus, TID } from "./task";
import { World } from "./world";

export function worldBuiltins(world: World, context: ExecutionContext) {
  return {
    print: console.log,

    toObj: function (str: string) {
      str = String(str);
      const start = str.startsWith("o") ? 1 : 0;
      const oid = parseInt(str.slice(start));
      const obj = world.objects.get(oid);
      if (!obj) throw new Error("No such object " + oid);
      return obj;
    },

    taskId: function () {
      return context.task.id;
    },

    killTask: function (taskId?: TID) {
      if (!taskId) {
        throw new TaskKilled("Task terminated");
        taskId = context.task.id;
      }
      const toKil = world.tasks.get(taskId);
      if (!toKil) throw new Error("No such task " + taskId);
      const taskOwner = context.task.owner;
      const Permission = world.perms
        .can(taskOwner.credentials)
        .execute(Actions.killTask);
      toKil.status = TaskStatus.killed;
    },
  };
}
