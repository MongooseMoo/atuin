import { promises } from "fs";
import git from "isomorphic-git";
import node from "isomorphic-git/http/node";

export class Repository {
  constructor(public path: string) {}

  clone(url: string) {
    return git.clone({
      fs: promises,
      http: node,
      dir: this.path,
      url: url,
      singleBranch: true,
    });
  }

  commit(authorName: string, authorEmail: string, message: string) {
    git.commit({
      fs: promises,
      dir: this.path,
      message,
      author: {
        name: authorName,
        email: authorEmail,
      },
    });
  }

  initialize() {
    return git.init({ fs: promises, dir: this.path });
  }

  push() {
    return git.push({
      fs: promises,
      http: node,
      dir: this.path,
      ref: "refs/heads/master",
      remote: "origin",
    });
  }

  add(path: string) {
    git.add({
      fs: promises,
      dir: this.path,
      filepath: path,
    });
  }

  remove(path: string) {
    git.remove({
      fs: promises,
      dir: this.path,
      filepath: path,
    });
  }
}
