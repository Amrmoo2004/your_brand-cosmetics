
export class BadRequestException extends Error {
    public statusCode: number;
    public details: any;

    constructor(message: string, details?: any) {
        super(message);
        
        this.name = "BadRequestException"; 
        
        this.statusCode = 400; 
        
        this.details = details; 

        Object.setPrototypeOf(this, BadRequestException.prototype);
        
        Error.captureStackTrace(this, this.constructor);
    }
}