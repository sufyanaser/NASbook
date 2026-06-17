declare module "better-sqlite3" {
  interface Statement {
    run(...params: readonly unknown[]): { lastInsertRowid: number | bigint };
    get(...params: readonly unknown[]): unknown;
    all(...params: readonly unknown[]): unknown[];
  }

  interface DatabaseInstance {
    prepare(source: string): Statement;
    pragma(source: string): unknown;
    transaction<T extends (...args: readonly unknown[]) => unknown>(fn: T): T;
    close(): void;
  }

  interface DatabaseConstructor {
    new (
      filename: string,
      options?: { readonly?: boolean; readonly fileMustExist?: boolean },
    ): DatabaseInstance;
  }

  const Database: DatabaseConstructor;

  export = Database;
}
