// 📍 src/types/shims.d.ts
declare module "parquetjs-lite" {
  export class ParquetSchema { constructor(schema: any); }
  export class ParquetWriter {
    static openFile(schema: any, path: string, opts?: any): Promise<ParquetWriter>;
    appendRow(row: any): Promise<void>;
    close(): Promise<void>;
  }
  export class ParquetReader {
    static openFile(path: string, opts?: any): Promise<ParquetReader>;
    getCursor(): { next(): Promise<any> };
    close(): Promise<void>;
  }
}

// If your setup still can’t see luxon’s types, uncomment the next line:
// declare module "luxon";
