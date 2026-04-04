/**
 * RequestTracing - Request Chain Tracing
 */

class RequestTracing {
  [key: string]: any;
  static generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createSpan(traceId, operationName) {
    return {
      traceId,
      spanId: `span_${Date.now()}`,
      operationName,
      startTime: Date.now(),
      logs: []
    };
  }

  static recordLog(span, message) {
    span.logs.push({
      timestamp: Date.now(),
      message
    });
  }

  static finishSpan(span) {
    span.duration = Date.now() - span.startTime;
    return span;
  }
}

export default RequestTracing;
