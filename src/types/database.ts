export interface ConnectionConfig {
  host: string;
  user: string;
  password: string;
  port: string | number;
}

export interface DatabaseConnection {
  server: string;
  username: string;
  password: string;
  port: string | number;
}

export interface ConnectionResponse {
  success: boolean;
  connectionId: string;
  databases: string[];
  message: string;
  timestamp: string;
}

export interface TableField {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  references?: {
    table: string;
    field: string;
  };
}

export interface TableStructure {
  name: string;
  fields: TableField[];
}

export interface TableRelation {
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  isFK?: boolean; // 添加这个可选属性
}
