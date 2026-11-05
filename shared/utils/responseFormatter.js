class ResponseFormatter {
    static success(data, message = 'Success', statusCode = 200) {
      return {
        success: true,
        statusCode,
        message,
        data,
        timestamp: new Date().toISOString()
      };
    }
  
    static error(message, statusCode = 400, details = null) {
      return {
        success: false,
        statusCode,
        message,
        error: details,
        timestamp: new Date().toISOString()
      };
    }
  
    static paginated(data, pagination, message = 'Success') {
      return {
        success: true,
        message,
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.limit)
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  export default ResponseFormatter;