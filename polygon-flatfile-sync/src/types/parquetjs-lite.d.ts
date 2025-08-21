declare module 'parquetjs-lite' {
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
