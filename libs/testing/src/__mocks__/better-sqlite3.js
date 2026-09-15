'use strict';

/**
 * better-sqlite3 compatibility shim using Node.js built-in `node:sqlite`.
 * Available in Node 22+ (experimental flag removed in Node 24).
 *
 * This lets TypeORM's better-sqlite3 driver work without native binaries.
 *
 * On Node < 22.5 `node:sqlite` does not exist, so we fall back to the real
 * native better-sqlite3 package. The fallback is required by absolute path
 * because jest's `moduleNameMapper` rewrites the bare specifier
 * `better-sqlite3` back to this file, which would otherwise recurse.
 *
 * Without this fallback the shim throws ERR_UNKNOWN_BUILTIN_MODULE at import
 * time, and TypeORM's PlatformTools.load() swallows that error and surfaces
 * the misleading "DriverPackageNotInstalledError: SQLite package has not been
 * found installed" instead.
 */

const path = require('path');

/** Absolute path to the real native better-sqlite3, bypassing moduleNameMapper. */
function resolveNativeBetterSqlite3() {
  const candidates = [
    path.resolve(__dirname, '../../../../node_modules/better-sqlite3'),
    path.resolve(__dirname, '../../node_modules/better-sqlite3'),
    path.resolve(__dirname, '../../../../apps/auth/node_modules/better-sqlite3'),
  ];
  for (const candidate of candidates) {
    try {
      const native = require(candidate);
      return typeof native === 'function' ? native : native.default;
    } catch (_) {
      // try the next candidate
    }
  }
  return undefined;
}

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  const native = resolveNativeBetterSqlite3();
  if (native) {
    module.exports = native;
    module.exports.default = native;
    return;
  }
  throw new Error(
    'better-sqlite3 test shim requires either Node.js >= 22.5 (node:sqlite) ' +
      'or the native better-sqlite3 package to be installed and built ' +
      '(run "pnpm install" with better-sqlite3 in pnpm.onlyBuiltDependencies). ' +
      'Underlying error: ' + err.message
  );
}

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
    this._stmt = db._db.prepare(sql);
    // TypeORM checks stmt.reader: true = SELECT (returns rows), false = DML/DDL
    this.reader = /^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(sql.trim());
  }

  // Convert null-prototype objects to plain objects
  _normalise(row) {
    if (row === undefined || row === null) return row;
    return Object.assign({}, row);
  }

  run(...args) {
    const params = args.flat();
    try {
      const result = this._stmt.run(...params);
      return {
        changes: result.changes ?? 0,
        lastInsertRowid: result.lastInsertRowid ?? 0,
      };
    } catch (e) {
      throw e;
    }
  }

  get(...args) {
    const params = args.flat();
    const rows = this._stmt.all(...params);
    return rows.length > 0 ? this._normalise(rows[0]) : undefined;
  }

  all(...args) {
    const params = args.flat();
    return this._stmt.all(...params).map(r => this._normalise(r));
  }

  *iterate(...args) {
    for (const row of this.all(...args)) yield row;
  }

  bind(...args) { return this; }
  pluck(toggle) { return this; }
  expand(toggle) { return this; }
  raw(toggle) { return this; }
  columns() {
    try {
      const cols = this._stmt.columns ? this._stmt.columns() : [];
      return cols.map(c => this._normalise(c));
    } catch { return []; }
  }
}


class Database {
  constructor(path, options = {}) {
    this._path = path || ':memory:';
    this._options = options;
    this._open = true;
    this._inTx = false;
    this._db = new DatabaseSync(this._path === ':memory:' ? ':memory:' : this._path, {
      open: true,
    });
    // Enable WAL for better concurrency
    if (this._path !== ':memory:') {
      try { this._db.exec('PRAGMA journal_mode=WAL;'); } catch (_) {}
    }
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this._db.exec(sql);
    return this;
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self._db.exec('BEGIN');
      self._inTx = true;
      try {
        const result = fn.apply(this, args);
        self._db.exec('COMMIT');
        self._inTx = false;
        return result;
      } catch (err) {
        try { self._db.exec('ROLLBACK'); } catch (_) {}
        self._inTx = false;
        throw err;
      }
    };
  }

  pragma(source, options = {}) {
    try {
      const rows = this._db.prepare(`PRAGMA ${source}`).all();
      if (options && options.simple) return rows.length > 0 ? Object.values(rows[0])[0] : undefined;
      return rows;
    } catch { return []; }
  }

  function(name, fn) { return this; }
  aggregate(name, options) { return this; }
  table(name, options) { return this; }
  loadExtension(path) { return this; }

  backup(destination, options) { return Promise.resolve(); }
  serialize(options) { return Buffer.alloc(0); }

  close() {
    if (this._open) {
      this._db.close();
      this._open = false;
    }
  }

  get open() { return this._open; }
  get inTransaction() { return this._inTx; }
  get name() { return this._path; }
  get memory() { return this._path === ':memory:'; }
  get readonly() { return this._options.readonly || false; }
}

module.exports = Database;
module.exports.default = Database;
