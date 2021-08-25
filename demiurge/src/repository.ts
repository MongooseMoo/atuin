import * as fs from "fs/promises";
import git from "isomorphic-git";
import node from "isomorphic-git/http/node";

export class Repository {
  constructor(public path: string) {}

  clone(url: string) {
    return git.clone({
      fs,
      http: node,
      dir: this.path,
      url: url,
      singleBranch: true,
    });
  }

  commit(authorName: string, authorEmail: string, message: string) {
    git.commit({
      fs,
      dir: this.path,
      message,
      author: {
        name: authorName,
        email: authorEmail,
      },
    });
  }

  initialize() {
    return git.init({ fs, dir: this.path });
  }

  push() {
    return git.push({
      fs,
      http: node,
      dir: this.path,
      ref: "refs/heads/master",
      remote: "origin",
    });
  }

  add(path: string) {
    git.add({
      fs,
      dir: this.path,
      filepath: path,
    });
  }

  remove(path: string) {
    git.remove({
      fs,
      dir: this.path,
      filepath: path,
    });
  }

  checkout(ref: string) {
    git.checkout({
      fs,
      dir: this.path,
      ref: ref,
    });
  }
}
