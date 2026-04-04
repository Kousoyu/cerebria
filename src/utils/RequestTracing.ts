/**
 * RequestTracing - Request Chain Tracing
 */

class RequestTracing {
  [key: string]: any;
  static generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createSpan(traceId: string, operationName: string) {
    return {
      traceId,
      spanId: `span_${Date.now()}`,
      operationName,
      startTime: Date.now(),
      logs: []
    };
  }

  static recordLog(span: any, message: string) {
    span.logs.push({
      timestamp: Date.now(),
      message
    });
  }

  static finishSpan(span: any) {
    span.duration = Date.now() - span.startTime;
    return span;
  }
}

export default RequestTracing;
