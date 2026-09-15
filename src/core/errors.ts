/**
 * 领域无关的错误类型：把「HTTP 状态码 + 可读信息」集中在一处，
 * 引擎、注册表、API 三层共用，API 层统一映射成非 2xx 的 { error } 响应。
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/** 客户端输入不合法（400）。 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/** 引用了不存在的牌组 / 位置方案 / 解读策略 / 历史记录（404）。 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/** 抽卡引擎的前置条件不满足（400）。 */
export class EngineError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'EngineError';
  }
}
