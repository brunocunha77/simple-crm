const LIMITED_PLAN_ALLOWED_PATHS = [
  "/conversations",
  "/crm",
  "/workflows",
  "/conexoes",
  "/settings",
];

export const LIMITED_PLAN_FALLBACK_PATH = "/conversations";

const STARTER_PLAN_ALLOWED_PATHS = [
  "/dashboard",
  "/relatorios",
  "/relatorios-gerenciais",
];

export const STARTER_PLAN_FALLBACK_PATH = "/dashboard";

export const isLimitedPlan = (trial?: boolean, planoPlus?: boolean) =>
  trial === true || planoPlus === true;

export const isLimitedPlanAllowedPath = (pathname: string) =>
  LIMITED_PLAN_ALLOWED_PATHS.some(
    (allowedPath) =>
      pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
  );

export const isStarterPlanAllowedPath = (pathname: string) =>
  STARTER_PLAN_ALLOWED_PATHS.some(
    (allowedPath) =>
      pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
  );
