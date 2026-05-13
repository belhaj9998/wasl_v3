import { Response, NextFunction } from "express";
import prisma from "../configs/prisma";
import { AppRequest } from "../types";
import { tokenService } from "../services/token.Service";
import { AppError } from "../utils/AppError";
import { SystemRole } from "../../generated/prisma";

// ========== verifyToken ==========
export const verifyToken = async (
  req: AppRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return next(AppError.unauthorized("No token provided"));
  }

  try {
    const decoded = tokenService.verifyAccessToken(token);

    // Soft-delete check: query user to verify they haven't been deleted
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { deleted_at: true },
    });

    if (!user || user.deleted_at !== null) {
      return next(AppError.unauthorized("Unauthorized"));
    }

    req.user = {
      userId: decoded.userId,
      systemRole: decoded.systemRole,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(AppError.unauthorized("Unauthorized"));
  }
};

// ========== platformGuard ==========
export const platformGuard = (
  req: AppRequest,
  res: Response,
  next: NextFunction,
) => {
  const allowedRoles: SystemRole[] = [
    SystemRole.PLATFORM_ADMIN,
    SystemRole.PLATFORM_OWNER,
  ];

  if (
    !req.user ||
    !req.user.systemRole ||
    !allowedRoles.includes(req.user.systemRole)
  ) {
    return next(AppError.forbidden("Insufficient system role"));
  }

  next();
};

export const resolveStoreContext = async (
  req: AppRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const storeIdHeader = req.headers["x-store-id"];
  if (!storeIdHeader) {
    return res.status(400).json({ error: "Missing x-store-id in headers" });
  }
  const storeId = parseInt(storeIdHeader as string, 10);
  if (isNaN(storeId) || storeId <= 0) {
    return res.status(400).json({ error: "Invalid store ID format" });
  }
  try {
    const membership = await prisma.storeMembership.findUnique({
      where: {
        store_id_user_id: {
          store_id: storeId,
          user_id: req.user.userId,
        },
      },
      include: {
        store: {
          select: {
            status: true,
          },
        },
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Access denied: You are not a member of this store" });
    }

    // 1. فحص حالة المتجر (نسمح بالـ ACTIVE والـ DRAFT)
    if (
      membership.store.status === "SUSPENDED" ||
      membership.store.status === "ARCHIVED"
    ) {
      return res
        .status(403)
        .json({ error: `Store is ${membership.store.status.toLowerCase()}` });
    }

    // 2. فحص حالة العضوية (مهم جداً ألا ننساها)
    if (membership.status !== "ACTIVE") {
      return res.status(403).json({
        error: `Your membership is ${membership.status.toLowerCase()}`,
      });
    }

    req.storeId = storeId;
    req.storeRole = membership.role.slug; // الدور له slug في السكيما
    req.permissions = membership.role.permissions.map((p) => p.permission.code); // الصلاحية لها code في السكيما
    next();
  } catch (error) {
    console.error("Store Context Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AppRequest, res: Response, next: NextFunction) => {
    // 1. التأكد من أن مصفوفة الصلاحيات موجودة أصلاً في الطلب
    if (!req.permissions) {
      return res.status(403).json({
        error:
          "Forbidden: Permissions not loaded. Make sure to use resolveStoreContext middleware first.",
      });
    }

    // 2. التحقق مما إذا كانت الصلاحية المطلوبة موجودة داخل مصفوفة صلاحيات المستخدم
    if (!req.permissions.includes(requiredPermission)) {
      return res
        .status(403)
        .json({ error: `You don't have ${requiredPermission} permission` });
    }

    // 3. إذا كانت موجودة، مرر الطلب للكنترولر بنجاح!
    next();
  };
};
