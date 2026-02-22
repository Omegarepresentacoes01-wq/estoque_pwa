/**
 * Sistema de autenticação próprio com e-mail + senha (bcrypt + JWT)
 * Independente do OAuth da Manus
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { COOKIE_NAME } from "@shared/const";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret-change-me";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export type AuthPayload = {
  sub: string;         // colaborador id como string
  email: string;
  nome: string;
  role: "admin" | "colaborador";
  iat?: number;
  exp?: number;
};

// ============ SENHA ============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============ JWT ============

export async function createToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

// ============ COOKIE ============

export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = new Map(
    cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k?.trim() ?? "", decodeURIComponent(v.join("="))];
    })
  );
  return cookies.get(COOKIE_NAME) ?? null;
}

export async function authenticateOwnRequest(req: Request): Promise<AuthPayload | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
