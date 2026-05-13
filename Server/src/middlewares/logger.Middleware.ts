import { Request, Response, NextFunction } from "express";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString(); //2025-01-01T12:30:45.123Z
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
};

