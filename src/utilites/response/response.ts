




// مسار الملف: src/utils/response/error.response.ts

export class BadRequestException extends Error {
    public statusCode: number;
    public details: any;

    constructor(message: string, details?: any) {
        // بنبعت الرسالة للكلاس الأساسي (Error)
        super(message);
        
        // بنحدد اسم الخطأ عشان يظهر بوضوح في الـ Console
        this.name = "BadRequestException"; 
        
        // كود الحالة دايماً 400 لأن ده Bad Request
        this.statusCode = 400; 
        
        // ده الكائن اللي هيستقبل الـ { validationErrors } اللي بعتناها من الميدلوير
        this.details = details; 

        // السطر ده مهم جداً في TypeScript عشان يحافظ على الـ Prototype Chain 
        // ويخلي الـ instanceof تشتغل بشكل سليم مع كلاس Error
        Object.setPrototypeOf(this, BadRequestException.prototype);
        
        // عشان يحدد مكان الخطأ في الكود (StackTrace)
        Error.captureStackTrace(this, this.constructor);
    }
}